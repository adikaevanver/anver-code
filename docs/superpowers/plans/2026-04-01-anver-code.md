# Anver Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code-inspired coding assistant CLI powered by free LLMs via OpenRouter, with a full toolset and rich React Ink terminal UI.

**Architecture:** Modular monorepo with clean separation — `core/` (provider, query engine, types), `tools/` (BaseTool + 14 tools), `ui/` (React Ink components), `commands/` (CLI subcommands), `utils/` (config, history, system prompt). The agentic loop in `core/query.ts` streams LLM responses, dispatches tool calls, and loops until the model responds with text only.

**Tech Stack:** TypeScript, Node.js v20+, Commander.js, `openai` npm package, Zod, React Ink, cli-highlight, Chalk, tsup, Vitest

---

## File Map

| File | Responsibility |
|------|---------------|
| `package.json` | Dependencies, scripts, bin entry |
| `tsconfig.json` | TypeScript strict config |
| `tsup.config.ts` | Build config — bundles to `dist/` |
| `bin/anver.ts` | Shebang entry, Commander setup, launches Ink or runs subcommand |
| `src/core/types.ts` | Message, ToolCall, ToolDefinition, StreamChunk types |
| `src/core/provider.ts` | LLMProvider interface + OpenRouterProvider class |
| `src/core/conversation.ts` | Conversation class — message list, token tracking, session save/load |
| `src/core/query.ts` | QueryEngine — agentic loop, streaming, tool dispatch |
| `src/tools/BaseTool.ts` | Abstract BaseTool with Zod validation and toToolDefinition() |
| `src/tools/ReadFile.ts` | Read file with line numbers |
| `src/tools/WriteFile.ts` | Create/overwrite file |
| `src/tools/EditFile.ts` | String replacement in files |
| `src/tools/Bash.ts` | Shell command execution with timeout |
| `src/tools/Glob.ts` | File pattern matching |
| `src/tools/Grep.ts` | Content search with regex |
| `src/tools/GitStatus.ts` | git status |
| `src/tools/GitDiff.ts` | git diff |
| `src/tools/GitLog.ts` | git log |
| `src/tools/GitCommit.ts` | git commit |
| `src/tools/WebSearch.ts` | Web search via DuckDuckGo scrape |
| `src/tools/WebFetch.ts` | Fetch URL content |
| `src/tools/ListDirectory.ts` | ls directory |
| `src/tools/FindFile.ts` | Find files by name |
| `src/tools/index.ts` | Tool registry — imports all, exports array |
| `src/ui/theme.ts` | Color palette, style constants |
| `src/ui/Spinner.tsx` | Animated spinner with model name + elapsed time |
| `src/ui/MessageList.tsx` | Scrollable message renderer |
| `src/ui/InputPrompt.tsx` | User input with history, slash commands |
| `src/ui/ToolResult.tsx` | Tool result display (collapsible) |
| `src/ui/PermissionPrompt.tsx` | Tool approval prompt [y/n/always] |
| `src/ui/App.tsx` | Root component, state machine, orchestrates everything |
| `src/commands/config.ts` | `anver config get/set/list` subcommand |
| `src/commands/init.ts` | `anver init` — creates .anvercode |
| `src/commands/chat.ts` | Default REPL — launches Ink app |
| `src/utils/config.ts` | Read/write ~/.anver-code/config.json |
| `src/utils/history.ts` | Session persistence to ~/.anver-code/sessions/ |
| `src/utils/systemPrompt.ts` | Build system message from env + project config |
| `src/utils/tokens.ts` | Token count estimation |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Initialize package.json**

```bash
cd ~/anver-code
npm init -y
```

Then replace contents of `package.json`:

```json
{
  "name": "anver-code",
  "version": "0.1.0",
  "description": "Claude Code-inspired coding assistant CLI powered by free LLMs",
  "type": "module",
  "bin": {
    "anver": "./dist/bin/anver.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit",
    "start": "node dist/bin/anver.js"
  },
  "keywords": ["cli", "ai", "coding-assistant", "openrouter"],
  "license": "MIT"
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd ~/anver-code
npm install commander openai zod ink react chalk cli-highlight glob
npm install -D typescript @types/node @types/react tsup vitest ink-testing-library
```

- [ ] **Step 3: Create tsconfig.json**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*", "bin/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 4: Create tsup.config.ts**

Create `tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['bin/anver.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist/bin',
  splitting: false,
  sourcemap: true,
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

- [ ] **Step 5: Create .gitignore**

Create `.gitignore`:

```
node_modules/
dist/
*.tsbuildinfo
.env
```

- [ ] **Step 6: Create directory structure**

```bash
mkdir -p src/core src/tools src/ui src/commands src/utils test/core test/tools test/ui bin
```

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json tsup.config.ts .gitignore package-lock.json
git commit -m "feat: scaffold project with dependencies and build config"
```

---

### Task 2: Core Types

**Files:**
- Create: `src/core/types.ts`
- Create: `test/core/types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/core/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  type Message,
  type ToolCall,
  type ToolDefinition,
  type StreamChunk,
  type SessionData,
  isAssistantMessage,
  isToolMessage,
} from '../src/core/types.js';

describe('types', () => {
  describe('isAssistantMessage', () => {
    it('returns true for assistant messages', () => {
      const msg: Message = { role: 'assistant', content: 'hello' };
      expect(isAssistantMessage(msg)).toBe(true);
    });

    it('returns false for user messages', () => {
      const msg: Message = { role: 'user', content: 'hello' };
      expect(isAssistantMessage(msg)).toBe(false);
    });

    it('detects tool_calls on assistant messages', () => {
      const msg: Message = {
        role: 'assistant',
        content: '',
        tool_calls: [{
          id: 'call_1',
          type: 'function',
          function: { name: 'ReadFile', arguments: '{"path":"/tmp/x"}' },
        }],
      };
      expect(isAssistantMessage(msg)).toBe(true);
      if (isAssistantMessage(msg)) {
        expect(msg.tool_calls).toHaveLength(1);
      }
    });
  });

  describe('isToolMessage', () => {
    it('returns true for tool messages', () => {
      const msg: Message = { role: 'tool', tool_call_id: 'call_1', content: 'result' };
      expect(isToolMessage(msg)).toBe(true);
    });

    it('returns false for system messages', () => {
      const msg: Message = { role: 'system', content: 'prompt' };
      expect(isToolMessage(msg)).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/types.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/core/types.ts`:

```typescript
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export type SystemMessage = { role: 'system'; content: string };
export type UserMessage = { role: 'user'; content: string };
export type AssistantMessage = {
  role: 'assistant';
  content: string;
  tool_calls?: ToolCall[];
};
export type ToolResultMessage = {
  role: 'tool';
  tool_call_id: string;
  content: string;
};

export type Message =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolResultMessage;

export interface StreamChunk {
  type: 'text_delta' | 'tool_call_delta' | 'done';
  content?: string;
  tool_call?: Partial<ToolCall>;
}

export interface SessionData {
  id: string;
  messages: Message[];
  model: string;
  cwd: string;
  createdAt: string;
  updatedAt: string;
}

export function isAssistantMessage(msg: Message): msg is AssistantMessage {
  return msg.role === 'assistant';
}

export function isToolMessage(msg: Message): msg is ToolResultMessage {
  return msg.role === 'tool';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/types.ts test/core/types.test.ts
git commit -m "feat: add core message and tool types"
```

---

### Task 3: Token Estimation Utility

**Files:**
- Create: `src/utils/tokens.ts`
- Create: `test/core/tokens.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/core/tokens.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { estimateTokens, estimateMessagesTokens } from '../src/utils/tokens.js';
import type { Message } from '../src/core/types.js';

describe('tokens', () => {
  describe('estimateTokens', () => {
    it('estimates tokens from word count', () => {
      const text = 'hello world this is a test';
      // 6 words * 1.3 ≈ 8
      expect(estimateTokens(text)).toBeGreaterThanOrEqual(7);
      expect(estimateTokens(text)).toBeLessThanOrEqual(9);
    });

    it('returns 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('handles code with special characters', () => {
      const code = 'const x = () => { return "hello"; };';
      expect(estimateTokens(code)).toBeGreaterThan(0);
    });
  });

  describe('estimateMessagesTokens', () => {
    it('sums tokens across messages', () => {
      const messages: Message[] = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello world' },
      ];
      const total = estimateMessagesTokens(messages);
      expect(total).toBeGreaterThan(0);
      expect(total).toBe(
        estimateTokens('You are a helpful assistant') + estimateTokens('Hello world')
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/tokens.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/utils/tokens.ts`:

```typescript
import type { Message } from '../core/types.js';

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.ceil(words * 1.3);
}

export function estimateMessagesTokens(messages: Message[]): number {
  return messages.reduce((sum, msg) => {
    const content = msg.role === 'tool' ? msg.content : msg.content;
    return sum + estimateTokens(content);
  }, 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/tokens.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/tokens.ts test/core/tokens.test.ts
git commit -m "feat: add token estimation utility"
```

---

### Task 4: Configuration Utility

