# Anver Code — Matrix UI Redesign

## Goal

Transform Anver Code's terminal UI from a plain text interface into a full Matrix-themed experience — green-on-black, falling Katakana rain, box-drawing borders, cinematic startup splash, and cohesive hacker aesthetic across every component.

## Design Decisions

- **Aesthetic:** The Matrix (1999) — black background, phosphor green, Katakana rain
- **Rendering:** Pure React Ink — no raw ANSI escape sequences, no second rendering system
- **Rain engine:** Shared component used by startup splash (full-screen) and thinking state (compact 3-5 rows)
- **Rain characters:** Classic Katakana (U+30A0–U+30FF)
- **Startup:** ~3 second cinematic splash with character-by-character logo decode, skippable with any keypress
- **Scope:** Full overhaul of all 7 UI elements — theme, rain, splash, messages, input, spinner, permissions, tool display, header

## Color Theme

| Role              | Color          | Hex       |
|-------------------|----------------|-----------|
| Primary text      | Bright green   | `#00ff41` |
| Secondary text    | Medium green   | `#008f11` |
| Dim/muted         | Dark green     | `#003b00` |
| User input        | Bright green bold | `#00ff41` |
| Accent (labels, borders) | Green  | `#00ff41` |
| Error             | Red            | `#ff0000` |
| Warning/permission | Yellow-green  | `#adff2f` |
| Background        | Terminal default black | — |

All existing chalk colors (cyan, white, dim gray) are replaced. Everything is green spectrum except errors (red) and permissions (yellow-green).

## Components

### 1. MatrixRain

Shared rain engine used by startup splash and thinking indicator.

**Props:**
- `columns: number` — terminal width (from `process.stdout.columns`)
- `rows: number` — how many rows to fill
- `active: boolean` — start/stop animation
- `onComplete?: () => void` — callback when a timed sequence finishes

**Behavior:**
- One column per terminal character column
- Each column drops at a random speed (staggered start)
- Characters: random Katakana from U+30A0–U+30FF, refreshed each tick
- Head character is bright green (`#00ff41`), trail fades through medium green (`#008f11`) to dark green (`#003b00`), then blank
- Tick rate: ~100ms `setInterval` updating state
- Renders as `<Box flexDirection="column">` with rows of `<Text>`, each character colored by fade position

### 2. StartupSplash

Full-screen cinematic intro on launch.

**Flow:**
1. App mounts → `<StartupSplash>` renders instead of chat UI
2. Matrix rain fills the screen for ~2 seconds
3. Rain slows, ASCII logo "decodes" in center — each character position starts as random Katakana, rapid-cycles through 5-8 random chars, then settles on the correct letter (left-to-right stagger)
4. Below logo: model name and version fade in (dim green)
5. After ~3 seconds total OR any keypress → `onComplete` fires → splash unmounts, chat UI mounts

**ASCII Logo:**
```
 █████╗ ███╗   ██╗██╗   ██╗███████╗██████╗
██╔══██╗████╗  ██║██║   ██║██╔════╝██╔══██╗
███████║██╔██╗ ██║██║   ██║█████╗  ██████╔╝
██╔══██║██║╚██╗██║╚██╗ ██╔╝██╔══╝  ██╔══██╗
██║  ██║██║ ╚████║ ╚████╔╝ ███████╗██║  ██║
╚═╝  ╚═╝╚═╝  ╚═══╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝
```

Rendered in bright `#00ff41`. The decode effect cycles each position through random Katakana before landing on the final character.

**Component structure:**
```
<StartupSplash onComplete={fn}>
  <MatrixRain />           ← background rain
  <CenteredLogo />         ← logo decoding overlay
  <Text dim>"press any key"</Text>
</StartupSplash>
```

`useInput` catches any keypress → immediate skip to `onComplete`.

**Skip conditions:** If `--resume` flag is passed or user provides an initial prompt, skip the splash entirely.

### 3. AppHeader

Persistent single-line header at top of chat UI.

```
╸ANVER CODE╺━━━━━━━━━━━━━━━━━━━━ qwen3.6-plus ━━ tokens: 1.2k
```

- `ANVER CODE` in bright green
- Separator lines in dim green
- Model name and token count in medium green on the right
- Token count updates after each exchange

### 4. MessageList (redesigned)

