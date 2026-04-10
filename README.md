**[English](README.md)** · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

---

# ClawMonitor

Real-time OpenClaw tool call monitor. Watch all agent sessions with readable names and sorted output.

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

# Install globally
npm install -g clawmonitor
clawmonitor
```

## Features

- 🔧 Real-time monitoring of all OpenClaw agent tool calls
- 📜 Shows last 10 history entries on startup (cross-session, sorted by time)
- 📋 Readable session names (auto-parsed from conversation_label)
- 🔄 Auto-tracks newly created sessions
- 🎨 Colored terminal output (respects `NO_COLOR`)
- 🖥️ Cross-platform: Linux, macOS, Windows (Git Bash / WSL)

## Usage

```
clawmonitor [options]

Options:
  --all        Monitor all sessions (no time filter)
  --compact    Compact one-line output
  --history N  Show last N history entries (default: 10)
  --help       Show help
```

## Examples

```bash
# Default: last 30 min sessions + 10 history
clawmonitor

# Compact mode with 20 history entries
clawmonitor --compact --history 20

# Monitor all sessions regardless of time
clawmonitor --all
```

## Requirements

- **jq** — the only external dependency
  - Linux: `sudo apt install jq`
  - macOS: `brew install jq`
  - Windows: `pacman -S jq` (Git Bash) or use WSL

Everything else (`tail`, `date`, `bash`) comes pre-installed.

## Environment Variables

| Variable | Description |
|---|---|
| `OPENCLAW_HOME` | Custom OpenClaw data directory |
| `NO_COLOR` | Disable colored output |

## Development

```bash
git clone https://github.com/reopenpilot/clawmonitor.git
cd clawmonitor
bash bin/clawmonitor.sh --help
```

## License

MIT