**Files:**
- Create: `src/utils/config.ts`
- Create: `test/core/config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/core/config.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadConfig, saveConfig, getConfigValue, setConfigValue, type Config } from '../src/utils/config.js';

describe('config', () => {
  let tmpDir: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anver-test-'));
    originalHome = process.env.ANVER_CODE_HOME;
    process.env.ANVER_CODE_HOME = tmpDir;
  });

  afterEach(() => {
    if (originalHome !== undefined) {
      process.env.ANVER_CODE_HOME = originalHome;
    } else {
      delete process.env.ANVER_CODE_HOME;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns default config when no file exists', () => {
    const config = loadConfig();
    expect(config.model).toBe('google/gemini-2.5-pro-exp-03-25');
    expect(config.autoApprove).toContain('ReadFile');
  });

  it('saves and loads config', () => {
    const config: Config = {
      apiKey: 'sk-or-test',
      model: 'meta-llama/llama-4-maverick',
      theme: 'default',
      autoApprove: ['ReadFile'],
    };
    saveConfig(config);
    const loaded = loadConfig();
    expect(loaded.apiKey).toBe('sk-or-test');
    expect(loaded.model).toBe('meta-llama/llama-4-maverick');
  });

  it('gets a specific config value', () => {
    saveConfig({
      apiKey: 'test-key',
      model: 'test-model',
      theme: 'default',
      autoApprove: [],
    });
    expect(getConfigValue('apiKey')).toBe('test-key');
  });

  it('sets a specific config value', () => {
    setConfigValue('model', 'new-model');
    const config = loadConfig();
    expect(config.model).toBe('new-model');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/config.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/utils/config.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface Config {
  apiKey?: string;
  model: string;
  theme: string;
  autoApprove: string[];
}

const DEFAULT_CONFIG: Config = {
  model: 'google/gemini-2.5-pro-exp-03-25',
  theme: 'default',
  autoApprove: ['ReadFile', 'Glob', 'Grep', 'ListDirectory', 'GitStatus', 'GitDiff', 'GitLog'],
};

export function getConfigDir(): string {
  const override = process.env.ANVER_CODE_HOME;
  if (override) return override;
  return path.join(os.homedir(), '.anver-code');
}

function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}

export function loadConfig(): Config {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }
  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw);
  return { ...DEFAULT_CONFIG, ...parsed };
}

export function saveConfig(config: Config): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2) + '\n');
}

export function getConfigValue(key: keyof Config): string | string[] | undefined {
  const config = loadConfig();
  return config[key];
}

export function setConfigValue(key: keyof Config, value: string | string[]): void {
  const config = loadConfig();
  (config as Record<string, unknown>)[key] = value;
  saveConfig(config);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/config.ts test/core/config.test.ts
git commit -m "feat: add configuration read/write utility"
```

---

### Task 5: LLM Provider

**Files:**
- Create: `src/core/provider.ts`
- Create: `test/core/provider.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/core/provider.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { OpenRouterProvider } from '../src/core/provider.js';

describe('OpenRouterProvider', () => {
  it('constructs with API key and base URL', () => {
    const provider = new OpenRouterProvider('sk-or-test');
    expect(provider).toBeDefined();
  });

  it('throws if no API key provided', () => {
    expect(() => new OpenRouterProvider('')).toThrow('API key is required');
  });

  it('formats tool definitions correctly', () => {
    const provider = new OpenRouterProvider('sk-or-test');
    const tools = [{
      type: 'function' as const,
      function: {
        name: 'ReadFile',
        description: 'Read a file',
        parameters: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
        },
      },
    }];
    // Should not throw when building params
    const params = provider.buildParams({
      model: 'test-model',
      messages: [{ role: 'user', content: 'hi' }],
      tools,
      stream: true,
    });
    expect(params.tools).toEqual(tools);
    expect(params.model).toBe('test-model');
    expect(params.stream).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/provider.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/core/provider.ts`:

```typescript
import OpenAI from 'openai';
import type { Message, ToolDefinition, StreamChunk, ToolCall } from './types.js';

export interface ChatParams {
  model: string;
  messages: Message[];
  tools?: ToolDefinition[];
  stream: boolean;
}

export interface LLMProvider {
  chat(params: ChatParams): AsyncIterable<StreamChunk>;
  buildParams(params: ChatParams): Record<string, unknown>;
}

export class OpenRouterProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('API key is required');
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    });
  }

  buildParams(params: ChatParams): Record<string, unknown> {
    return {
      model: params.model,
      messages: params.messages,
      tools: params.tools,
      stream: params.stream,
    };
  }

  async *chat(params: ChatParams): AsyncIterable<StreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: params.model,
      messages: params.messages as OpenAI.ChatCompletionMessageParam[],
      tools: params.tools as OpenAI.ChatCompletionTool[],
      stream: true,
    });

    const toolCallAccumulators: Map<number, { id: string; name: string; arguments: string }> = new Map();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        yield { type: 'text_delta', content: delta.content };
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (!toolCallAccumulators.has(idx)) {
            toolCallAccumulators.set(idx, {
              id: tc.id || '',
              name: tc.function?.name || '',
              arguments: '',
            });
          }
          const acc = toolCallAccumulators.get(idx)!;
          if (tc.id) acc.id = tc.id;
          if (tc.function?.name) acc.name = tc.function.name;
          if (tc.function?.arguments) acc.arguments += tc.function.arguments;
        }
      }

      if (chunk.choices[0]?.finish_reason === 'tool_calls' || chunk.choices[0]?.finish_reason === 'stop') {
        for (const [, acc] of toolCallAccumulators) {
          yield {
            type: 'tool_call_delta',
            tool_call: {
              id: acc.id,
              type: 'function',
              function: { name: acc.name, arguments: acc.arguments },
            },
          };
        }
        yield { type: 'done' };
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/provider.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/provider.ts test/core/provider.test.ts
git commit -m "feat: add OpenRouter LLM provider with streaming"
```

---

### Task 6: BaseTool and Tool Registry

**Files:**
- Create: `src/tools/BaseTool.ts`
- Create: `src/tools/index.ts`
- Create: `test/tools/BaseTool.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/tools/BaseTool.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { BaseTool } from '../src/tools/BaseTool.js';

class MockTool extends BaseTool<{ path: string }, string> {
  name = 'MockTool';
  description = 'A mock tool for testing';
  destructive = false;
  inputSchema = z.object({ path: z.string().describe('File path to read') });

  async call(input: { path: string }): Promise<string> {
    return `Read: ${input.path}`;
  }
}

describe('BaseTool', () => {
  const tool = new MockTool();

  it('has a name and description', () => {
    expect(tool.name).toBe('MockTool');
    expect(tool.description).toBe('A mock tool for testing');
  });

  it('validates input with Zod schema', async () => {
    const result = await tool.execute({ path: '/tmp/test.txt' });
    expect(result).toBe('Read: /tmp/test.txt');
  });

  it('rejects invalid input', async () => {
    await expect(tool.execute({ wrong: 'field' } as any)).rejects.toThrow();
  });

  it('converts to OpenAI tool definition', () => {
    const def = tool.toToolDefinition();
    expect(def.type).toBe('function');
    expect(def.function.name).toBe('MockTool');
    expect(def.function.description).toBe('A mock tool for testing');
    expect(def.function.parameters).toHaveProperty('properties');
    expect((def.function.parameters as any).properties.path).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/tools/BaseTool.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write BaseTool implementation**

Create `src/tools/BaseTool.ts`:

```typescript
import { type ZodSchema } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ToolDefinition } from '../core/types.js';

export abstract class BaseTool<TInput, TOutput> {
  abstract name: string;
  abstract description: string;
  abstract inputSchema: ZodSchema<TInput>;
  abstract destructive: boolean;

  abstract call(input: TInput): Promise<TOutput>;

  async execute(rawInput: unknown): Promise<TOutput> {
    const parsed = this.inputSchema.parse(rawInput);
    return this.call(parsed);
  }

  toToolDefinition(): ToolDefinition {
    const jsonSchema = zodToJsonSchema(this.inputSchema, { target: 'openApi3' });
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: jsonSchema as Record<string, unknown>,
      },
    };
  }
}
```

- [ ] **Step 4: Install zod-to-json-schema**

```bash
cd ~/anver-code && npm install zod-to-json-schema
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/tools/BaseTool.test.ts`
Expected: PASS

- [ ] **Step 6: Create empty tool registry**

Create `src/tools/index.ts`:

```typescript
import type { BaseTool } from './BaseTool.js';

// Tools will be imported and added here as they are implemented
const tools: BaseTool<any, any>[] = [];

export function getTools(): BaseTool<any, any>[] {
  return tools;
}

export function getToolByName(name: string): BaseTool<any, any> | undefined {
  return tools.find((t) => t.name === name);
}

export function getToolDefinitions() {
  return tools.map((t) => t.toToolDefinition());
}
```

- [ ] **Step 7: Commit**

```bash
git add src/tools/BaseTool.ts src/tools/index.ts test/tools/BaseTool.test.ts package.json package-lock.json
git commit -m "feat: add BaseTool abstract class and tool registry"
```

---

### Task 7: File Tools (ReadFile, WriteFile, EditFile)

**Files:**
- Create: `src/tools/ReadFile.ts`
- Create: `src/tools/WriteFile.ts`
- Create: `src/tools/EditFile.ts`
- Create: `test/tools/fileTools.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/tools/fileTools.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ReadFileTool } from '../src/tools/ReadFile.js';
import { WriteFileTool } from '../src/tools/WriteFile.js';
import { EditFileTool } from '../src/tools/EditFile.js';

