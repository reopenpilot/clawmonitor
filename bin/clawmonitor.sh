#!/usr/bin/env bash
# clawmonitor — Real-time OpenClaw tool call monitor
#
# Usage:
#   clawmonitor              # Default: last 30 min sessions + 10 history
#   clawmonitor --all        # Monitor all sessions
#   clawmonitor --compact    # Compact output
#   clawmonitor --history N  # Show N recent tool calls
#
# npx clawmonitor            # Run without installing

set -euo pipefail

# === Platform detection ===
OS="$(uname -s 2>/dev/null || echo "unknown")"
ARCH="$(uname -m 2>/dev/null || echo "unknown")"

IS_WINDOWS=false
if [[ "$OS" == "MINGW"* || "$OS" == "MSYS"* || "$OS" == "CYGWIN"* ]]; then
  IS_WINDOWS=true
fi

# === Detect OpenClaw data directory ===
if [[ -n "${OPENCLAW_HOME:-}" ]]; then
  AGENTS_DIR="$OPENCLAW_HOME/agents"
elif [[ -d "$HOME/.openclaw/agents" ]]; then
  AGENTS_DIR="$HOME/.openclaw/agents"
elif [[ -n "${XDG_DATA_HOME:-}" ]] && [[ -d "$XDG_DATA_HOME/openclaw/agents" ]]; then
  AGENTS_DIR="$XDG_DATA_HOME/openclaw/agents"
elif [[ "$IS_WINDOWS" == "true" ]] && [[ -d "$APPDATA/openclaw/agents" ]]; then
  AGENTS_DIR="$APPDATA/openclaw/agents"
else
  echo "❌ Cannot find OpenClaw data directory."
  echo ""
  echo "   Tried:"
  echo "     - \$OPENCLAW_HOME/agents"
  echo "     - ~/.openclaw/agents"
  echo "     - \$XDG_DATA_HOME/openclaw/agents"
  if [[ "$IS_WINDOWS" == "true" ]]; then
    echo "     - %APPDATA%/openclaw/agents"
  fi
  echo ""
  echo "   Set OPENCLAW_HOME to your OpenClaw data directory."
  exit 1
fi

# === Check dependencies ===
MISSING=()
for cmd in jq tail date; do
  if ! command -v "$cmd" &>/dev/null; then
    MISSING+=("$cmd")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "❌ Missing required commands: ${MISSING[*]}"
  echo ""
  echo "   Install them:"
  echo ""
  if [[ "$IS_WINDOWS" == "true" ]]; then
    echo "   🪟 Windows (Git Bash / MSYS2):"
    echo "     pacman -S jq"
    echo ""
    echo "   Or use WSL:"
    echo "     sudo apt install jq"
  elif [[ "$OS" == "Darwin" ]]; then
    echo "   🍎 macOS:"
    echo "     brew install jq"
    echo ""
    echo "   No Homebrew? Install it first:"
    echo "     /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
  else
    echo "   🐧 Linux:"
    echo "     sudo apt install jq        # Debian/Ubuntu"
    echo "     sudo dnf install jq        # Fedora"
    echo "     sudo pacman -S jq          # Arch"
    echo "     sudo apk add jq            # Alpine"
  fi
  echo ""
  echo "   jq is the only external dependency. tail and date are usually pre-installed."
  exit 1
fi

# === Cross-platform helpers ===

# Get file modification time (HH:MM:SS)
get_mod_time() {
  local file="$1"
  if [[ "$OS" == "Darwin" ]]; then
    stat -f '%Sm' -t '%H:%M:%S' "$file" 2>/dev/null || echo "???"
  elif [[ "$IS_WINDOWS" == "true" ]]; then
    stat -c '%y' "$file" 2>/dev/null | cut -c12-19 || echo "???"
  else
    stat -c '%y' "$file" 2>/dev/null | cut -c12-19 || echo "???"
  fi
}

# Format ISO timestamp → HH:MM:SS
format_timestamp() {
  local ts="$1"
  if [[ -z "$ts" || "$ts" == "null" || "$ts" == "???" ]]; then
    echo "???"
    return
  fi

  if [[ "$OS" == "Darwin" ]]; then
    if date -j -f "%Y-%m-%dT%H:%M:%S" "$(echo "$ts" | cut -c1-19)" "+%H:%M:%S" 2>/dev/null; then
      return
    fi
    echo "$ts" | cut -c12-19
  else
    date -d "$ts" "+%H:%M:%S" 2>/dev/null || echo "$ts" | cut -c12-19
  fi
}