**User messages:**
```
┌─[YOU]──────────────────────────────
│ refactor the auth module
└────────────────────────────────────
```
Bright green text, box-drawing borders in dim green, `[YOU]` label in bright green bold.

**Assistant messages:**
```
┌─[ANVER]────────────────────────────
│ I'll restructure the authentication
│ into separate concerns...
└────────────────────────────────────
```
Medium green text, `[ANVER]` label in bright green. Markdown still stripped via `stripMarkdown`.

**Tool results (compact one-liners between message boxes):**
```
 ✓ read_file src/auth.ts (0.3s)
 ✗ bash "npm test" (error)
```
`✓` bright green, `✗` red, tool name medium green, args dim green. No box borders — lightweight.

### 5. InputPrompt (redesigned)

```
[anver]>> █
```

- `[anver]` in dim green
- `>>` in bright green
- Blinking block cursor: `setInterval` toggling visibility every 500ms
- History navigation (up/down) preserved

### 6. Thinking Indicator (replaces Spinner)

When `appState === 'streaming'`, render compact `<MatrixRain>` — same engine as startup but constrained to 3-5 rows, full terminal width. Below the rain:

```
⟩ Thinking... qwen3.6-plus (2.1s)
```

`⟩` and model name in bright green, label and time in dim green. When response starts streaming, rain stops and text replaces it.

### 7. PermissionPrompt (redesigned)

```
╔══[ACCESS REQUESTED]════════════════╗
║ Tool: write_file                   ║
║ Path: src/auth.ts                  ║
║                                    ║
║  [Y] APPROVE  [N] DENY  [A] ALWAYS║
╚════════════════════════════════════╝
```

Double-line box-drawing in yellow-green (`#adff2f`). Tool args shown inside, truncated if long. Key options in bright green.

### 8. Tool Execution Display

When `appState === 'tool_running'`:
```
 ▶ EXECUTING read_file ████░░░░░░ src/auth.ts
```

`▶` bright green, `EXECUTING` bright green bold, tool name medium green, indeterminate progress bar (filled blocks shift back and forth), primary arg in dim green.

On completion, collapses to the compact one-liner:
```
 ✓ read_file src/auth.ts (0.3s)
```

## Overall Layout

```
┌──────────────────────────────────────────┐
│ ╸ANVER CODE╺━━━━━ qwen3.6-plus ━━ 1.2k  │  ← header (always visible)
│                                          │
│ ┌─[YOU]────────────────────────          │  ← messages
│ │ your message                           │
│ └────────────────────────────            │
│ ┌─[ANVER]──────────────────────          │
│ │ response text                          │
│ └────────────────────────────            │
│  ✓ read_file src/auth.ts                 │  ← tool results
│                                          │
│ ╣╣╣ カミセハ ╣╣╣                         │  ← thinking rain (if streaming)
│ ⟩ Thinking... qwen3.6-plus (2.1s)       │
│                                          │
│ [anver]>> █                              │  ← input prompt (if idle)
└──────────────────────────────────────────┘
```

## Files

| File | Action | Description |
|------|--------|-------------|
| `src/ui/theme.ts` | Modify | Full Matrix green palette replacing all current colors |
| `src/ui/MatrixRain.tsx` | Create | Shared rain engine component |
| `src/ui/StartupSplash.tsx` | Create | Cinematic splash with logo decode |
| `src/ui/AppHeader.tsx` | Create | Persistent top header bar |
| `src/ui/MessageList.tsx` | Modify | Box-drawing borders, role labels, green colors |
| `src/ui/InputPrompt.tsx` | Modify | `[anver]>>` prompt, blinking cursor |
| `src/ui/Spinner.tsx` | Modify | Replace braille with compact MatrixRain + status line |
| `src/ui/PermissionPrompt.tsx` | Modify | Double-line box, ACCESS REQUESTED styling |
| `src/ui/ToolResult.tsx` | Modify | Animated execution bar + compact completion |
| `src/ui/App.tsx` | Modify | Add splash state, header, wire new components |

## Constraints

- Pure React Ink — no raw ANSI, no second rendering system
- Rain animation at ~100ms tick rate (practical Ink re-render limit)
- Terminal dimensions from `process.stdout.columns` / `process.stdout.rows`
- No new npm dependencies — chalk is already available
- Splash skippable via any keypress, or skipped entirely with `--resume` / initial prompt
