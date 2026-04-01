# Anver Code — Design Spec

**Date:** 2026-04-01
**Status:** Draft
**Author:** Anver Adikaev + Claude

## Overview

Anver Code is a Claude Code-inspired coding assistant CLI powered by free LLMs via OpenRouter. It provides an interactive terminal experience with a full toolset for reading, writing, searching, and managing code — driven by an agentic loop where the LLM decides when and how to use tools.

## Goals

- Provide a Claude Code-like experience using free models (Gemini, Llama, DeepSeek via OpenRouter)
- Full coding toolset from day one (file ops, search, shell, git, web)
- Rich terminal UI with React Ink (streaming, syntax highlighting, permissions)
- Clean modular architecture that's easy to extend

## Non-Goals

- Plugin/extension system (can be added later)
- Multi-model orchestration (single model per session)
- Remote/cloud sessions
- IDE integrations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (v20+) |
| Language | TypeScript (strict mode) |
| CLI framework | Commander.js |
| LLM client | `openai` npm package (OpenAI-compatible) |
| LLM provider | OpenRouter (`https://openrouter.ai/api/v1`) |
| Schema validation | Zod |
| Terminal UI | React Ink |
| Syntax highlighting | `cli-highlight` |
| Colors | Chalk |
| Build | `tsup` (esbuild-based bundler) |
| Test | Vitest |

## Project Structure

```
anver-code/
├── package.json
├── tsconfig.json
├── bin/
│   └── anver.ts              # Entry point — shebang, Commander setup, launches Ink app
├── src/
│   ├── core/
│   │   ├── types.ts           # Message types (User, Assistant, Tool, System)
│   │   ├── query.ts           # Query engine — agentic loop, streaming, tool dispatch
│   │   ├── conversation.ts    # Conversation state, history management, context window
│   │   └── provider.ts        # LLM provider interface + OpenRouter adapter
│   ├── tools/
│   │   ├── index.ts           # Tool registry — imports all tools, exposes as array
│   │   ├── BaseTool.ts        # Abstract base class with Zod input validation
│   │   ├── ReadFile.ts
│   │   ├── WriteFile.ts
│   │   ├── EditFile.ts
│   │   ├── Bash.ts
│   │   ├── Glob.ts
│   │   ├── Grep.ts
│   │   ├── GitStatus.ts
│   │   ├── GitCommit.ts
│   │   ├── GitDiff.ts
│   │   ├── GitLog.ts
│   │   ├── WebSearch.ts
│   │   ├── WebFetch.ts
│   │   ├── ListDirectory.ts
│   │   └── FindFile.ts
│   ├── ui/
│   │   ├── App.tsx            # Root Ink component, state machine
│   │   ├── MessageList.tsx    # Scrollable conversation renderer
│   │   ├── InputPrompt.tsx    # User input with history, multi-line, slash commands
│   │   ├── ToolResult.tsx     # Per-tool result rendering (collapsible)
│   │   ├── Spinner.tsx        # Streaming/thinking indicator with elapsed time
│   │   ├── PermissionPrompt.tsx # Tool approval [y/n]
│   │   └── theme.ts          # Color palette, text styles
│   ├── commands/
│   │   ├── chat.ts            # Default interactive REPL (launches Ink app)
│   │   ├── init.ts            # Project onboarding — creates .anvercode
│   │   └── config.ts          # Manage settings (apiKey, model, autoApprove)
│   └── utils/
│       ├── config.ts          # Read/write ~/.anver-code/config.json
│       ├── history.ts         # Session persistence (JSON per session)
│       ├── systemPrompt.ts    # Build system message with cwd, git, project context
│       └── tokens.ts          # Token counting / estimation for context management
└── test/
    ├── core/
    ├── tools/
    └── ui/
```

## Architecture

### Provider Layer

```typescript
interface LLMProvider {
  chat(params: {
    model: string;
    messages: Message[];
    tools?: ToolDefinition[];
    stream: boolean;
  }): AsyncIterable<StreamChunk>;
}
```

The `OpenRouterProvider` implements this using the `openai` npm package pointed at `https://openrouter.ai/api/v1`. Since OpenRouter speaks the OpenAI protocol, this also means swapping in Ollama, Groq, or any OpenAI-compatible provider later requires only a new adapter — no changes to the query engine.

**Default model:** `google/gemini-2.5-pro-exp-03-25` (free, strong at code). Users can switch via `anver config set model <model>` or `--model` flag.

### Query Engine (Agentic Loop)

The core loop in `query.ts`:

1. Take user message + conversation history + tool definitions
2. Stream to LLM provider
3. If response contains `tool_calls`:
   - Check permissions (auto-approve or prompt user)
   - Execute each tool call
   - Append tool results to conversation
   - Go to step 2
4. If response is text-only → return to UI

This loop runs until the model stops calling tools. The query engine is stateless — it takes messages in and returns messages out. Conversation state lives in `conversation.ts`.

### Tool System

Every tool extends `BaseTool`:

