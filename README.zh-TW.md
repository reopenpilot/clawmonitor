[English](README.md) · [简体中文](README.zh-CN.md) · **繁體中文**

---

# ClawMonitor

即時 OpenClaw tool call 監控器。

## 安裝

```bash
npx clawmonitor
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
