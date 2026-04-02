# In-Session Skill Creation — Design Spec

**Date:** 2026-04-02
**Status:** Approved

## Overview

Let users create new skills conversationally while inside the CLI. The model uses its existing WriteFile tool to create `.md` skill files, guided by system prompt instructions. After a skill file is written, the app auto-reloads the skill list so the new `/name` slash command is immediately available.

## Changes

### 1. System Prompt — Skill Creation Instructions

Add a "Creating Skills" section to `buildSystemPrompt` (appended only when the skills system is active, i.e. `skills` param is provided). Teaches the model:

- Skill file format: YAML frontmatter (`name`, `description`) + prompt body
- Two directories: global (`~/.anver-code/skills/`) and project-local (`.anver-code/skills/`)
- Default to project-local unless user requests global
- Use existing WriteFile tool to create the file
- Inform user the skill is available via `/name` after creation

### 2. Auto-Reload in App

- Convert `promptSkills` from a prop-only value to React state (initialized from the prop)
- After any `tool_result` event, check if the completed tool was `WriteFile` and if the file path is inside a skills directory
- If match: call `loadSkills(cwd)`, update `promptSkills` state
- Slash commands and help text update immediately; system prompt is not rebuilt mid-session (model already knows the format)

### Non-Goals

- No filesystem watcher
- No dedicated CreateSkill tool
- No system prompt rebuild mid-session
- No hot-reload for code skills (only prompt `.md` skills)
