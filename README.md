**[English](README.md)** · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

---

# ClawMonitor

Real-time OpenClaw tool call monitor.

## Why?

OpenClaw is a powerful personal AI assistant, but it lacks a built-in way to observe what your agents are actually doing in real time. When debugging prompts, optimizing tool usage, or just understanding agent behavior, you're left guessing.

**ClawMonitor fills that gap.** It gives you a live, unified view of every tool call across all agents and sessions — something OpenClaw should have but doesn't.

- OpenClaw shows you the final response, but not the tool calls behind it
- OpenClaw's session logs exist, but they're raw JSONL — hard to read and not real-time
- ClawMonitor makes agent behavior transparent: what tools are called, with what arguments, across which sessions, all sorted chronologically

## Install

```bash
# Run without installing
npx clawmonitor

# Or install globally
npm install -g clawmonitor
clawmonitor
```

## Features

- 🔧 Real-time monitoring of all agent tool calls across all sessions
- 🎨 Modern TUI with card layout and JSON syntax highlighting
- 📜 History on startup — last N entries, cross-session, sorted by time
- 🔄 Auto-discovers new sessions as they're created
- 📋 Readable session names parsed from labels
- 🖥️ Cross-platform — works on Linux, macOS, Windows
- 📦 Zero dependencies — only needs Node.js 18+

## Usage

```
clawmonitor [options]

  --all        Monitor all sessions (no time filter)
  --compact    Compact one-line output
  --history N  Show last N history entries (default: 10)
  --full       Show full input/output (no truncation)
  --help       Show help
```

## Environment Variables

| Variable | Description |
|---|---|
| `OPENCLAW_HOME` | Custom OpenClaw data directory |
| `NO_COLOR` | Disable colored output |

## License

MIT
