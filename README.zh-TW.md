[English](README.md) · [简体中文](README.zh-CN.md) · **繁體中文**

---

# ClawMonitor

即時 OpenClaw tool call 監控器。

## 為什麼需要？

OpenClaw 是強大的個人 AI 助手，但缺乏內建方式即時觀察 agent 實際在做什麼。除錯 prompt、優化工具使用、理解 agent 行為時，只能憑猜測。

**ClawMonitor 補足了這個缺口。** 即時、統一地呈現所有 agent 和 session 的 tool call。

- OpenClaw 只顯示最終回應，看不到背後的 tool calls
- Session logs 是原始 JSONL — 難讀且非即時
- ClawMonitor 讓 agent 行為透明化：哪些工具被呼叫、帶什麼參數、跨哪些 session，按時間排序

## 安裝

```bash
# 不安裝直接跑
npx clawmonitor

# 或全域安裝
npm install -g clawmonitor
clawmonitor
```

## 功能

- 🔧 即時監控所有 session 的 tool calls
- 🎨 現代化 TUI 卡片佈局 + JSON 語法高亮
- 📜 啟動時顯示最近歷史，跨 session 按時間排序
- 🔄 自動發現新建的 session
- 📋 自動解析可讀的 session 名稱
- 🖥️ 跨平台 — Linux、macOS、Windows
- 📦 零依賴 — 只需 Node.js 18+

## 使用

```
clawmonitor [options]

  --all        監控所有 session（不限時間）
  --compact    精簡一行輸出
  --history N  顯示最近 N 筆歷史（預設：10）
  --full       完整顯示輸入輸出（不截斷）
  --help       顯示說明
```

## 環境變數

| 變數 | 說明 |
|---|---|
| `OPENCLAW_HOME` | 自訂 OpenClaw 資料目錄 |
| `NO_COLOR` | 停用彩色輸出 |

## 授權

MIT
