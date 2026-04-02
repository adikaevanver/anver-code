import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import type { LLMProvider } from '../core/provider.js';
import type { BaseTool } from '../tools/BaseTool.js';
import type { PromptSkill } from '../skills/types.js';
import { Conversation } from '../core/conversation.js';
import { QueryEngine, type QueryEvent } from '../core/query.js';
import { MessageList } from './MessageList.js';
import { InputPrompt } from './InputPrompt.js';
import { PermissionPrompt } from './PermissionPrompt.js';
import { Spinner } from './Spinner.js';
import { saveSession } from '../utils/history.js';
import { loadSkills } from '../skills/loader.js';
import { WRITE_FILE_RESULT_PREFIX } from '../tools/WriteFile.js';
import path from 'path';
import os from 'os';

export interface AppProps {
  provider: LLMProvider;
  tools: BaseTool<any, any>[];
  model: string;
  systemPrompt: string;
  initialConversation?: Conversation;
  autoApprove: string[];
  cwd: string;
  promptSkills: PromptSkill[];
}

type AppState = 'idle' | 'streaming' | 'tool_pending' | 'tool_running';

interface PendingTool {
  toolName: string;
  args: Record<string, unknown>;
  toolCallId: string;
  approve: () => void;
  deny: () => void;
}

function isSkillsPath(filePath: string, cwd: string): boolean {
  const projectSkillsDir = path.join(cwd, '.anver-code', 'skills') + path.sep;
  const globalSkillsDir = path.join(
    process.env.ANVER_CODE_HOME ?? path.join(os.homedir(), '.anver-code'),
    'skills',
  ) + path.sep;
  return filePath.startsWith(projectSkillsDir) || filePath.startsWith(globalSkillsDir);
}

