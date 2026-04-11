[English](README.md) · **简体中文** · [繁體中文](README.zh-TW.md)

---

# ClawMonitor

实时 OpenClaw tool call 监控器。

## 为什么需要？

OpenClaw 是强大的个人 AI 助手，但缺乏内置方式实时观察 agent 实际在做什么。调试 prompt、优化工具使用、理解 agent 行为时，只能凭猜测。

**ClawMonitor 补足了这个缺口。** 实时、统一地呈现所有 agent 和 session 的 tool call。

- OpenClaw 只显示最终回应，看不到背后的 tool calls
- Session logs 是原始 JSONL — 难读且非实时
- ClawMonitor 让 agent 行为透明化：哪些工具被调用、带什么参数、跨哪些 session，按时间排序

## 安装

```bash
# 不安装直接运行
npx clawmonitor

# 或全局安装
npm install -g clawmonitor
clawmonitor
```

## 功能

- 🔧 实时监控所有 session 的 tool calls
- 🎨 现代化 TUI 卡片布局 + JSON 语法高亮
- 📜 启动时显示最近历史，跨 session 按时间排序
- 🔄 自动发现新建的 session
- 📋 自动解析可读的 session 名称
- 🖥️ 跨平台 — Linux、macOS、Windows
- 📦 零依赖 — 只需 Node.js 18+

## 使用

```
clawmonitor [options]

  --all        监控所有 session（不限时间）
  --compact    精简一行输出
  --history N  显示最近 N 条历史（默认：10）
  --full       完整显示输入输出（不截断）
  --help       显示帮助
```

## 环境变量

| 变量 | 说明 |
|---|---|
| `OPENCLAW_HOME` | 自定义 OpenClaw 数据目录 |
| `NO_COLOR` | 禁用彩色输出 |

## 许可

MIT
