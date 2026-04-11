[English](README.md) · **简体中文** · [繁體中文](README.zh-TW.md)

---

# ClawMonitor

实时 OpenClaw tool call 监控器。

## 安装

```bash
npx clawmonitor
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
