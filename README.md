**[English](README.md)** · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

---

# ClawMonitor

Real-time OpenClaw tool call monitor.

## Install

```bash
npx clawmonitor
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
