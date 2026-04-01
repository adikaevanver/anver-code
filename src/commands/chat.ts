import React from 'react';
import { render } from 'ink';
import { loadConfig } from '../utils/config.js';
import { OpenRouterProvider } from '../core/provider.js';
import { getTools } from '../tools/index.js';
import { buildSystemPrompt } from '../utils/systemPrompt.js';
import { getLastSession, loadSession } from '../utils/history.js';
import { Conversation } from '../core/conversation.js';
import { App } from '../ui/App.js';

export interface LaunchOptions {
  model?: string;
  resume?: boolean;
  session?: string;
}

export function launchChat(options: LaunchOptions, initialPrompt?: string): void {
  const config = loadConfig();

  const apiKey = config.apiKey ?? process.env.OPENROUTER_API_KEY ?? process.env.ANVER_API_KEY ?? '';
  if (!apiKey) {
    console.error('Error: No API key found. Set apiKey via `anver config set apiKey <key>` or the OPENROUTER_API_KEY environment variable.');
    process.exit(1);
  }

  const model = options.model ?? config.model;
  const autoApprove = config.autoApprove;
  const cwd = process.cwd();

  const provider = new OpenRouterProvider(apiKey);
  const tools = getTools();
  const systemPrompt = buildSystemPrompt(cwd);

  let initialConversation: Conversation | undefined;

  if (options.session) {
    try {
      const sessionData = loadSession(options.session);
      initialConversation = Conversation.fromSessionData(sessionData);
    } catch (err) {
      console.error(`Error loading session from ${options.session}:`, err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  } else if (options.resume) {
    const lastSession = getLastSession();
    if (lastSession) {
      initialConversation = Conversation.fromSessionData(lastSession);
    } else {
      console.log('No previous session found. Starting a fresh conversation.');
    }
  }

  const { waitUntilExit } = render(
    React.createElement(App, {
      provider,
      tools,
      model,
      systemPrompt,
      initialConversation,
      autoApprove,
      cwd,
    }),
  );

  // If an initial prompt was provided, we inject it after mount via a small
  // wrapper approach — but App handles user input via its InputPrompt.
  // For now, surface the prompt as a startup message via environment so the
  // user can see what they typed; full stdin injection is left for a future task.
  if (initialPrompt) {
    process.env.ANVER_INITIAL_PROMPT = initialPrompt;
  }

  waitUntilExit().then(() => {
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
}