# Portable grep (no -P on macOS)
grep_p() {
  if [[ "$OS" == "Darwin" ]]; then
    grep -E "$@"
  else
    grep -P "$@"
  fi
}

# === Argument parsing ===
COMPACT=false
SHOW_HISTORY=false
HISTORY_N=10
TIME_RANGE=30  # minutes, 0 = all

while [[ $# -gt 0 ]]; do
  case "$1" in
    --compact)
      COMPACT=true
      shift
      ;;
    --history)
      SHOW_HISTORY=true
      if [[ $# -gt 1 ]] && [[ "$2" =~ ^[0-9]+$ ]]; then
        HISTORY_N="$2"
        shift 2
      else
        shift
      fi
      ;;
    --all)
      TIME_RANGE=0
      shift
      ;;
    --help|-h)
      echo "clawmonitor — Real-time OpenClaw tool call monitor"
      echo ""
      echo "Usage: clawmonitor [options]"
      echo ""
      echo "  --all       Monitor all sessions (no time filter)"
      echo "  --compact   Show only tool name + brief args"
      echo "  --history   Show recent history before live tail"
      echo "  --history N Show last N tool calls from history (default: 10)"
      echo "  --help      Show this help"
      echo ""
      echo "  Monitors all agents under ~/.openclaw/agents/"
      echo "  Supports Linux, macOS, and Windows (Git Bash / WSL)"
      echo ""
      echo "  Environment variables:"
      echo "    OPENCLAW_HOME  Custom OpenClaw data directory"
      echo "    NO_COLOR       Disable colored output"
      exit 0
      ;;
    [0-9]*)
      if $SHOW_HISTORY; then
        HISTORY_N="$1"
        shift
      else
        echo "Unknown argument: $1"
        exit 1
      fi
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

# === Color setup ===
if [[ -t 1 ]] && [[ "${NO_COLOR:-}" == "" ]]; then
  RST='\033[0m' BLD='\033[1m' DIM='\033[2m'
  CYN='\033[36m' GRN='\033[32m' YLW='\033[33m' MAG='\033[35m' RED='\033[31m'
  BLU='\033[34m' WHT='\033[37m'
else
  RST='' BLD='' DIM=''
  CYN='' GRN='' YLW='' MAG='' RED=''
  BLU='' WHT=''
fi

# === Session management ===

find_sessions() {
  local find_cmd=(find "$AGENTS_DIR" -path "*/sessions/*.jsonl" -type f)
  if [[ "$TIME_RANGE" -eq 0 ]]; then
    "${find_cmd[@]}"
  else
    local now_epoch
    now_epoch=$(date +%s)

    "${find_cmd[@]}" | while IFS= read -r file; do
      local mod_epoch
      if [[ "$OS" == "Darwin" ]]; then
        mod_epoch=$(stat -f '%m' "$file" 2>/dev/null || echo 0)
      else
        mod_epoch=$(stat -c '%Y' "$file" 2>/dev/null || echo 0)
      fi

      if [[ "$mod_epoch" -gt 0 ]] && (( now_epoch - mod_epoch <= TIME_RANGE * 60 )); then
        echo "$file"
      fi
    done
  fi
}

# Extract readable session name from conversation_label
get_session_label() {
  local file="$1"
  local agent_name
  agent_name=$(echo "$file" | sed "s|$AGENTS_DIR/||;s|/sessions/.*||")

  local filename
  filename=$(basename "$file" .jsonl)

  local conv_label
  conv_label=$(jq -r 'select(.type=="message" and .message.role=="user") |
    .message.content[] | select(.type=="text") | .text' "$file" 2>/dev/null | \
    head -20 | \
    grep_p -o '"conversation_label"[[:space:]]*:[[:space:]]*"[^"]*"' 2>/dev/null | head -1 | \
    sed 's/"conversation_label" : "//;s/"conversation_label": "//;s/"$//')

  if [[ -n "$conv_label" ]]; then
    local group topic group_name
    group=$(echo "$conv_label" | grep_p -o 'id:[^ ]+' 2>/dev/null | sed 's/id://')
    topic=$(echo "$conv_label" | grep_p -o 'topic:[0-9]+' 2>/dev/null | sed 's/topic:/t/')
    group_name=$(echo "$conv_label" | grep_p -o '^[^ ]+' 2>/dev/null)

    if [[ -n "$topic" ]]; then
      echo "${agent_name}/${group_name}/${topic}"
    elif [[ -n "$group_name" ]]; then
      echo "${agent_name}/${group_name}"
    else
      echo "${agent_name}/${conv_label}"
    fi
  else
    local short_id topic_suffix
    short_id=$(echo "$filename" | sed 's/-topic-[0-9]*$//;s/-\([0-9a-f]\{4\}\).*/..*\1/')
    topic_suffix=$(echo "$filename" | grep_p -o 'topic-[0-9]+' 2>/dev/null || true)
    if [[ -n "$topic_suffix" ]]; then
      echo "${agent_name}/DM/${topic_suffix}"
    else
      echo "${agent_name}/DM/${short_id}"
    fi
  fi
}