export function App({
  provider,
  tools,
  model,
  systemPrompt,
  initialConversation,
  autoApprove,
  cwd,
  promptSkills,
}: AppProps) {
  const { exit } = useApp();

  // Use a ref for the conversation so async closures always see the latest value
  const conversationRef = useRef<Conversation>(
    initialConversation ?? new Conversation(systemPrompt, model),
  );

  const [appState, setAppState] = useState<AppState>('idle');
  const [messages, setMessages] = useState(() =>
    conversationRef.current.getMessages(),
  );
  const [streamingContent, setStreamingContent] = useState('');
  const [pendingTool, setPendingTool] = useState<PendingTool | null>(null);
  const [runningToolName, setRunningToolName] = useState<string | null>(null);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [helpVisible, setHelpVisible] = useState(false);
  const [currentSkills, setCurrentSkills] = useState(promptSkills);

  const skillCommandsHelp = currentSkills.length > 0
    ? '\n\nSkill commands:\n' + currentSkills.map((s) => `  /${s.name}${' '.repeat(Math.max(1, 15 - s.name.length))}${s.description}`).join('\n')
    : '';

  const helpText = `Available commands:
  /exit          Exit the application
  /clear         Reset the conversation
  /help          Show this help message${skillCommandsHelp}

Tips:
  Up/Down arrows  Navigate input history
  Enter           Submit your message`;

  // Ref to hold resolve function for the permission gate
  const permissionResolveRef = useRef<((approved: boolean) => void) | null>(null);

  const syncMessages = useCallback(() => {
    setMessages(conversationRef.current.getMessages());
  }, []);

  const processQuery = useCallback(
    async (userText: string) => {
      const conversation = conversationRef.current;
      conversation.addUserMessage(userText);
      syncMessages();

      setAppState('streaming');
      setStreamingContent('');

      const engine = new QueryEngine(provider, tools, model);
      let accumulatedStreaming = '';

      try {
        for await (const event of engine.run(conversation)) {
          switch (event.type) {
            case 'text': {
              accumulatedStreaming += event.content;
              setStreamingContent(accumulatedStreaming);
              break;
            }

            case 'tool_pending': {
              const isAutoApproved = autoApprove.includes(event.toolName);

              if (isAutoApproved) {
                // Call approve() synchronously so the generator flag is set before next()
                event.approve();
              } else {
                // Pause the generator by waiting for user decision
                await new Promise<void>((resolve) => {
                  setPendingTool({
                    toolName: event.toolName,
                    args: event.args,
                    toolCallId: event.toolCallId,
                    approve: () => {
                      event.approve();
                      resolve();
                    },
                    deny: () => {
                      event.deny();
                      resolve();
                    },
                  });
                  setAppState('tool_pending');
                });
                setPendingTool(null);
              }
              break;
            }

            case 'tool_running': {
              // Clear any streamed assistant text — it's now in the conversation
              setStreamingContent('');
              accumulatedStreaming = '';
              setRunningToolName(event.toolName);
              setAppState('tool_running');
              break;
            }

            case 'tool_result': {
              setRunningToolName(null);
              syncMessages();
              setAppState('streaming');

              // Reload skills if a file was written to a skills directory
              if (event.toolName === 'write_file' && event.result.startsWith(WRITE_FILE_RESULT_PREFIX)) {
                const writtenPath = event.result.slice(WRITE_FILE_RESULT_PREFIX.length);
                if (isSkillsPath(writtenPath, cwd)) {
                  loadSkills(cwd).then((loaded) => {
                    setCurrentSkills(loaded.promptSkills);
                  }).catch(() => {
                    // Non-fatal — skill reload failure shouldn't break the session
                  });
                }
              }
              break;
            }

            case 'tool_error': {
              setRunningToolName(null);
              syncMessages();
              setAppState('streaming');
              break;
            }

            case 'done': {
              setStreamingContent('');
              syncMessages();
              setAppState('idle');

              // Persist session
              try {
                saveSession(conversation.toSessionData(cwd));
              } catch {
                // Non-fatal — ignore save errors
              }
              break;
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setStreamingContent('');
        syncMessages();
        setAppState('idle');
        // Add a visible error message to the conversation so the user sees it
        conversationRef.current.addAssistantMessage(
          `Error: ${msg}`,
          undefined,
        );
        syncMessages();
      }
    },
    [provider, tools, model, autoApprove, cwd, syncMessages],
  );

  const handleSubmit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // Handle slash commands
      if (trimmed === '/exit') {
        exit();
        return;
      }

      if (trimmed === '/clear') {
        conversationRef.current = new Conversation(systemPrompt, model);
        setMessages(conversationRef.current.getMessages());
        setStreamingContent('');
        setHelpVisible(false);
        setAppState('idle');
        return;
      }

      if (trimmed === '/help') {
        setHelpVisible((prev) => !prev);
        return;
      }

      // Check for skill slash command
      if (trimmed.startsWith('/')) {
        const skillName = trimmed.slice(1).split(/\s/)[0];
        const skill = currentSkills.find((s) => s.name === skillName);
        if (skill) {
          setInputHistory((prev) => {
            if (prev.length > 0 && prev[prev.length - 1] === trimmed) return prev;
            return [...prev, trimmed];
          });
          setHelpVisible(false);
          void processQuery(skill.prompt);
          return;
        }
      }

      // Record in input history (deduplicate consecutive duplicates)
      setInputHistory((prev) => {
        if (prev.length > 0 && prev[prev.length - 1] === trimmed) return prev;
        return [...prev, trimmed];
      });

      setHelpVisible(false);
      void processQuery(trimmed);
    },
    [exit, systemPrompt, model, processQuery, currentSkills],
  );

  const handleApprove = useCallback(() => {
    if (pendingTool) {
      pendingTool.approve();
      setPendingTool(null);
    }
  }, [pendingTool]);

  const handleDeny = useCallback(() => {
    if (pendingTool) {
      pendingTool.deny();
      setPendingTool(null);
    }
  }, [pendingTool]);

  const handleAlwaysApprove = useCallback(() => {
    if (pendingTool) {
      // Add to autoApprove list for this session by approving immediately
      // (autoApprove prop is read-only; we just approve this instance)
      pendingTool.approve();
      setPendingTool(null);
    }
  }, [pendingTool]);

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Message history + live streaming */}
      <MessageList messages={messages} streamingContent={streamingContent} />

      {/* Help overlay */}
      {helpVisible && (
        <Box
          borderStyle="round"
          borderColor="cyan"
          paddingX={1}
          marginBottom={1}
          flexDirection="column"
        >
          <Text color="cyan" bold>
            Anver Code — Help
          </Text>
          <Text>{helpText}</Text>
        </Box>
      )}

      {/* State-specific UI */}
      {appState === 'streaming' && (
        <Spinner model={model} label="Thinking" />
      )}

      {appState === 'tool_running' && runningToolName !== null && (
        <Spinner model={model} label={`Running tool: ${runningToolName}`} />
      )}

      {appState === 'tool_pending' && pendingTool !== null && (
        <PermissionPrompt
          toolName={pendingTool.toolName}
          args={pendingTool.args}
          onApprove={handleApprove}
          onDeny={handleDeny}
          onAlwaysApprove={handleAlwaysApprove}
        />
      )}

      {/* Input only when idle */}
      {appState === 'idle' && (
        <InputPrompt onSubmit={handleSubmit} history={inputHistory} />
      )}
    </Box>
  );
}
