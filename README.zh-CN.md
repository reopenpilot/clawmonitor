[English](README.md) · **[简体中文](README.zh-CN.md)** · [繁體中文](README.zh-TW.md)

---

# ClawMonitor

实时监控 OpenClaw 所有 agent 的 tool calls，跨 session、按时间排序。

## 为什么需要它？

OpenClaw 是强大的个人 AI 助手，但缺少一个关键功能：**实时观察 agent 在做什么**。调试提示词、优化工具使用、理解 agent 行为时，你只能猜测。

**ClawMonitor 填补了这个空白。** 它提供跨所有 agent 和 session 的实时工具调用视图——这是 OpenClaw 应该有却没有的功能。

- OpenClaw 只显示最终回复，看不到背后的工具调用过程
- OpenClaw 的 session 日志是原始 JSONL，难以阅读，也不是实时的
- ClawMonitor 让 agent 行为透明化：调用了什么工具、传了什么参数、来自哪个 session，按时间排序一目了然

## 安装

```bash
# 无需安装直接运行
npx clawmonitor

# 全局安装
npm install -g clawmonitor
clawmonitor
```

## 功能

- 🔧 实时监控所有 OpenClaw agent 的 tool calls
- 📜 启动时显示最近 10 条历史记录（跨 session，按时间排序）
- 📋 可读的 session 名称（自动解析 conversation_label）
- 🔄 自动追踪新建的 session
- 🎨 彩色终端输出（支持 `NO_COLOR` 环境变量）
- 🖥️ 跨平台：Linux、macOS、Windows（Git Bash / WSL）

## 使用方法

```
clawmonitor [选项]

选项:
  --all        监控所有 session（不限时间）
  --compact    精简一行输出
  --history N  显示最近 N 条历史记录（默认 10）
  --help       显示帮助
```

## 示例

```bash
# 默认：最近 30 分钟的 session + 10 条历史
clawmonitor

# 精简模式，显示 20 条历史
clawmonitor --compact --history 20

# 监控所有 session（不限时间）
clawmonitor --all
```

## 依赖

- **jq** — 唯一的外部依赖
  - Linux: `sudo apt install jq`
  - macOS: `brew install jq`
  - Windows: `pacman -S jq`（Git Bash）或使用 WSL

其他（`tail`、`date`、`bash`）系统自带。

## 环境变量

| 变量 | 说明 |
|---|---|
| `OPENCLAW_HOME` | 自定义 OpenClaw 数据目录 |
| `NO_COLOR` | 禁用彩色输出 |

## 开发

```bash
git clone https://github.com/reopenpilot/clawmonitor.git
cd clawmonitor
bash bin/clawmonitor.sh --help
```

## 许可证

MIT
