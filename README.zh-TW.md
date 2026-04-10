[English](README.md) · [简体中文](README.zh-CN.md) · **[繁體中文](README.zh-TW.md)**

---

# ClawMonitor

即時監控 OpenClaw 所有 agent 的 tool calls，跨 session、按時間排序。

## 為什麼需要它？

OpenClaw 是強大的個人 AI 助手，但缺少一個關鍵功能：**即時觀察 agent 在做什麼**。除錯提示詞、最佳化工具使用、理解 agent 行為時，你只能猜測。

**ClawMonitor 填補了這個空白。** 它提供跨所有 agent 和 session 的即時工具呼叫檢視——這是 OpenClaw 應該有卻沒有的功能。

- OpenClaw 只顯示最終回覆，看不到背後的工具呼叫過程
- OpenClaw 的 session 日誌是原始 JSONL，難以閱讀，也不是即時的
- ClawMonitor 讓 agent 行為透明化：呼叫了什麼工具、傳了什麼參數、來自哪個 session，按時間排序一目瞭然

## 安裝

```bash
# 不用安裝直接跑
npx clawmonitor

# 全域安裝
npm install -g clawmonitor
clawmonitor
```

## 功能

- 🔧 即時監控所有 OpenClaw agent 的 tool calls
- 📜 啟動時顯示最近 10 筆歷史記錄（跨 session，按時間排序）
- 📋 可讀的 session 名稱（自動解析 conversation_label）
- 🔄 自動追蹤新建的 session
- 🎨 彩色終端機輸出（支援 `NO_COLOR` 環境變數）
- 🖥️ 跨平台：Linux、macOS、Windows（Git Bash / WSL）

## 使用方式

```
clawmonitor [選項]

選項:
  --all        監控所有 session（不限時間）
  --compact    精簡一行輸出
  --history N  顯示最近 N 筆歷史記錄（預設 10）
  --help       顯示說明
```

## 範例

```bash
# 預設：最近 30 分鐘的 session + 10 筆歷史
clawmonitor

# 精簡模式，顯示 20 筆歷史
clawmonitor --compact --history 20

# 監控所有 session（不限時間）
clawmonitor --all
```

## 依賴

- **jq** — 唯一的外部依賴
  - Linux: `sudo apt install jq`
  - macOS: `brew install jq`
  - Windows: `pacman -S jq`（Git Bash）或使用 WSL

其他（`tail`、`date`、`bash`）系統內建。

## 環境變數

| 變數 | 說明 |
|---|---|
| `OPENCLAW_HOME` | 自訂 OpenClaw 資料目錄 |
| `NO_COLOR` | 停用彩色輸出 |

## 開發

```bash
git clone https://github.com/reopenpilot/clawmonitor.git
cd clawmonitor
bash bin/clawmonitor.sh --help
```

## 授權

MIT