```typescript
abstract class BaseTool<TInput, TOutput> {
  abstract name: string;
  abstract description: string;
  abstract inputSchema: ZodSchema<TInput>;
  abstract destructive: boolean;  // If true, requires user approval

  abstract call(input: TInput): Promise<TOutput>;

  // Optional: custom Ink component for rendering
  renderResult?(output: TOutput): React.ReactNode;

  // Converts Zod schema to JSON Schema for the LLM
  toToolDefinition(): ToolDefinition;
}
```

**Tool registry** (`tools/index.ts`) imports all tools and exports them as an array. The query engine uses `toToolDefinition()` to build the `tools` parameter for the API call.

**Full tool list:**

| Tool | Description | Destructive |
|------|-------------|-------------|
| ReadFile | Read file contents with line numbers | No |
| WriteFile | Create or overwrite a file | Yes |
| EditFile | String replacement in files | Yes |
| Bash | Execute shell commands with timeout | Yes |
| Glob | Find files by pattern | No |
| Grep | Search file contents with regex | No |
| GitStatus | Show working tree status | No |
| GitDiff | Show staged/unstaged changes | No |
| GitLog | Show recent commits | No |
| GitCommit | Create a commit | Yes |
| WebSearch | Search the web | No |
| WebFetch | Fetch URL contents | No |
| ListDirectory | List directory contents | No |
| FindFile | Find files by name | No |

### Terminal UI

React Ink app with a state machine:

**States:**
- `idle` — waiting for user input
- `streaming` — receiving and rendering LLM response chunks
- `tool_pending` — showing permission prompt for a destructive tool
- `tool_running` — executing a tool, showing spinner

**Components:**

- **App.tsx** — root component, owns the state machine and conversation state
- **MessageList** — renders all messages with role-specific styling:
  - User: bold white
  - Assistant: default with markdown/code block rendering
  - Tool call: dim, shows tool name + truncated args
  - Tool result: collapsible, truncated output with "show more"
- **InputPrompt** — text input with readline-style keybindings:
  - Up/down: history navigation
  - Multi-line input support
  - Slash commands: `/help`, `/clear`, `/model <name>`, `/exit`
- **Spinner** — animated spinner with model name and elapsed time
- **PermissionPrompt** — shows tool name, arguments, `[y/n/always]`

### Conversation & Session Management

**Message types:**

```typescript
type Message =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }
```

**Session persistence:**
- Saved to `~/.anver-code/sessions/<timestamp>.json`
- Contains: messages, model, working directory, created/updated timestamps
- Auto-saved after every exchange

**Session resume:**
- `anver --resume` — picks up last session
- `anver --session <path>` — loads specific session

**Context window management:**
- Track estimated token count per message (word-count heuristic: words * 1.3)
- When approaching model's context limit, make a side-call to the LLM asking it to summarize the oldest messages into a single condensed message, then replace those messages with the summary
- Always preserve: system prompt, recent messages, pending tool results

### Configuration

Stored at `~/.anver-code/config.json`:

```json
{
  "apiKey": "sk-or-...",
  "model": "google/gemini-2.5-pro-exp-03-25",
  "theme": "default",
  "autoApprove": ["ReadFile", "Glob", "Grep", "ListDirectory", "GitStatus", "GitDiff", "GitLog"]
}
```

**CLI commands:**
- `anver config set <key> <value>` — set a config value
- `anver config get <key>` — read a config value
- `anver config list` — show all config

**Project-level config:** `.anvercode` file in repo root (like CLAUDE.md) — loaded into the system prompt to give the model project-specific instructions.

### System Prompt

Built dynamically from:

1. **Base instructions** — role definition, tool usage rules, output guidelines
2. **Environment context** — OS, shell, cwd, git branch/status
3. **Project config** — contents of `.anvercode` if present
4. **Model-specific adjustments** — some models need different prompting styles for tool use

## CLI Interface

```
anver [options] [prompt]

Options:
  -m, --model <model>    Override default model
  -r, --resume           Resume last session
  -s, --session <path>   Load specific session
  -v, --verbose          Show debug output
  --version              Show version
  --help                 Show help

Commands:
  config                 Manage configuration
  init                   Initialize project (.anvercode)

Examples:
  anver "fix the bug in auth.ts"
  anver --model deepseek/deepseek-chat-v3 "explain this code"
  anver --resume
  anver config set apiKey sk-or-xxx
```

## Testing Strategy

- **Unit tests** for each tool (mock filesystem/shell)
- **Unit tests** for query engine (mock LLM responses with tool calls)
- **Unit tests** for conversation management (token counting, summarization)
- **Integration tests** for the agentic loop (tool call → execution → re-query)
- **Snapshot tests** for Ink components using `ink-testing-library`

## Future Enhancements (Out of Scope)

- Plugin system for third-party tools
- Multiple provider support (Ollama, Groq) via config
- MCP server support
- Session search/history browser
- Cost tracking (for paid models)
- Voice input