describe('File Tools', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anver-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('ReadFileTool', () => {
    const tool = new ReadFileTool();

    it('reads a file with line numbers', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(filePath, 'line one\nline two\nline three\n');
      const result = await tool.execute({ file_path: filePath });
      expect(result).toContain('1\tline one');
      expect(result).toContain('2\tline two');
      expect(result).toContain('3\tline three');
    });

    it('reads with offset and limit', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(filePath, 'a\nb\nc\nd\ne\n');
      const result = await tool.execute({ file_path: filePath, offset: 2, limit: 2 });
      expect(result).toContain('3\tc');
      expect(result).toContain('4\td');
      expect(result).not.toContain('1\ta');
    });

    it('throws for nonexistent file', async () => {
      await expect(tool.execute({ file_path: '/nonexistent/file' })).rejects.toThrow();
    });
  });

  describe('WriteFileTool', () => {
    const tool = new WriteFileTool();

    it('creates a new file', async () => {
      const filePath = path.join(tmpDir, 'new.txt');
      const result = await tool.execute({ file_path: filePath, content: 'hello world' });
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('hello world');
      expect(result).toContain('Written');
    });

    it('overwrites an existing file', async () => {
      const filePath = path.join(tmpDir, 'existing.txt');
      fs.writeFileSync(filePath, 'old content');
      await tool.execute({ file_path: filePath, content: 'new content' });
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('new content');
    });

    it('creates parent directories', async () => {
      const filePath = path.join(tmpDir, 'sub', 'dir', 'file.txt');
      await tool.execute({ file_path: filePath, content: 'nested' });
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('nested');
    });
  });

  describe('EditFileTool', () => {
    const tool = new EditFileTool();

    it('replaces a string in a file', async () => {
      const filePath = path.join(tmpDir, 'edit.txt');
      fs.writeFileSync(filePath, 'hello world\nfoo bar\n');
      const result = await tool.execute({
        file_path: filePath,
        old_string: 'foo bar',
        new_string: 'baz qux',
      });
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('hello world\nbaz qux\n');
      expect(result).toContain('Edited');
    });

    it('throws if old_string not found', async () => {
      const filePath = path.join(tmpDir, 'edit2.txt');
      fs.writeFileSync(filePath, 'hello world');
      await expect(
        tool.execute({ file_path: filePath, old_string: 'not here', new_string: 'x' })
      ).rejects.toThrow('not found');
    });

    it('throws if old_string matches multiple times', async () => {
      const filePath = path.join(tmpDir, 'edit3.txt');
      fs.writeFileSync(filePath, 'aaa\naaa\n');
      await expect(
        tool.execute({ file_path: filePath, old_string: 'aaa', new_string: 'bbb' })
      ).rejects.toThrow('multiple');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/tools/fileTools.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement ReadFileTool**

Create `src/tools/ReadFile.ts`:

```typescript
import { z } from 'zod';
import fs from 'fs';
import { BaseTool } from './BaseTool.js';

export class ReadFileTool extends BaseTool<
  { file_path: string; offset?: number; limit?: number },
  string
> {
  name = 'ReadFile';
  description = 'Read a file from the filesystem. Returns contents with line numbers.';
  destructive = false;
  inputSchema = z.object({
    file_path: z.string().describe('Absolute path to the file'),
    offset: z.number().optional().describe('Line number to start from (0-based)'),
    limit: z.number().optional().describe('Number of lines to read'),
  });

  async call(input: { file_path: string; offset?: number; limit?: number }): Promise<string> {
    const content = fs.readFileSync(input.file_path, 'utf-8');
    let lines = content.split('\n');

    // Remove trailing empty line from split
    if (lines[lines.length - 1] === '') lines.pop();

    const offset = input.offset ?? 0;
    const limit = input.limit ?? lines.length;
    lines = lines.slice(offset, offset + limit);

    return lines.map((line, i) => `${offset + i + 1}\t${line}`).join('\n');
  }
}
```

- [ ] **Step 4: Implement WriteFileTool**

Create `src/tools/WriteFile.ts`:

```typescript
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { BaseTool } from './BaseTool.js';

export class WriteFileTool extends BaseTool<
  { file_path: string; content: string },
  string
> {
  name = 'WriteFile';
  description = 'Write content to a file. Creates parent directories if needed. Overwrites existing files.';
  destructive = true;
  inputSchema = z.object({
    file_path: z.string().describe('Absolute path to the file'),
    content: z.string().describe('Content to write'),
  });

  async call(input: { file_path: string; content: string }): Promise<string> {
    const dir = path.dirname(input.file_path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(input.file_path, input.content);
    return `Written ${input.content.length} bytes to ${input.file_path}`;
  }
}
```

- [ ] **Step 5: Implement EditFileTool**

Create `src/tools/EditFile.ts`:

```typescript
import { z } from 'zod';
import fs from 'fs';
import { BaseTool } from './BaseTool.js';

export class EditFileTool extends BaseTool<
  { file_path: string; old_string: string; new_string: string },
  string
> {
  name = 'EditFile';
  description = 'Replace an exact string in a file. The old_string must appear exactly once.';
  destructive = true;
  inputSchema = z.object({
    file_path: z.string().describe('Absolute path to the file'),
    old_string: z.string().describe('Exact string to find and replace'),
    new_string: z.string().describe('Replacement string'),
  });

  async call(input: { file_path: string; old_string: string; new_string: string }): Promise<string> {
    const content = fs.readFileSync(input.file_path, 'utf-8');
    const occurrences = content.split(input.old_string).length - 1;

    if (occurrences === 0) {
      throw new Error(`String not found in ${input.file_path}`);
    }
    if (occurrences > 1) {
      throw new Error(`String matches multiple times (${occurrences}) in ${input.file_path}`);
    }

    const newContent = content.replace(input.old_string, input.new_string);
    fs.writeFileSync(input.file_path, newContent);
    return `Edited ${input.file_path}`;
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run test/tools/fileTools.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/tools/ReadFile.ts src/tools/WriteFile.ts src/tools/EditFile.ts test/tools/fileTools.test.ts
git commit -m "feat: add ReadFile, WriteFile, EditFile tools"
```

---

### Task 8: Shell and Search Tools (Bash, Glob, Grep)

**Files:**
- Create: `src/tools/Bash.ts`
- Create: `src/tools/Glob.ts`
- Create: `src/tools/Grep.ts`
- Create: `test/tools/shellTools.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/tools/shellTools.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { BashTool } from '../src/tools/Bash.js';
import { GlobTool } from '../src/tools/Glob.js';
import { GrepTool } from '../src/tools/Grep.js';

describe('Shell and Search Tools', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anver-test-'));
    fs.writeFileSync(path.join(tmpDir, 'hello.ts'), 'const greeting = "hello";\nconsole.log(greeting);\n');
    fs.writeFileSync(path.join(tmpDir, 'world.ts'), 'export const world = "world";\n');
    fs.writeFileSync(path.join(tmpDir, 'readme.md'), '# Test\n');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('BashTool', () => {
    const tool = new BashTool();

    it('executes a simple command', async () => {
      const result = await tool.execute({ command: 'echo hello' });
      expect(result.stdout.trim()).toBe('hello');
      expect(result.exitCode).toBe(0);
    });

    it('captures stderr', async () => {
      const result = await tool.execute({ command: 'echo err >&2' });
      expect(result.stderr.trim()).toBe('err');
    });

    it('returns non-zero exit code on failure', async () => {
      const result = await tool.execute({ command: 'exit 1' });
      expect(result.exitCode).toBe(1);
    });

    it('respects timeout', async () => {
      await expect(
        tool.execute({ command: 'sleep 10', timeout: 500 })
      ).rejects.toThrow();
    });
  });

  describe('GlobTool', () => {
    const tool = new GlobTool();

    it('finds files by pattern', async () => {
      const result = await tool.execute({ pattern: '*.ts', path: tmpDir });
      expect(result).toContain('hello.ts');
      expect(result).toContain('world.ts');
      expect(result).not.toContain('readme.md');
    });

    it('returns empty for no matches', async () => {
      const result = await tool.execute({ pattern: '*.py', path: tmpDir });
      expect(result).toBe('');
    });
  });

  describe('GrepTool', () => {
    const tool = new GrepTool();

    it('searches file contents', async () => {
      const result = await tool.execute({ pattern: 'greeting', path: tmpDir });
      expect(result).toContain('hello.ts');
      expect(result).toContain('greeting');
    });

    it('returns empty for no matches', async () => {
      const result = await tool.execute({ pattern: 'nonexistent_xyz', path: tmpDir });
      expect(result).toBe('');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/tools/shellTools.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement BashTool**

Create `src/tools/Bash.ts`:

```typescript
import { z } from 'zod';
import { execSync } from 'child_process';
import { BaseTool } from './BaseTool.js';

interface BashOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class BashTool extends BaseTool<
  { command: string; timeout?: number },
  BashOutput
> {
  name = 'Bash';
  description = 'Execute a shell command and return stdout, stderr, and exit code.';
  destructive = true;
  inputSchema = z.object({
    command: z.string().describe('The shell command to execute'),
    timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)'),
  });

  async call(input: { command: string; timeout?: number }): Promise<BashOutput> {
    const timeout = input.timeout ?? 30000;
    try {
      const stdout = execSync(input.command, {
        encoding: 'utf-8',
        timeout,
        shell: '/bin/bash',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (err: any) {
      if (err.killed) {
        throw new Error(`Command timed out after ${timeout}ms`);
      }
      return {
        stdout: err.stdout ?? '',
        stderr: err.stderr ?? '',
        exitCode: err.status ?? 1,
      };
    }
  }
}
```

- [ ] **Step 4: Implement GlobTool**

Create `src/tools/Glob.ts`:

```typescript
import { z } from 'zod';
import { glob } from 'glob';
import { BaseTool } from './BaseTool.js';

export class GlobTool extends BaseTool<
  { pattern: string; path?: string },
  string
> {
  name = 'Glob';
  description = 'Find files matching a glob pattern. Returns matching file paths.';
  destructive = false;
  inputSchema = z.object({
    pattern: z.string().describe('Glob pattern (e.g. "**/*.ts")'),
    path: z.string().optional().describe('Directory to search in (default: cwd)'),
  });

  async call(input: { pattern: string; path?: string }): Promise<string> {
    const cwd = input.path ?? process.cwd();
    const matches = await glob(input.pattern, { cwd, nodir: true });
    return matches.sort().join('\n');
  }
}
```

- [ ] **Step 5: Implement GrepTool**

Create `src/tools/Grep.ts`:

```typescript
import { z } from 'zod';
import { execSync } from 'child_process';
import { BaseTool } from './BaseTool.js';

export class GrepTool extends BaseTool<
  { pattern: string; path?: string; glob?: string },
  string
> {
  name = 'Grep';
  description = 'Search file contents using regex. Returns matching lines with file paths and line numbers.';
  destructive = false;
  inputSchema = z.object({
    pattern: z.string().describe('Regex pattern to search for'),
    path: z.string().optional().describe('Directory or file to search in (default: cwd)'),
    glob: z.string().optional().describe('File glob filter (e.g. "*.ts")'),
  });

  async call(input: { pattern: string; path?: string; glob?: string }): Promise<string> {
    const searchPath = input.path ?? process.cwd();
    const args = ['-rn', '--color=never'];
    if (input.glob) {
      args.push('--include', input.glob);
    }
    args.push(input.pattern, searchPath);

    try {
      return execSync(`grep ${args.map(a => `'${a}'`).join(' ')}`, {
        encoding: 'utf-8',
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
    } catch {
      return '';
    }
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run test/tools/shellTools.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/tools/Bash.ts src/tools/Glob.ts src/tools/Grep.ts test/tools/shellTools.test.ts
git commit -m "feat: add Bash, Glob, Grep tools"
```

---

### Task 9: Git Tools (GitStatus, GitDiff, GitLog, GitCommit)

**Files:**
- Create: `src/tools/GitStatus.ts`
- Create: `src/tools/GitDiff.ts`
- Create: `src/tools/GitLog.ts`
- Create: `src/tools/GitCommit.ts`
- Create: `test/tools/gitTools.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/tools/gitTools.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { GitStatusTool } from '../src/tools/GitStatus.js';
import { GitDiffTool } from '../src/tools/GitDiff.js';
import { GitLogTool } from '../src/tools/GitLog.js';
import { GitCommitTool } from '../src/tools/GitCommit.js';

describe('Git Tools', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anver-git-'));
    execSync('git init', { cwd: tmpDir });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir });
    execSync('git config user.name "Test"', { cwd: tmpDir });
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'initial');
    execSync('git add . && git commit -m "init"', { cwd: tmpDir });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('GitStatusTool', () => {
    const tool = new GitStatusTool();

    it('shows clean status', async () => {
      const result = await tool.execute({ cwd: tmpDir });
      expect(result).toContain('nothing to commit');
    });

    it('shows modified files', async () => {
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'changed');
      const result = await tool.execute({ cwd: tmpDir });
      expect(result).toContain('file.txt');
    });
  });

  describe('GitDiffTool', () => {
    const tool = new GitDiffTool();

    it('shows diff of changes', async () => {
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'changed');
      const result = await tool.execute({ cwd: tmpDir });
      expect(result).toContain('-initial');
      expect(result).toContain('+changed');
    });
  });

  describe('GitLogTool', () => {
    const tool = new GitLogTool();

    it('shows commit history', async () => {
      const result = await tool.execute({ cwd: tmpDir });
      expect(result).toContain('init');
    });

    it('limits number of commits', async () => {
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'v2');
      execSync('git add . && git commit -m "second"', { cwd: tmpDir });
      const result = await tool.execute({ cwd: tmpDir, count: 1 });
      expect(result).toContain('second');
      expect(result).not.toContain('init');
    });
  });

  describe('GitCommitTool', () => {
    const tool = new GitCommitTool();

    it('creates a commit', async () => {
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'v2');
      execSync('git add .', { cwd: tmpDir });
      const result = await tool.execute({ cwd: tmpDir, message: 'update file' });
      expect(result).toContain('update file');
      const log = execSync('git log --oneline', { cwd: tmpDir, encoding: 'utf-8' });
      expect(log).toContain('update file');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/tools/gitTools.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement all four git tools**

Create `src/tools/GitStatus.ts`:

```typescript
import { z } from 'zod';
import { execSync } from 'child_process';
import { BaseTool } from './BaseTool.js';

export class GitStatusTool extends BaseTool<{ cwd?: string }, string> {
  name = 'GitStatus';
  description = 'Show the working tree status (git status).';
  destructive = false;
  inputSchema = z.object({
    cwd: z.string().optional().describe('Working directory (default: cwd)'),
  });

  async call(input: { cwd?: string }): Promise<string> {
    return execSync('git status', {
      cwd: input.cwd ?? process.cwd(),
      encoding: 'utf-8',
    });
  }
}
```

Create `src/tools/GitDiff.ts`:

```typescript
import { z } from 'zod';
import { execSync } from 'child_process';
import { BaseTool } from './BaseTool.js';

export class GitDiffTool extends BaseTool<{ cwd?: string; staged?: boolean }, string> {
  name = 'GitDiff';
  description = 'Show changes in the working tree (git diff). Use staged: true for staged changes.';
  destructive = false;
  inputSchema = z.object({
    cwd: z.string().optional().describe('Working directory (default: cwd)'),
    staged: z.boolean().optional().describe('Show staged changes instead'),
  });

  async call(input: { cwd?: string; staged?: boolean }): Promise<string> {
    const cmd = input.staged ? 'git diff --staged' : 'git diff';
    return execSync(cmd, {
      cwd: input.cwd ?? process.cwd(),
      encoding: 'utf-8',
    });
  }
}
```

Create `src/tools/GitLog.ts`:

```typescript
import { z } from 'zod';
import { execSync } from 'child_process';
import { BaseTool } from './BaseTool.js';

export class GitLogTool extends BaseTool<{ cwd?: string; count?: number }, string> {
  name = 'GitLog';
  description = 'Show recent commit history (git log).';
  destructive = false;
  inputSchema = z.object({
    cwd: z.string().optional().describe('Working directory (default: cwd)'),
    count: z.number().optional().describe('Number of commits to show (default: 10)'),
  });

  async call(input: { cwd?: string; count?: number }): Promise<string> {
    const n = input.count ?? 10;
    return execSync(`git log --oneline -n ${n}`, {
      cwd: input.cwd ?? process.cwd(),
      encoding: 'utf-8',
    });
  }
}
```

Create `src/tools/GitCommit.ts`:

```typescript
import { z } from 'zod';
import { execSync } from 'child_process';
import { BaseTool } from './BaseTool.js';

export class GitCommitTool extends BaseTool<{ cwd?: string; message: string }, string> {
  name = 'GitCommit';
  description = 'Create a git commit with a message. Files must be staged first.';
  destructive = true;
  inputSchema = z.object({
    cwd: z.string().optional().describe('Working directory (default: cwd)'),
    message: z.string().describe('Commit message'),
  });

  async call(input: { cwd?: string; message: string }): Promise<string> {
    return execSync(`git commit -m ${JSON.stringify(input.message)}`, {
      cwd: input.cwd ?? process.cwd(),
      encoding: 'utf-8',
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/tools/gitTools.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/Git*.ts test/tools/gitTools.test.ts
git commit -m "feat: add GitStatus, GitDiff, GitLog, GitCommit tools"
```

---

### Task 10: Web and Directory Tools (WebFetch, WebSearch, ListDirectory, FindFile)

**Files:**
- Create: `src/tools/WebFetch.ts`
- Create: `src/tools/WebSearch.ts`
- Create: `src/tools/ListDirectory.ts`
- Create: `src/tools/FindFile.ts`
- Create: `test/tools/webDirTools.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/tools/webDirTools.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { WebFetchTool } from '../src/tools/WebFetch.js';
import { ListDirectoryTool } from '../src/tools/ListDirectory.js';
import { FindFileTool } from '../src/tools/FindFile.js';

describe('Web and Directory Tools', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anver-test-'));
    fs.mkdirSync(path.join(tmpDir, 'sub'));
    fs.writeFileSync(path.join(tmpDir, 'hello.ts'), 'hello');
    fs.writeFileSync(path.join(tmpDir, 'sub', 'nested.ts'), 'nested');
    fs.writeFileSync(path.join(tmpDir, 'readme.md'), '# readme');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('WebFetchTool', () => {
    const tool = new WebFetchTool();

    it('has correct metadata', () => {
      expect(tool.name).toBe('WebFetch');
      expect(tool.destructive).toBe(false);
    });
  });

  describe('ListDirectoryTool', () => {
    const tool = new ListDirectoryTool();

    it('lists directory contents', async () => {
      const result = await tool.execute({ path: tmpDir });
      expect(result).toContain('hello.ts');
      expect(result).toContain('sub');
      expect(result).toContain('readme.md');
    });

    it('throws for nonexistent directory', async () => {
      await expect(tool.execute({ path: '/nonexistent/dir' })).rejects.toThrow();
    });
  });

  describe('FindFileTool', () => {
    const tool = new FindFileTool();

    it('finds files by name', async () => {
      const result = await tool.execute({ name: 'nested.ts', path: tmpDir });
      expect(result).toContain('nested.ts');
    });

    it('returns empty for no matches', async () => {
      const result = await tool.execute({ name: 'nonexistent.py', path: tmpDir });
      expect(result).toBe('');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/tools/webDirTools.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement WebFetchTool**

Create `src/tools/WebFetch.ts`:

```typescript
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';

export class WebFetchTool extends BaseTool<{ url: string }, string> {
  name = 'WebFetch';
  description = 'Fetch the contents of a URL and return the text body.';
  destructive = false;
  inputSchema = z.object({
    url: z.string().url().describe('URL to fetch'),
  });

  async call(input: { url: string }): Promise<string> {
    const response = await fetch(input.url, {
      headers: { 'User-Agent': 'AnverCode/0.1' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const text = await response.text();
    // Truncate very large responses
    const maxLen = 50000;
    if (text.length > maxLen) {
      return text.slice(0, maxLen) + `\n\n[Truncated — ${text.length} total characters]`;
    }
    return text;
  }
}
```

- [ ] **Step 4: Implement WebSearchTool**

Create `src/tools/WebSearch.ts`:

```typescript
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';

export class WebSearchTool extends BaseTool<{ query: string }, string> {
  name = 'WebSearch';
  description = 'Search the web using DuckDuckGo. Returns text snippets from results.';
  destructive = false;
  inputSchema = z.object({
    query: z.string().describe('Search query'),
  });

  async call(input: { query: string }): Promise<string> {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(input.query)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AnverCode/0.1' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await response.text();

    // Extract result snippets from DuckDuckGo HTML
    const results: string[] = [];
    const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    const titleRegex = /<a class="result__a"[^>]*>([\s\S]*?)<\/a>/g;

    let match: RegExpExecArray | null;
    const titles: string[] = [];
    while ((match = titleRegex.exec(html)) !== null) {
      titles.push(match[1].replace(/<[^>]+>/g, '').trim());
    }

    let i = 0;
    while ((match = snippetRegex.exec(html)) !== null) {
      const snippet = match[1].replace(/<[^>]+>/g, '').trim();
      const title = titles[i] ?? '';
      results.push(`${title}\n${snippet}`);
      i++;
      if (i >= 8) break;
    }

    return results.length > 0 ? results.join('\n\n---\n\n') : 'No results found.';
  }
}
```

- [ ] **Step 5: Implement ListDirectoryTool**

Create `src/tools/ListDirectory.ts`:

```typescript
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { BaseTool } from './BaseTool.js';

export class ListDirectoryTool extends BaseTool<{ path: string }, string> {
  name = 'ListDirectory';
  description = 'List the contents of a directory.';
  destructive = false;
  inputSchema = z.object({
    path: z.string().describe('Absolute path to the directory'),
  });

  async call(input: { path: string }): Promise<string> {
    const entries = fs.readdirSync(input.path, { withFileTypes: true });
    return entries
      .map((e) => {
        const suffix = e.isDirectory() ? '/' : '';
        return `${e.name}${suffix}`;
      })
      .sort()
      .join('\n');
  }
}
```

- [ ] **Step 6: Implement FindFileTool**

Create `src/tools/FindFile.ts`:

```typescript
import { z } from 'zod';
import { glob } from 'glob';
import { BaseTool } from './BaseTool.js';

export class FindFileTool extends BaseTool<{ name: string; path?: string }, string> {
  name = 'FindFile';
  description = 'Find files by name recursively in a directory.';
  destructive = false;
  inputSchema = z.object({
    name: z.string().describe('File name or pattern to search for'),
    path: z.string().optional().describe('Directory to search in (default: cwd)'),
  });

  async call(input: { name: string; path?: string }): Promise<string> {
    const cwd = input.path ?? process.cwd();
    const matches = await glob(`**/${input.name}`, { cwd, nodir: true, ignore: 'node_modules/**' });
    return matches.sort().join('\n');
  }
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run test/tools/webDirTools.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/tools/WebFetch.ts src/tools/WebSearch.ts src/tools/ListDirectory.ts src/tools/FindFile.ts test/tools/webDirTools.test.ts
git commit -m "feat: add WebFetch, WebSearch, ListDirectory, FindFile tools"
```

---

### Task 11: Complete Tool Registry

**Files:**
- Modify: `src/tools/index.ts`
- Create: `test/tools/registry.test.ts`

- [ ] **Step 1: Write failing test**

Create `test/tools/registry.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getTools, getToolByName, getToolDefinitions } from '../src/tools/index.js';

describe('Tool Registry', () => {
  it('returns all 14 tools', () => {
    const tools = getTools();
    expect(tools.length).toBe(14);
  });

  it('finds a tool by name', () => {
    const tool = getToolByName('ReadFile');
    expect(tool).toBeDefined();
    expect(tool!.name).toBe('ReadFile');
  });

  it('returns undefined for unknown tool', () => {
    expect(getToolByName('NonExistent')).toBeUndefined();
  });

  it('generates tool definitions for all tools', () => {
    const defs = getToolDefinitions();
    expect(defs.length).toBe(14);
    for (const def of defs) {
      expect(def.type).toBe('function');
      expect(def.function.name).toBeTruthy();
      expect(def.function.description).toBeTruthy();
    }
  });

  it('has no duplicate tool names', () => {
    const names = getTools().map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/tools/registry.test.ts`
Expected: FAIL — only 0 tools registered

- [ ] **Step 3: Update tool registry with all tools**

Replace `src/tools/index.ts`:

```typescript
import type { BaseTool } from './BaseTool.js';
import { ReadFileTool } from './ReadFile.js';
import { WriteFileTool } from './WriteFile.js';
import { EditFileTool } from './EditFile.js';
import { BashTool } from './Bash.js';
import { GlobTool } from './Glob.js';
import { GrepTool } from './Grep.js';
import { GitStatusTool } from './GitStatus.js';
import { GitDiffTool } from './GitDiff.js';
import { GitLogTool } from './GitLog.js';
import { GitCommitTool } from './GitCommit.js';
import { WebFetchTool } from './WebFetch.js';
import { WebSearchTool } from './WebSearch.js';
import { ListDirectoryTool } from './ListDirectory.js';
import { FindFileTool } from './FindFile.js';

const tools: BaseTool<any, any>[] = [
  new ReadFileTool(),
  new WriteFileTool(),
  new EditFileTool(),
  new BashTool(),
  new GlobTool(),
  new GrepTool(),
  new GitStatusTool(),
  new GitDiffTool(),
  new GitLogTool(),
  new GitCommitTool(),
  new WebFetchTool(),
  new WebSearchTool(),
  new ListDirectoryTool(),
  new FindFileTool(),
];

export function getTools(): BaseTool<any, any>[] {
  return tools;
}

export function getToolByName(name: string): BaseTool<any, any> | undefined {
  return tools.find((t) => t.name === name);
}

export function getToolDefinitions() {
  return tools.map((t) => t.toToolDefinition());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/tools/registry.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/index.ts test/tools/registry.test.ts
git commit -m "feat: register all 14 tools in tool registry"
```

---

### Task 12: Conversation Manager

**Files:**
- Create: `src/core/conversation.ts`
- Create: `test/core/conversation.test.ts`

- [ ] **Step 1: Write failing test**

Create `test/core/conversation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Conversation } from '../src/core/conversation.js';
import type { Message } from '../src/core/types.js';

describe('Conversation', () => {
  it('starts with a system message', () => {
    const conv = new Conversation('You are helpful', 'test-model');
    const messages = conv.getMessages();
    expect(messages.length).toBe(1);
    expect(messages[0].role).toBe('system');
  });

  it('adds user messages', () => {
    const conv = new Conversation('system', 'model');
    conv.addUserMessage('hello');
    const messages = conv.getMessages();
    expect(messages.length).toBe(2);
    expect(messages[1]).toEqual({ role: 'user', content: 'hello' });
  });

  it('adds assistant messages', () => {
    const conv = new Conversation('system', 'model');
    conv.addAssistantMessage('hi there', undefined);
    expect(conv.getMessages().length).toBe(2);
    expect(conv.getMessages()[1].role).toBe('assistant');
  });

  it('adds tool results', () => {
    const conv = new Conversation('system', 'model');
    conv.addToolResult('call_1', 'result text');
    const last = conv.getMessages()[conv.getMessages().length - 1];
    expect(last.role).toBe('tool');
  });

  it('tracks estimated token count', () => {
    const conv = new Conversation('You are a helpful assistant', 'model');
    conv.addUserMessage('hello world');
    expect(conv.estimatedTokens()).toBeGreaterThan(0);
  });

  it('exports to SessionData', () => {
    const conv = new Conversation('system', 'test-model');
    conv.addUserMessage('hi');
    const session = conv.toSessionData('/tmp');
    expect(session.model).toBe('test-model');
    expect(session.messages.length).toBe(2);
    expect(session.cwd).toBe('/tmp');
    expect(session.id).toBeTruthy();
  });

  it('restores from SessionData', () => {
    const conv = new Conversation('system', 'test-model');
    conv.addUserMessage('hi');
    conv.addAssistantMessage('hello', undefined);
    const data = conv.toSessionData('/tmp');

    const restored = Conversation.fromSessionData(data);
    expect(restored.getMessages().length).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/conversation.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/core/conversation.ts`:

```typescript
import { randomUUID } from 'crypto';
import type { Message, ToolCall, SessionData } from './types.js';
import { estimateMessagesTokens } from '../utils/tokens.js';

export class Conversation {
  private messages: Message[] = [];
  private model: string;
  private id: string;

  constructor(systemPrompt: string, model: string, id?: string) {
    this.model = model;
    this.id = id ?? randomUUID();
    this.messages.push({ role: 'system', content: systemPrompt });
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  addUserMessage(content: string): void {
    this.messages.push({ role: 'user', content });
  }

  addAssistantMessage(content: string, toolCalls: ToolCall[] | undefined): void {
    const msg: Message = { role: 'assistant', content };
    if (toolCalls && toolCalls.length > 0) {
      (msg as any).tool_calls = toolCalls;
    }
    this.messages.push(msg);
  }

  addToolResult(toolCallId: string, content: string): void {
    this.messages.push({ role: 'tool', tool_call_id: toolCallId, content });
  }

  estimatedTokens(): number {
    return estimateMessagesTokens(this.messages);
  }

  toSessionData(cwd: string): SessionData {
    const now = new Date().toISOString();
    return {
      id: this.id,
      messages: this.getMessages(),
      model: this.model,
      cwd,
      createdAt: now,
      updatedAt: now,
    };
  }

  static fromSessionData(data: SessionData): Conversation {
    const systemMsg = data.messages.find((m) => m.role === 'system');
    const conv = new Conversation(
      systemMsg?.content ?? '',
      data.model,
      data.id,
    );
    // Replace the auto-created system message with actual messages
    conv.messages = [...data.messages];
    return conv;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/conversation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/conversation.ts test/core/conversation.test.ts
git commit -m "feat: add Conversation manager with session export/restore"
```

---

### Task 13: Session Persistence (History)

**Files:**
- Create: `src/utils/history.ts`
- Create: `test/core/history.test.ts`

- [ ] **Step 1: Write failing test**

Create `test/core/history.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { saveSession, loadSession, getLastSession, listSessions } from '../src/utils/history.js';
import type { SessionData } from '../src/core/types.js';

describe('history', () => {
  let tmpDir: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anver-hist-'));
    originalHome = process.env.ANVER_CODE_HOME;
    process.env.ANVER_CODE_HOME = tmpDir;
  });

  afterEach(() => {
    if (originalHome !== undefined) {
      process.env.ANVER_CODE_HOME = originalHome;
    } else {
      delete process.env.ANVER_CODE_HOME;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const makeSession = (id: string): SessionData => ({
    id,
    messages: [{ role: 'system', content: 'test' }],
    model: 'test-model',
    cwd: '/tmp',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  it('saves and loads a session', () => {
    const session = makeSession('sess-1');
    const filePath = saveSession(session);
    expect(fs.existsSync(filePath)).toBe(true);

    const loaded = loadSession(filePath);
    expect(loaded.id).toBe('sess-1');
    expect(loaded.messages).toHaveLength(1);
  });

  it('lists sessions', () => {
    saveSession(makeSession('a'));
    saveSession(makeSession('b'));
    const sessions = listSessions();
    expect(sessions.length).toBe(2);
  });

  it('gets the last session', () => {
    saveSession(makeSession('first'));
    saveSession(makeSession('second'));
    const last = getLastSession();
    expect(last).toBeDefined();
    expect(last!.id).toBe('second');
  });

  it('returns undefined when no sessions exist', () => {
    expect(getLastSession()).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/history.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/utils/history.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import { getConfigDir } from './config.js';
import type { SessionData } from '../core/types.js';

function getSessionsDir(): string {
  return path.join(getConfigDir(), 'sessions');
}

export function saveSession(session: SessionData): string {
  const dir = getSessionsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const fileName = `${session.id}.json`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2) + '\n');
  return filePath;
}

export function loadSession(filePath: string): SessionData {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as SessionData;
}

export function listSessions(): string[] {
  const dir = getSessionsDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(dir, f))
    .sort();
}

export function getLastSession(): SessionData | undefined {
  const sessions = listSessions();
  if (sessions.length === 0) return undefined;
  const lastPath = sessions[sessions.length - 1];
  return loadSession(lastPath);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/history.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/history.ts test/core/history.test.ts
git commit -m "feat: add session persistence with save/load/list"
```

---

### Task 14: System Prompt Builder

**Files:**
- Create: `src/utils/systemPrompt.ts`
- Create: `test/core/systemPrompt.test.ts`

- [ ] **Step 1: Write failing test**

Create `test/core/systemPrompt.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildSystemPrompt } from '../src/utils/systemPrompt.js';

describe('systemPrompt', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anver-prompt-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('includes base instructions', () => {
    const prompt = buildSystemPrompt(tmpDir);
    expect(prompt).toContain('coding assistant');
    expect(prompt).toContain('tool');
  });

  it('includes cwd', () => {
    const prompt = buildSystemPrompt(tmpDir);
    expect(prompt).toContain(tmpDir);
  });

  it('includes .anvercode if present', () => {
    fs.writeFileSync(path.join(tmpDir, '.anvercode'), 'Always use TypeScript.\n');
    const prompt = buildSystemPrompt(tmpDir);
    expect(prompt).toContain('Always use TypeScript');
  });

  it('works without .anvercode', () => {
    const prompt = buildSystemPrompt(tmpDir);
    expect(prompt).toBeTruthy();
    expect(prompt).not.toContain('.anvercode');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/systemPrompt.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/utils/systemPrompt.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import os from 'os';

export function buildSystemPrompt(cwd: string): string {
  const sections: string[] = [];

  sections.push(`You are Anver Code, an interactive coding assistant CLI. You help users with software engineering tasks by reading, writing, searching, and managing code.

You have access to tools for file operations, shell commands, git, and web search. Use them to accomplish tasks. When modifying code, read the file first. Prefer editing existing files over creating new ones. Be concise and direct.

# Tool Usage Rules
- Use ReadFile before editing a file you haven't seen
- Use EditFile for small changes, WriteFile for new files or full rewrites
- Use Bash for shell commands — always quote paths with spaces
- Destructive tools (WriteFile, EditFile, Bash, GitCommit) require user approval
- Prefer non-destructive tools (ReadFile, Glob, Grep) when just exploring`);

  sections.push(`# Environment
- Working directory: ${cwd}
- Platform: ${os.platform()}
- Shell: ${process.env.SHELL ?? '/bin/bash'}
- Date: ${new Date().toISOString().split('T')[0]}`);

  const anvercodePath = path.join(cwd, '.anvercode');
  if (fs.existsSync(anvercodePath)) {
    const content = fs.readFileSync(anvercodePath, 'utf-8').trim();
    sections.push(`# Project Instructions\n${content}`);
  }

  return sections.join('\n\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/systemPrompt.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/systemPrompt.ts test/core/systemPrompt.test.ts
git commit -m "feat: add system prompt builder with project config support"
```

---

### Task 15: Query Engine (Agentic Loop)

**Files:**
- Create: `src/core/query.ts`
- Create: `test/core/query.test.ts`

- [ ] **Step 1: Write failing test**

Create `test/core/query.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { QueryEngine } from '../src/core/query.js';
import type { LLMProvider, ChatParams } from '../src/core/provider.js';
import type { StreamChunk, ToolCall } from '../src/core/types.js';
import { Conversation } from '../src/core/conversation.js';
import type { BaseTool } from '../src/tools/BaseTool.js';
import { z } from 'zod';

// Mock provider that returns predetermined responses
function createMockProvider(responses: StreamChunk[][]): LLMProvider {
  let callIndex = 0;
  return {
    buildParams: (params: ChatParams) => params as any,
    async *chat(_params: ChatParams): AsyncIterable<StreamChunk> {
      const chunks = responses[callIndex] ?? [];
      callIndex++;
      for (const chunk of chunks) {
        yield chunk;
      }
    },
  };
}

// Mock tool
class EchoTool {
  name = 'Echo';
  description = 'Echoes input';
  destructive = false;
  inputSchema = z.object({ text: z.string() });
  async execute(input: unknown) {
    const parsed = this.inputSchema.parse(input);
    return parsed.text;
  }
  toToolDefinition() {
    return {
      type: 'function' as const,
      function: { name: 'Echo', description: 'Echoes input', parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
    };
  }
}

describe('QueryEngine', () => {
  it('handles a simple text response', async () => {
    const provider = createMockProvider([
      [
        { type: 'text_delta', content: 'Hello ' },
        { type: 'text_delta', content: 'world' },
        { type: 'done' },
      ],
    ]);

    const engine = new QueryEngine(provider, [], 'test-model');
    const conv = new Conversation('system', 'test-model');
    conv.addUserMessage('hi');

    const events: string[] = [];
    for await (const event of engine.run(conv)) {
      events.push(event.type);
      if (event.type === 'text') events.push(event.content);
    }

    expect(events).toContain('text');
    expect(events).toContain('Hello ');
    expect(events).toContain('world');
  });

  it('handles a tool call and loops back', async () => {
    const provider = createMockProvider([
      // First response: tool call
      [
        {
          type: 'tool_call_delta',
          tool_call: {
            id: 'call_1',
            type: 'function',
            function: { name: 'Echo', arguments: '{"text":"hello"}' },
          },
        },
        { type: 'done' },
      ],
      // Second response after tool result: text
      [
        { type: 'text_delta', content: 'Done!' },
        { type: 'done' },
      ],
    ]);

    const tools = [new EchoTool()];
    const engine = new QueryEngine(provider, tools as any, 'test-model');
    const conv = new Conversation('system', 'test-model');
    conv.addUserMessage('echo hello');

    const events: Array<{ type: string; [key: string]: any }> = [];
    for await (const event of engine.run(conv)) {
      events.push(event);
      // Auto-approve tools in test
      if (event.type === 'tool_pending') {
        event.approve();
      }
    }

    const types = events.map((e) => e.type);
    expect(types).toContain('tool_pending');
    expect(types).toContain('tool_result');
    expect(types).toContain('text');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/query.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/core/query.ts`:

```typescript
import type { LLMProvider } from './provider.js';
import type { ToolCall, StreamChunk } from './types.js';
import type { Conversation } from './conversation.js';
import type { BaseTool } from '../tools/BaseTool.js';

export type QueryEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_pending'; toolName: string; args: Record<string, unknown>; toolCallId: string; approve: () => void; deny: () => void }
  | { type: 'tool_running'; toolName: string; toolCallId: string }
  | { type: 'tool_result'; toolName: string; toolCallId: string; result: string }
  | { type: 'tool_error'; toolName: string; toolCallId: string; error: string }
  | { type: 'done' };

export class QueryEngine {
  private provider: LLMProvider;
  private tools: BaseTool<any, any>[];
  private toolMap: Map<string, BaseTool<any, any>>;
  private model: string;

  constructor(provider: LLMProvider, tools: BaseTool<any, any>[], model: string) {
    this.provider = provider;
    this.tools = tools;
    this.model = model;
    this.toolMap = new Map(tools.map((t) => [t.name, t]));
  }

  async *run(conversation: Conversation): AsyncGenerator<QueryEvent> {
    const toolDefs = this.tools.map((t) => t.toToolDefinition());
    let continueLoop = true;

    while (continueLoop) {
      continueLoop = false;
      const pendingToolCalls: ToolCall[] = [];
      let assistantContent = '';

      const stream = this.provider.chat({
        model: this.model,
        messages: conversation.getMessages(),
        tools: toolDefs.length > 0 ? toolDefs : undefined,
        stream: true,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'text_delta' && chunk.content) {
          assistantContent += chunk.content;
          yield { type: 'text', content: chunk.content };
        }

        if (chunk.type === 'tool_call_delta' && chunk.tool_call) {
          const tc = chunk.tool_call as ToolCall;
          pendingToolCalls.push(tc);
        }

        if (chunk.type === 'done') {
          // Add assistant message to conversation
          conversation.addAssistantMessage(
            assistantContent,
            pendingToolCalls.length > 0 ? pendingToolCalls : undefined,
          );

          if (pendingToolCalls.length > 0) {
            // Process tool calls
            for (const tc of pendingToolCalls) {
              const tool = this.toolMap.get(tc.function.name);
              if (!tool) {
                const errorMsg = `Unknown tool: ${tc.function.name}`;
                conversation.addToolResult(tc.id, errorMsg);
                yield { type: 'tool_error', toolName: tc.function.name, toolCallId: tc.id, error: errorMsg };
                continue;
              }

              let args: Record<string, unknown>;
              try {
                args = JSON.parse(tc.function.arguments);
              } catch {
                const errorMsg = `Invalid JSON arguments: ${tc.function.arguments}`;
                conversation.addToolResult(tc.id, errorMsg);
                yield { type: 'tool_error', toolName: tc.function.name, toolCallId: tc.id, error: errorMsg };
                continue;
              }

              // Permission check
              if (tool.destructive) {
                let approved = false;
                yield {
                  type: 'tool_pending',
                  toolName: tool.name,
                  args,
                  toolCallId: tc.id,
                  approve: () => { approved = true; },
                  deny: () => { approved = false; },
                };

                // Wait for approval — in the real UI this will be async,
                // but the approve/deny callbacks set the flag synchronously
                if (!approved) {
                  const denyMsg = 'Tool execution denied by user.';
                  conversation.addToolResult(tc.id, denyMsg);
                  yield { type: 'tool_error', toolName: tool.name, toolCallId: tc.id, error: denyMsg };
                  continue;
                }
              }

              yield { type: 'tool_running', toolName: tool.name, toolCallId: tc.id };

              try {
                const result = await tool.execute(args);
                const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
                conversation.addToolResult(tc.id, resultStr);
                yield { type: 'tool_result', toolName: tool.name, toolCallId: tc.id, result: resultStr };
              } catch (err: any) {
                const errorMsg = `Error: ${err.message}`;
                conversation.addToolResult(tc.id, errorMsg);
                yield { type: 'tool_error', toolName: tool.name, toolCallId: tc.id, error: errorMsg };
              }
            }

            // Loop back to get the next LLM response
            continueLoop = true;
            assistantContent = '';
          }
        }
      }
    }

    yield { type: 'done' };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/query.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/query.ts test/core/query.test.ts
git commit -m "feat: add QueryEngine with agentic tool loop"
```

---

### Task 16: UI Theme and Spinner

**Files:**
- Create: `src/ui/theme.ts`
- Create: `src/ui/Spinner.tsx`
- Create: `test/ui/Spinner.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `test/ui/Spinner.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Spinner } from '../src/ui/Spinner.js';

describe('Spinner', () => {
  it('renders model name', () => {
    const { lastFrame } = render(<Spinner model="gemini-pro" />);
    expect(lastFrame()).toContain('gemini-pro');
  });

  it('renders label when provided', () => {
    const { lastFrame } = render(<Spinner model="gemini-pro" label="Thinking" />);
    expect(lastFrame()).toContain('Thinking');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ui/Spinner.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Create theme**

Create `src/ui/theme.ts`:

```typescript
import chalk from 'chalk';

export const theme = {
  user: chalk.bold.white,
  assistant: chalk.white,
  toolName: chalk.dim.cyan,
  toolResult: chalk.dim,
  error: chalk.red,
  success: chalk.green,
  spinner: chalk.yellow,
  muted: chalk.dim,
  accent: chalk.cyan,
  border: chalk.dim.gray,
};
```

- [ ] **Step 4: Create Spinner component**

Create `src/ui/Spinner.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { theme } from './theme.js';

const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

interface SpinnerProps {
  model: string;
  label?: string;
}

export function Spinner({ model, label }: SpinnerProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((i) => (i + 1) % frames.length);
      setElapsed((e) => e + 80);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  const seconds = (elapsed / 1000).toFixed(1);
  const displayLabel = label ?? 'Thinking';

  return (
    <Text>
      {theme.spinner(frames[frameIndex])} {theme.muted(`${displayLabel}...`)} {theme.accent(model)} {theme.muted(`(${seconds}s)`)}
    </Text>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/ui/Spinner.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/ui/theme.ts src/ui/Spinner.tsx test/ui/Spinner.test.tsx
git commit -m "feat: add theme and Spinner UI component"
```

---

### Task 17: MessageList Component

**Files:**
- Create: `src/ui/MessageList.tsx`
- Create: `test/ui/MessageList.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `test/ui/MessageList.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { MessageList } from '../src/ui/MessageList.js';
import type { Message } from '../src/core/types.js';

describe('MessageList', () => {
  it('renders user messages', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello there' },
    ];
    const { lastFrame } = render(<MessageList messages={messages} />);
    expect(lastFrame()).toContain('Hello there');
  });

  it('renders assistant messages', () => {
    const messages: Message[] = [
      { role: 'assistant', content: 'Hi! How can I help?' },
    ];
    const { lastFrame } = render(<MessageList messages={messages} />);
    expect(lastFrame()).toContain('Hi! How can I help?');
  });

  it('renders tool result messages', () => {
    const messages: Message[] = [
      { role: 'tool', tool_call_id: 'call_1', content: 'file contents here' },
    ];
    const { lastFrame } = render(<MessageList messages={messages} />);
    expect(lastFrame()).toContain('file contents here');
  });

  it('skips system messages', () => {
    const messages: Message[] = [
      { role: 'system', content: 'secret system prompt' },
      { role: 'user', content: 'hello' },
    ];
    const { lastFrame } = render(<MessageList messages={messages} />);
    expect(lastFrame()).not.toContain('secret system prompt');
    expect(lastFrame()).toContain('hello');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ui/MessageList.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `src/ui/MessageList.tsx`:

```typescript
import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../core/types.js';
import { theme } from './theme.js';

interface MessageListProps {
  messages: Message[];
  streamingContent?: string;
}

function renderMessage(msg: Message, index: number) {
  switch (msg.role) {
    case 'system':
      return null; // Don't display system messages
    case 'user':
      return (
        <Box key={index} flexDirection="column" marginBottom={1}>
          <Text>{theme.accent('> ')}{theme.user(msg.content)}</Text>
        </Box>
      );
    case 'assistant': {
      const toolCalls = 'tool_calls' in msg ? (msg as any).tool_calls : undefined;
      return (
        <Box key={index} flexDirection="column" marginBottom={1}>
          <Text>{msg.content}</Text>
          {toolCalls?.map((tc: any, i: number) => (
            <Text key={i}>{theme.toolName(`  [Tool: ${tc.function.name}]`)}</Text>
          ))}
        </Box>
      );
    }
    case 'tool':
      return (
        <Box key={index} flexDirection="column" marginBottom={1}>
          <Text>{theme.toolResult(truncate(msg.content, 500))}</Text>
        </Box>
      );
  }
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + `\n... (${text.length} chars total)`;
}

export function MessageList({ messages, streamingContent }: MessageListProps) {
  return (
    <Box flexDirection="column">
      {messages.map((msg, i) => renderMessage(msg, i))}
      {streamingContent && (
        <Box marginBottom={1}>
          <Text>{streamingContent}</Text>
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/ui/MessageList.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/MessageList.tsx test/ui/MessageList.test.tsx
git commit -m "feat: add MessageList UI component"
```

---

### Task 18: InputPrompt and PermissionPrompt Components

**Files:**
- Create: `src/ui/InputPrompt.tsx`
- Create: `src/ui/PermissionPrompt.tsx`
- Create: `src/ui/ToolResult.tsx`

- [ ] **Step 1: Create InputPrompt**

Create `src/ui/InputPrompt.tsx`:

```typescript
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from './theme.js';

interface InputPromptProps {
  onSubmit: (text: string) => void;
  history: string[];
}

export function InputPrompt({ onSubmit, history }: InputPromptProps) {
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);

  useInput((ch, key) => {
    if (key.return) {
      if (input.trim()) {
        onSubmit(input.trim());
        setInput('');
        setHistoryIndex(-1);
      }
      return;
    }

    if (key.backspace || key.delete) {
      setInput((prev) => prev.slice(0, -1));
      return;
    }

    if (key.upArrow) {
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIndex);
      if (newIndex >= 0 && newIndex < history.length) {
        setInput(history[history.length - 1 - newIndex]);
      }
      return;
    }

    if (key.downArrow) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      if (newIndex < 0) {
        setInput('');
      } else {
        setInput(history[history.length - 1 - newIndex]);
      }
      return;
    }

    if (ch && !key.ctrl && !key.meta) {
      setInput((prev) => prev + ch);
    }
  });

  return (
    <Box>
      <Text>{theme.accent('> ')}{input}{theme.muted('█')}</Text>
    </Box>
  );
}
```

- [ ] **Step 2: Create PermissionPrompt**

Create `src/ui/PermissionPrompt.tsx`:

```typescript
import React from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from './theme.js';

interface PermissionPromptProps {
  toolName: string;
  args: Record<string, unknown>;
  onApprove: () => void;
  onDeny: () => void;
  onAlwaysApprove: () => void;
}

export function PermissionPrompt({ toolName, args, onApprove, onDeny, onAlwaysApprove }: PermissionPromptProps) {
  useInput((ch) => {
    if (ch === 'y' || ch === 'Y') onApprove();
    if (ch === 'n' || ch === 'N') onDeny();
    if (ch === 'a' || ch === 'A') onAlwaysApprove();
  });

  const argsStr = JSON.stringify(args, null, 2);
  const truncatedArgs = argsStr.length > 300 ? argsStr.slice(0, 300) + '...' : argsStr;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      <Text>{theme.spinner('⚠')} {theme.user(`Tool: ${toolName}`)}</Text>
      <Text>{theme.muted(truncatedArgs)}</Text>
      <Text>
        {theme.accent('[y]')}es  {theme.accent('[n]')}o  {theme.accent('[a]')}lways
      </Text>
    </Box>
  );
}
```

- [ ] **Step 3: Create ToolResult**

Create `src/ui/ToolResult.tsx`:

```typescript
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from './theme.js';

interface ToolResultProps {
  toolName: string;
  result: string;
  isError?: boolean;
}

export function ToolResult({ toolName, result, isError }: ToolResultProps) {
  const [expanded, setExpanded] = useState(false);
  const maxCollapsed = 200;
  const needsTruncation = result.length > maxCollapsed;
  const display = expanded || !needsTruncation ? result : result.slice(0, maxCollapsed) + '...';
  const icon = isError ? theme.error('✗') : theme.success('✓');

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>{icon} {theme.toolName(toolName)}</Text>
      <Text>{isError ? theme.error(display) : theme.toolResult(display)}</Text>
      {needsTruncation && !expanded && (
        <Text>{theme.muted(`  (${result.length} chars — expand with 'e')`)}</Text>
      )}
    </Box>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/ui/InputPrompt.tsx src/ui/PermissionPrompt.tsx src/ui/ToolResult.tsx
git commit -m "feat: add InputPrompt, PermissionPrompt, ToolResult components"
```

---

### Task 19: App Component (Root)

**Files:**
- Create: `src/ui/App.tsx`

- [ ] **Step 1: Write App component**

Create `src/ui/App.tsx`:

```typescript
import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { MessageList } from './MessageList.js';
import { InputPrompt } from './InputPrompt.js';
import { PermissionPrompt } from './PermissionPrompt.js';
import { Spinner } from './Spinner.js';
import { theme } from './theme.js';
import { QueryEngine, type QueryEvent } from '../core/query.js';
import { Conversation } from '../core/conversation.js';
import type { LLMProvider } from '../core/provider.js';
import type { Message } from '../core/types.js';
import type { BaseTool } from '../tools/BaseTool.js';
import { saveSession } from '../utils/history.js';

type AppState = 'idle' | 'streaming' | 'tool_pending' | 'tool_running';

interface AppProps {
  provider: LLMProvider;
  tools: BaseTool<any, any>[];
  model: string;
  systemPrompt: string;
  initialConversation?: Conversation;
  autoApprove: string[];
  cwd: string;
}

export function App({ provider, tools, model, systemPrompt, initialConversation, autoApprove, cwd }: AppProps) {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>('idle');
  const [messages, setMessages] = useState<Message[]>(
    initialConversation?.getMessages() ?? [{ role: 'system', content: systemPrompt }],
  );
  const [streamingContent, setStreamingContent] = useState('');
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [pendingTool, setPendingTool] = useState<{
    toolName: string;
    args: Record<string, unknown>;
    approve: () => void;
    deny: () => void;
  } | null>(null);

  const conversationRef = React.useRef<Conversation>(
    initialConversation ?? new Conversation(systemPrompt, model),
  );

  const processQuery = useCallback(async () => {
    const engine = new QueryEngine(provider, tools, model);
    setState('streaming');
    setStreamingContent('');

    let currentText = '';

    for await (const event of engine.run(conversationRef.current)) {
      switch (event.type) {
        case 'text':
          currentText += event.content;
          setStreamingContent(currentText);
          break;

        case 'tool_pending': {
          const isAutoApproved = autoApprove.includes(event.toolName);
          if (isAutoApproved) {
            event.approve();
          } else {
            setState('tool_pending');
            setPendingTool({
              toolName: event.toolName,
              args: event.args,
              approve: event.approve,
              deny: event.deny,
            });
            // Wait for user input — the component will re-render
            await new Promise<void>((resolve) => {
              const checkInterval = setInterval(() => {
                // This is a simplified approach; in production use events
                resolve();
                clearInterval(checkInterval);
              }, 100);
            });
          }
          break;
        }

        case 'tool_running':
          setState('tool_running');
          break;

        case 'tool_result':
        case 'tool_error':
          break;

        case 'done':
          setState('idle');
          setStreamingContent('');
          setMessages(conversationRef.current.getMessages());
          // Auto-save session
          saveSession(conversationRef.current.toSessionData(cwd));
          break;
      }
    }
  }, [provider, tools, model, autoApprove, cwd]);

  const handleSubmit = useCallback((text: string) => {
    // Handle slash commands
    if (text === '/exit' || text === '/quit') {
      exit();
      return;
    }
    if (text === '/clear') {
      conversationRef.current = new Conversation(systemPrompt, model);
      setMessages(conversationRef.current.getMessages());
      return;
    }
    if (text === '/help') {
      // Show help inline
      return;
    }

    setInputHistory((prev) => [...prev, text]);
    conversationRef.current.addUserMessage(text);
    setMessages(conversationRef.current.getMessages());
    processQuery();
  }, [processQuery, systemPrompt, model, exit]);

  const handleApprove = useCallback(() => {
    if (pendingTool) {
      pendingTool.approve();
      setPendingTool(null);
      setState('tool_running');
    }
  }, [pendingTool]);

  const handleDeny = useCallback(() => {
    if (pendingTool) {
      pendingTool.deny();
      setPendingTool(null);
      setState('streaming');
    }
  }, [pendingTool]);

  const handleAlwaysApprove = useCallback(() => {
    if (pendingTool) {
      autoApprove.push(pendingTool.toolName);
      pendingTool.approve();
      setPendingTool(null);
      setState('tool_running');
    }
  }, [pendingTool, autoApprove]);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text>{theme.accent('Anver Code')} {theme.muted(`(${model})`)}</Text>
      </Box>

      <MessageList messages={messages} streamingContent={state === 'streaming' ? streamingContent : undefined} />

      {state === 'streaming' && !streamingContent && (
        <Spinner model={model} />
      )}

      {state === 'tool_running' && (
        <Spinner model={model} label="Running tool" />
      )}

      {state === 'tool_pending' && pendingTool && (
        <PermissionPrompt
          toolName={pendingTool.toolName}
          args={pendingTool.args}
          onApprove={handleApprove}
          onDeny={handleDeny}
          onAlwaysApprove={handleAlwaysApprove}
        />
      )}

      {state === 'idle' && (
        <InputPrompt onSubmit={handleSubmit} history={inputHistory} />
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/App.tsx
git commit -m "feat: add root App component with state machine and query orchestration"
```

---

### Task 20: CLI Commands (config, init)

**Files:**
- Create: `src/commands/config.ts`
- Create: `src/commands/init.ts`
- Create: `src/commands/chat.ts`

- [ ] **Step 1: Create config command**

Create `src/commands/config.ts`:

```typescript
import { Command } from 'commander';
import { loadConfig, saveConfig, getConfigValue, setConfigValue } from '../utils/config.js';

export function configCommand() {
  const cmd = new Command('config')
    .description('Manage Anver Code configuration');

  cmd
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action((key: string, value: string) => {
      if (key === 'autoApprove') {
        setConfigValue(key as any, value.split(','));
      } else {
        setConfigValue(key as any, value);
      }
      console.log(`Set ${key} = ${value}`);
    });

  cmd
    .command('get <key>')
    .description('Get a configuration value')
    .action((key: string) => {
      const val = getConfigValue(key as any);
      if (val === undefined) {
        console.log(`${key} is not set`);
      } else {
        console.log(`${key} = ${Array.isArray(val) ? val.join(', ') : val}`);
      }
    });

  cmd
    .command('list')
    .description('Show all configuration')
    .action(() => {
      const config = loadConfig();
      const display = { ...config, apiKey: config.apiKey ? '***' : '(not set)' };
      console.log(JSON.stringify(display, null, 2));
    });

  return cmd;
}
```

- [ ] **Step 2: Create init command**

Create `src/commands/init.ts`:

```typescript
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';

export function initCommand() {
  return new Command('init')
    .description('Initialize a project with .anvercode config')
    .action(() => {
      const cwd = process.cwd();
      const filePath = path.join(cwd, '.anvercode');

      if (fs.existsSync(filePath)) {
        console.log('.anvercode already exists');
        return;
      }

      const template = `# Anver Code Project Instructions
# Add project-specific instructions here.
# These will be included in the system prompt.

# Example:
# - Always use TypeScript
# - Follow existing code patterns
# - Write tests for new features
`;

      fs.writeFileSync(filePath, template);
      console.log(`Created ${filePath}`);
    });
}
```

- [ ] **Step 3: Create chat command**

Create `src/commands/chat.ts`:

```typescript
import React from 'react';
import { render } from 'ink';
import { App } from '../ui/App.js';
import { OpenRouterProvider } from '../core/provider.js';
import { Conversation } from '../core/conversation.js';
import { getTools } from '../tools/index.js';
import { loadConfig } from '../utils/config.js';
import { buildSystemPrompt } from '../utils/systemPrompt.js';
import { getLastSession } from '../utils/history.js';

interface ChatOptions {
  model?: string;
  resume?: boolean;
  session?: string;
}

export function launchChat(options: ChatOptions, initialPrompt?: string) {
  const config = loadConfig();
  const model = options.model ?? config.model;
  const apiKey = config.apiKey;

  if (!apiKey) {
    console.error('No API key configured. Run: anver config set apiKey <your-openrouter-key>');
    process.exit(1);
  }

  const provider = new OpenRouterProvider(apiKey);
  const tools = getTools();
  const cwd = process.cwd();
  const systemPrompt = buildSystemPrompt(cwd);

  let initialConversation: Conversation | undefined;

  if (options.resume) {
    const lastSession = getLastSession();
    if (lastSession) {
      initialConversation = Conversation.fromSessionData(lastSession);
      console.log(`Resumed session ${lastSession.id}`);
    }
  }

  if (!initialConversation) {
    initialConversation = new Conversation(systemPrompt, model);
    if (initialPrompt) {
      initialConversation.addUserMessage(initialPrompt);
    }
  }

  const { waitUntilExit } = render(
    <App
      provider={provider}
      tools={tools}
      model={model}
      systemPrompt={systemPrompt}
      initialConversation={initialConversation}
      autoApprove={[...config.autoApprove]}
      cwd={cwd}
    />
  );

  waitUntilExit();
}
```

- [ ] **Step 4: Commit**

```bash
git add src/commands/config.ts src/commands/init.ts src/commands/chat.ts
git commit -m "feat: add config, init, and chat CLI commands"
```

---

### Task 21: CLI Entry Point

**Files:**
- Create: `bin/anver.ts`

- [ ] **Step 1: Write the entry point**

Create `bin/anver.ts`:

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { configCommand } from '../src/commands/config.js';
import { initCommand } from '../src/commands/init.js';
import { launchChat } from '../src/commands/chat.js';

const program = new Command()
  .name('anver')
  .description('Anver Code — AI coding assistant powered by free LLMs')
  .version('0.1.0')
  .option('-m, --model <model>', 'Override default model')
  .option('-r, --resume', 'Resume last session')
  .option('-s, --session <path>', 'Load a specific session')
  .option('-v, --verbose', 'Show debug output')
  .argument('[prompt...]', 'Initial prompt')
  .action((promptParts: string[], options) => {
    const prompt = promptParts.length > 0 ? promptParts.join(' ') : undefined;
    launchChat(
      {
        model: options.model,
        resume: options.resume,
        session: options.session,
      },
      prompt,
    );
  });

program.addCommand(configCommand());
program.addCommand(initCommand());

program.parse();
```

- [ ] **Step 2: Verify build works**

```bash
cd ~/anver-code && npx tsup
```

Expected: Build succeeds, outputs `dist/bin/anver.js`

- [ ] **Step 3: Verify CLI runs**

```bash
node dist/bin/anver.js --help
```

Expected: Shows help text with options and commands

- [ ] **Step 4: Commit**

```bash
git add bin/anver.ts
git commit -m "feat: add CLI entry point with Commander.js"
```

---

### Task 22: Build and Link

- [ ] **Step 1: Update tsup config for full project**

Replace `tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['bin/anver.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['ink', 'react'],
  banner: {
    js: '#!/usr/bin/env node',
  },
  noExternal: [/^(?!ink|react)/],
});
```

- [ ] **Step 2: Build**

```bash
cd ~/anver-code && npx tsup
```

Expected: Build succeeds

- [ ] **Step 3: Link globally**

```bash
cd ~/anver-code && npm link
```

- [ ] **Step 4: Verify CLI is accessible**

```bash
anver --version
```

Expected: `0.1.0`

```bash
anver --help
```

Expected: Shows full help text

- [ ] **Step 5: Commit**

```bash
git add tsup.config.ts
git commit -m "feat: finalize build config and global link"
```

---

### Task 23: Run All Tests

- [ ] **Step 1: Run full test suite**

```bash
cd ~/anver-code && npx vitest run
```

Expected: All tests pass

- [ ] **Step 2: Run lint check**

```bash
cd ~/anver-code && npx tsc --noEmit
```

Expected: No type errors

- [ ] **Step 3: Fix any issues found**

If tests or types fail, fix them before proceeding.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "fix: resolve test and type issues"
```

---

### Task 24: End-to-End Smoke Test

- [ ] **Step 1: Set API key**

```bash
anver config set apiKey <your-openrouter-key>
```

- [ ] **Step 2: Test config commands**

```bash
anver config list
anver config get model
```

Expected: Shows config with default model

- [ ] **Step 3: Test init command**

```bash
cd /tmp && mkdir anver-test && cd anver-test && anver init
```

Expected: Creates `.anvercode` file

- [ ] **Step 4: Test interactive mode**

```bash
anver "what files are in this directory?"
```

Expected: Launches Ink UI, model uses ListDirectory or Bash tool, shows results

- [ ] **Step 5: Test session resume**

```bash
anver --resume
```

Expected: Resumes previous conversation

- [ ] **Step 6: Commit final state**

```bash
cd ~/anver-code && git add -A && git commit -m "chore: complete MVP implementation"
```