# Session label store (portable: works on bash 3.2+ / macOS)
# Uses a temp file as key\0value pairs instead of associative arrays
LABEL_STORE=$(mktemp /tmp/clawmonitor-labels.XXXXXX)
trap 'rm -f "$LABEL_STORE"' EXIT

_label_set() {
  local key="$1" val="$2"
  grep -v "^${key}"$'\t' "$LABEL_STORE" > "${LABEL_STORE}.tmp" 2>/dev/null || true
  printf '%s\t%s\n' "$key" "$val" >> "${LABEL_STORE}.tmp"
  mv "${LABEL_STORE}.tmp" "$LABEL_STORE"
}

_label_get() {
  local key="$1"
  local result
  result=$(grep "^${key}"$'\t' "$LABEL_STORE" 2>/dev/null | head -1 | cut -f2-)
  echo "${result:-$2}"
}

cache_labels() {
  local files="$1"
  for f in $files; do
    local key
    key=$(basename "$f")
    _label_set "$key" "$(get_session_label "$f")"
  done
}

# Extract tool calls from a single session JSONL
extract_tool_calls() {
  local file="$1"
  local limit="${2:-0}"
  local filename
  filename=$(basename "$file")

  local filter='select(.type=="message" and .message.role=="assistant") |
    {ts: (.timestamp // .message.timestamp), file: "'"${filename}"'", content: [.message.content[] | select(.type=="toolCall")]} |
    select(.content | length > 0)'

  if [[ "$limit" -gt 0 ]]; then
    jq -c "$filter" "$file" 2>/dev/null | tail -"$limit"
  else
    jq -c "$filter" "$file" 2>/dev/null
  fi
}

# Format a single tool call entry
format_tc() {
  local json="$1"
  local ts filename label
  ts=$(echo "$json" | jq -r '.ts // "???"')
  filename=$(echo "$json" | jq -r '.file // "?"')
  label=$(_label_get "$filename" "$filename")

  local time_str
  time_str=$(format_timestamp "$ts")

  echo "$json" | jq -c '.content[]' 2>/dev/null | while IFS= read -r tc; do
    local tool_name tool_id
    tool_name=$(echo "$tc" | jq -r '.name // "?"')
    tool_id=$(echo "$tc" | jq -r '.id // "?"' | cut -c1-12)

    if $COMPACT; then
      local brief_args
      brief_args=$(echo "$tc" | jq -r '
        .arguments | to_entries[:2] |
        map("\(.key)=\(.value | tostring | .[0:80])") | join(" ")
      ' 2>/dev/null)
      printf "${GRN}%-13s${RST} ${BLU}%-28s${RST} ${CYN}%-9s${RST} %s\n" \
        "$tool_name" "${label:0:28}" "$time_str" "$brief_args"
    else
      printf "\n${BLD}${YLW}⏱ %s${RST}  ${BLU}%s${RST}  ${MAG}%s${RST}\n" \
        "$time_str" "${label}" "$tool_id"
      printf "  ${GRN}▶ %s${RST}\n" "$tool_name"

      echo "$tc" | jq -c '.arguments | to_entries[]' 2>/dev/null | while IFS= read -r entry; do
        local key val
        key=$(echo "$entry" | jq -r '.key')
        val=$(echo "$entry" | jq -r '.value | tostring | .[0:300]')
        [[ ${#val} -ge 300 ]] && val="${val}…"
        printf "    ${CYN}%-14s${RST} %s\n" "$key" "$val"
      done
    fi
  done
}

# === Main ===

sessions=$(find_sessions | sort)
session_count=$(echo "$sessions" | grep -c . 2>/dev/null || echo 0)

if [[ "$session_count" -eq 0 ]]; then
  echo -e "${RED}No sessions found under ${AGENTS_DIR}${RST}"
  echo "Try --all or wait for activity."
  exit 1
fi

cache_labels "$sessions"

echo -e "${BLD}🔧 OpenClaw Tool Call Monitor${RST}"
echo -e "${DIM}Watching ${session_count} session(s) on ${OS} — Ctrl+C to stop${RST}"
echo ""

# List all sessions
echo -e "${BLD}📋 Active sessions:${RST}"
for f in $sessions; do
  filename=$(basename "$f")
  label=$(_label_get "$filename" "$filename")
  mod_time=$(get_mod_time "$f")
  printf "  ${DIM}%-9s${RST} ${BLU}%-35s${RST} ${DIM}(last: %s)${RST}\n" \
    "$(echo "$filename" | cut -c1-8)" "${label:0:35}" "$mod_time"
done

if $COMPACT; then
  printf "\n${DIM}%-13s %-28s %-9s %s${RST}\n" "TOOL" "SESSION" "TIME" "ARGS"
  echo "-------------------------------------------------------------------------"
fi

# Default: show last 10 history entries
if ! $SHOW_HISTORY; then
  SHOW_HISTORY=true
fi

# Show history sorted by time
if $SHOW_HISTORY; then
  echo -e "\n${BLD}📜 Recent tool calls (sorted by time):${RST}"
  for f in $sessions; do
    extract_tool_calls "$f" 0
  done | jq -s 'sort_by(.ts)' | jq -c '.[]' > /tmp/openclaw-tc-history.jsonl

  if [[ "$HISTORY_N" -gt 0 ]]; then
    tail -"$HISTORY_N" /tmp/openclaw-tc-history.jsonl | while IFS= read -r line; do
      format_tc "$line"
    done
  else
    cat /tmp/openclaw-tc-history.jsonl | while IFS= read -r line; do
      format_tc "$line"
    done
  fi
  rm -f /tmp/openclaw-tc-history.jsonl

  echo -e "\n${BLD}🔴 Live monitoring:${RST}"
  if $COMPACT; then
    echo "-------------------------------------------------------------------------"
  fi
fi

# Live monitoring with glob pattern for auto-tracking new sessions
SESSIONS_GLOB="${AGENTS_DIR}/*/sessions/*.jsonl"
shopt -s nullglob
live_session_files=("$AGENTS_DIR"/*/sessions/*.jsonl)
shopt -u nullglob

tail -F -n 0 $SESSIONS_GLOB 2>/dev/null | {
  current_file=""
  if [[ "${#live_session_files[@]}" -eq 1 ]]; then
    current_file="${live_session_files[0]}"
  fi
  while IFS= read -r line; do
    # Detect tail -F file switch header
    if [[ "$line" == "==>"* ]]; then
      current_file=$(echo "$line" | sed 's/==> \(.*\) <==/\1/')
      continue
    fi

    # Quick filter
    echo "$line" | grep -q '"toolCall"' || continue
    echo "$line" | grep -q '"assistant"' || continue

    filename=$(basename "${current_file}")
    # Dynamic label lookup for new sessions
    if [[ -z "$(_label_get "$filename" "")" ]]; then
      _label_set "$filename" "$(get_session_label "${current_file}")"
    fi
    label=$(_label_get "$filename" "$filename")

    ts=$(echo "$line" | jq -r '.timestamp // .message.timestamp // "???"' 2>/dev/null)
    time_str=$(format_timestamp "$ts")

    echo "$line" | jq -c '.message.content[] | select(.type=="toolCall")' 2>/dev/null | while IFS= read -r tc; do
      tool_name=$(echo "$tc" | jq -r '.name // "?"')
      tool_id=$(echo "$tc" | jq -r '.id // "?"' | cut -c1-12)

      if $COMPACT; then
        brief_args=$(echo "$tc" | jq -r '
          .arguments | to_entries[:2] |
          map("\(.key)=\(.value | tostring | .[0:80])") | join(" ")
        ' 2>/dev/null)
        printf "${GRN}%-13s${RST} ${BLU}%-28s${RST} ${CYN}%-9s${RST} %s\n" \
          "$tool_name" "${label:0:28}" "$time_str" "$brief_args"
      else
        printf "\n${BLD}${YLW}⏱ %s${RST}  ${BLU}%s${RST}  ${MAG}%s${RST}\n" \
          "$time_str" "${label}" "$tool_id"
        printf "  ${GRN}▶ %s${RST}\n" "$tool_name"

        echo "$tc" | jq -c '.arguments | to_entries[]' 2>/dev/null | while IFS= read -r entry; do
          key=$(echo "$entry" | jq -r '.key')
          val=$(echo "$entry" | jq -r '.value | tostring | .[0:300]')
          [[ ${#val} -ge 300 ]] && val="${val}…"
          printf "    ${CYN}%-14s${RST} %s\n" "$key" "$val"
        done
      fi
    done
  done
}
