# Anver Code

An AI coding assistant CLI powered by free LLMs through [OpenRouter](https://openrouter.ai). Inspired by Claude Code — built from scratch with TypeScript, React Ink, and a tool-use agentic loop.

## Features

- **Agentic tool loop** — the model reads files, writes code, runs shell commands, searches the web, and manages git — all in an iterative loop until the task is done
- **14 built-in tools** — file I/O, shell, git, glob/grep search, web fetch/search, directory listing
- **Permission system** — destructive tools (write, edit, bash, commit) require approval; non-destructive tools auto-run
- **Skill system** — extend the CLI with custom prompt-based (`.md`) or code-based (`.ts`) skills, loaded from global and per-project directories
- **Session persistence** — conversations are saved and can be resumed with `--resume`
- **Project context** — drop a `.anvercode` file in your project root to give the model persistent instructions
- **Free by default** — ships with `qwen/qwen3.6-plus-preview:free` via OpenRouter, swap to any model with `--model` or config

## Quick Start

```bash
# Clone and build
git clone https://github.com/adikaevanver/anver-code.git
cd anver-code
npm install
npm run build

# Set your OpenRouter API key
./dist/anver.js config set apiKey YOUR_KEY

# Start chatting
./dist/anver.js "fix the bug in auth.ts"
```

Or install globally:

```bash
npm link
anver "add error handling to the API route"
```

## Usage

```bash
# Interactive mode
anver

# With an initial prompt
anver "refactor the database module"

# Override model
anver -m meta-llama/llama-4-maverick:free "explain this codebase"

# Resume last session
anver --resume

# Load a specific session
anver --session ~/.anver-code/sessions/abc123.json
```

### Model Compatibility

Anver Code requires a model that supports **function calling (tool use)** through OpenRouter's API. The agentic loop sends tool definitions to the model and expects structured tool call responses back — without this, the model can't read files, write code, run commands, or use any tools.

**Known compatible free models:**
- `qwen/qwen3.6-plus-preview:free` (default)

**Will NOT work with** models that don't support function calling — they'll either error out or only chat without using tools.

You can browse available models with tool support at [openrouter.ai/models](https://openrouter.ai/models) (filter by "tool use").

### Slash Commands (in-session)

| Command | Action |
|---------|--------|
| `/help` | Show available commands and skills |
| `/clear` | Reset the conversation |
| `/exit` | Exit the CLI |
| `/<skill>` | Run a custom skill |

## Tools

| Tool | Description | Approval |
|------|-------------|----------|
| `read_file` | Read files with line numbers | Auto |
| `write_file` | Write/create files | Required |
| `edit_file` | Replace exact strings in files | Required |
| `bash` | Execute shell commands | Required |
| `glob` | Find files by pattern | Auto |
| `grep` | Search file contents | Auto |
| `git_status` | Show working tree status | Auto |
| `git_diff` | Show file diffs | Auto |
| `git_log` | Show commit history | Auto |
| `git_commit` | Create a commit | Required |
| `web_fetch` | Fetch URL content | Auto |
| `web_search` | DuckDuckGo search | Auto |
| `list_directory` | List directory contents | Auto |
| `find_file` | Find files by name recursively | Auto |

## Skills

Skills extend the CLI with custom commands. Two types:

### Prompt Skills (`.md`)

Markdown files with YAML frontmatter. The body is injected as a prompt when triggered via `/<name>`.

```markdown
---
name: commit
description: Create a well-formatted git commit
---

Analyze all staged and unstaged changes. Draft a concise commit message
focusing on the "why". Stage relevant files and create the commit.
```

### Code Skills (`.ts`)

TypeScript files that export a class extending `BaseTool`. They register as tools the model can call directly.

```typescript
import { z } from 'zod';
import { BaseTool } from '../../src/tools/BaseTool.js';

export default class DeployTool extends BaseTool<{ env: string }, string> {
  name = 'deploy';
  description = 'Deploy to a specified environment';
  destructive = true;
  inputSchema = z.object({
    env: z.string().describe('Target environment'),
  });

  async call(input: { env: string }): Promise<string> {
    // deployment logic
    return `Deployed to ${input.env}`;
  }
}
```

### Skill Directories

| Location | Scope |
|----------|-------|
| `~/.anver-code/skills/` | Global — available in all projects |
| `.anver-code/skills/` | Project — available only in this directory |

Project skills override global skills with the same name.

### Managing Skills

```bash
# List loaded skills
anver skill list

# Create a new prompt skill (project-local)
anver skill create review

# Create a global code skill
anver skill create deploy --type code --location global
```

You can also create skills conversationally while in the CLI — just ask the model to create one and it will write the file. New skills are available immediately without restarting.

## Configuration

Stored at `~/.anver-code/config.json`. Manage via CLI:

```bash
anver config set apiKey sk-or-...
anver config set model meta-llama/llama-4-maverick:free
anver config get model
anver config list
```

| Key | Default | Description |
|-----|---------|-------------|
| `apiKey` | — | OpenRouter API key (or set `OPENROUTER_API_KEY` env var) |
| `model` | `qwen/qwen3.6-plus-preview:free` | Default model |
| `theme` | `default` | UI theme |
| `autoApprove` | Read-only tools | Tools that skip approval prompts |

### Project Instructions

Create a `.anvercode` file in your project root:

```
Always use TypeScript with strict mode.
Prefer functional patterns over classes.
Run tests with: npm test
```

This is injected into the system prompt for every conversation in that directory.

## Architecture

```
bin/anver.ts          CLI entry point (Commander.js)
src/
  commands/           CLI subcommands (chat, config, init, skill)
  core/
    provider.ts       OpenRouter LLM provider (openai-compatible SDK)
    query.ts          Agentic tool loop (async generator)
    conversation.ts   Message history + session persistence
    types.ts          Shared types
  tools/              14 built-in tools extending BaseTool
  skills/             Skill loader + types
  ui/                 React Ink components (App, MessageList, InputPrompt, etc.)
  utils/              System prompt builder, config, history, tokens
```

## Development

```bash
npm run dev          # Watch mode build
npm test             # Run tests (vitest)
npm run test:watch   # Watch mode tests
npm run lint         # Type check (tsc --noEmit)
npm run build        # Production build (tsup)
```

## License

MIT
