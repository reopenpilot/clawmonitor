#!/usr/bin/env node
// clawmonitor — Real-time OpenClaw tool call monitor
// Zero dependencies. Node.js >= 20.

const fs = require('fs');
const path = require('path');
const os = require('os');

// === Args ===
const argv = process.argv.slice(2);
const opts = { compact: argv.includes('--compact'), full: argv.includes('--full'), history: 10 };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--history') { opts.history = parseInt(argv[i + 1]) || 10; i++; }
  else if (argv[i] === '--help' || argv[i] === '-h') {
    console.log(`clawmonitor — Real-time OpenClaw tool call monitor

Usage: clawmonitor [options]

  --compact    Compact one-line output
  --history N  Show last N history entries (default: 10)
  --full       Show full input/output (no truncation)
  --help       Show this help

Environment:
  OPENCLAW_HOME  Custom OpenClaw data directory
  NO_COLOR       Disable colored output`);
    process.exit(0);
  }
}

// === Theme ===
const NC = process.env.NO_COLOR || !process.stdout.isTTY;
const T = NC ? {
  s: (v) => v,
  r: (s) => s, g: (s) => s, y: (s) => s, b: (s) => s,
  m: (s) => s, c: (s) => s, w: (s) => s, x: (s) => s,
  d: (s) => s, bd: (s) => s,
  ok: (s) => s, err: (s) => s, tag: (s) => s,
  badge: (name) => ` ${name} `,
} : {
  s: (v) => v,
  // Foregrounds (call as functions)
  r: (s) => `\x1b[31m${s}\x1b[0m`,
  g: (s) => `\x1b[32m${s}\x1b[0m`,
  y: (s) => `\x1b[33m${s}\x1b[0m`,
  b: (s) => `\x1b[34m${s}\x1b[0m`,
  m: (s) => `\x1b[35m${s}\x1b[0m`,
  c: (s) => `\x1b[36m${s}\x1b[0m`,
  w: (s) => `\x1b[37m${s}\x1b[0m`,
  x: (s) => `\x1b[90m${s}\x1b[0m`,       // gray
  d: (s) => `\x1b[2m${s}\x1b[0m`,        // dim
  bd: (s) => `\x1b[1m${s}\x1b[0m`,       // bold
  // Badges
  // Badges — no emoji, pure ASCII for predictable width
  ok: NC ? (s) => s : (s) => `\x1b[42m\x1b[30m ${s} \x1b[0m`,
  err: NC ? (s) => s : (s) => `\x1b[41m\x1b[97m ${s} \x1b[0m`,
  tag: NC ? (s) => `<${s}>` : (s) => `\x1b[48;5;237m\x1b[37m<${s}>\x1b[0m`,
  badge: NC
    ? (name) => ` ${name} `
    : (name) => {
        const map = {
          exec: '\x1b[48;5;22m', read: '\x1b[48;5;24m', write: '\x1b[48;5;52m',
          edit: '\x1b[48;5;58m', web_search: '\x1b[48;5;28m', web_fetch: '\x1b[48;5;25m',
          browser: '\x1b[48;5;23m', message: '\x1b[48;5;55m', tts: '\x1b[48;5;54m',
          memory_search: '\x1b[48;5;26m', gateway: '\x1b[48;5;60m',
        };
        return `${map[name] || '\x1b[48;5;237m'}\x1b[37m ${name} \x1b[0m`;
      },
};

// === OpenClaw dir ===
function findDir() {
  for (const d of [
    process.env.OPENCLAW_HOME && path.join(process.env.OPENCLAW_HOME, 'agents'),
    path.join(os.homedir(), '.openclaw', 'agents'),
    process.env.XDG_DATA_HOME && path.join(process.env.XDG_DATA_HOME, 'openclaw', 'agents'),
    process.platform === 'win32' && process.env.APPDATA && path.join(process.env.APPDATA, 'openclaw', 'agents'),
  ].filter(Boolean)) {
    if (fs.existsSync(d)) return d;
  }
  console.error(`Cannot find OpenClaw data directory. Set OPENCLAW_HOME.`);
  process.exit(1);
}

const DIR = findDir();
const TIME = 0;

// === Sessions ===
function findSessions() {
  const now = Date.now(), out = [];
  if (!fs.existsSync(DIR)) return out;
  for (const ag of fs.readdirSync(DIR)) {
    const sd = path.join(DIR, ag, 'sessions');
    if (!fs.existsSync(sd)) continue;
    for (const f of fs.readdirSync(sd)) {
      if (!f.endsWith('.jsonl')) continue;
      const fp = path.join(sd, f);
      try {
        const st = fs.statSync(fp);
        if (TIME > 0 && (now - st.mtimeMs) > TIME * 6e4) continue;
        out.push(fp);
      } catch {}
    }
  }
  return out.sort();
}

function getLabel(fp) {
  const ag = path.relative(DIR, fp).split(path.sep)[0];
  const bn = path.basename(fp, '.jsonl');
  try {
    for (const ln of fs.readFileSync(fp, 'utf8').split('\n').slice(0, 80)) {
      if (!ln.trim()) continue;
      try {
        const o = JSON.parse(ln);
        if (o.type === 'message' && o.message?.role === 'user') {
          for (const t of (o.message.content?.filter(c => c.type === 'text') || [])) {
            const m = t.text?.match(/"conversation_label"\s*:\s*"([^"]+)"/);
            if (m) {
              const l = m[1], tp = l.match(/topic:(\d+)/)?.[1], gn = l.split(' ')[0];
              if (tp) return `${ag}/${gn}/t${tp}`;
              if (gn) return `${ag}/${gn}`;
            }
          }
        }
      } catch {}
    }
  } catch {}
  return `${ag}/DM/${bn.replace(/-topic-\d+$/, '').replace(/-([0-9a-f]{4}).*/, '..*$1')}`;
}

// === Extract & Pair ===
function extract(fp) {
  const out = [], fn = path.basename(fp);
  let data;
  try { data = fs.readFileSync(fp, 'utf8'); } catch { return out; }
  for (const ln of data.split('\n')) {
    if (!ln.trim()) continue;
    let o; try { o = JSON.parse(ln); } catch { continue; }
    if (o.type !== 'message' || !o.timestamp) continue;
    if (o.message.role === 'assistant') {
      for (const tc of (o.message.content || []).filter(c => c.type === 'toolCall'))
        out.push({ ts: o.timestamp, file: fn, role: 'call', id: tc.id, name: tc.name, args: tc.arguments || {} });
    } else if (o.message.role === 'toolResult') {
      const t = o.message.content?.[0]?.text || '';
      out.push({ ts: o.timestamp, file: fn, role: 'result', id: o.message.toolCallId, name: o.message.toolName, result: typeof t === 'string' ? t : JSON.stringify(t) });
    }
  }
  return out;
}

function pair(entries) {
  entries.sort((a, b) => a.ts.localeCompare(b.ts));
  const p = {}, out = [];
  for (const e of entries) {
    if (e.role === 'call') p[e.id] = e;
    else if (e.role === 'result' && p[e.id]) {
      out.push({ ...p[e.id], result: e.result, rts: e.ts });
      delete p[e.id];
    }
  }
  for (const k of Object.keys(p)) out.push(p[k]);
  out.sort((a, b) => a.ts.localeCompare(b.ts));
  return out;
}

// === Helpers ===
const fmtT = (ts) => {
  if (!ts || ts === 'null') return '??:??:??';
  const d = new Date(ts);
  return isNaN(d) ? ts.substring(11, 19) : d.toLocaleTimeString('en-GB', { hour12: false });
};
const fmtDur = (a, b) => {
  const ms = new Date(b) - new Date(a);
  if (isNaN(ms)) return null;
  if (ms >= 6e4) return `${Math.floor(ms / 6e4)}m${Math.floor((ms % 6e4) / 1e3)}s`;
  if (ms >= 1e3) return `${(ms / 1e3).toFixed(1)}s`;
  return `${ms}ms`;
};
const fmtSz = (b) => b >= 1048576 ? `${(b / 1048576).toFixed(1)}MB` : b >= 1024 ? `${Math.floor(b / 1024)}KB` : `${b}B`;
const trunc = (v, n) => {
  if (v == null) return '';
  let s = typeof v === 'string' ? v : JSON.stringify(v);
  const lines = s.split('\n');
  if (lines.length > 1) {
    const shown = lines.slice(0, 3).map(l => l.trim()).filter(l => l);
    if (lines.length > 3) return truncTo(shown.join(' '), n - 15) + ` … (+${lines.length - 3} lines)`;
    return truncTo(shown.join(' '), n);
  }
  s = s.replace(/\s+/g, ' ').trim();
  return truncTo(s, n);
};

const durColor = (d) => {
  if (!d) return '';
  const ms = d.endsWith('ms') ? +d.slice(0, -2) : d.includes('m') ? (+d.match(/(\d+)m/)[1] * 6e4 + (+d.match(/(\d+)s/)?.[1] || 0) * 1e3) : +d.slice(0, -1) * 1e3;
  if (ms < 100) return T.g(d);
  if (ms < 1000) return T.c(d);
  if (ms < 5000) return T.y(d);
  return T.r(d);
};

// === Format Entry ===
// Wrap a multi-line arg value into display lines that fit the border.
// Returns array of {key, value} lines. Max 3 lines per arg.
// Pad a string to exactly N terminal columns (right-pad with spaces)
const padTo = (s, n) => {
  const w = strWidth(s);
  if (w >= n) return s;
  return s + ' '.repeat(n - w);
};

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

// === Width measurement (based on string-width by sindresorhus) ===
// Uses Intl.Segmenter (Node 16+) for grapheme clustering
// + Unicode East Asian Width for CJK
// + RGI Emoji detection for emoji width
// Zero dependencies — all built-in JS APIs

const segmenter = new Intl.Segmenter();
const reZeroWidth = /^[\p{Default_Ignorable_Code_Point}\p{Control}\p{Format}\p{Mark}\p{Surrogate}]+$/v;
const reEmoji = /^\p{RGI_Emoji}$/v;
const reExtPicto = /\p{Extended_Pictographic}/gv;

const charWidth = (segment) => {
  const cp = segment.codePointAt(0);
  // Zero-width clusters
  if (reZeroWidth.test(segment)) return 0;
  // RGI Emoji → 2 cols
  if (reEmoji.test(segment)) return 2;
  // Keycap sequences
  if (/^[\d#*]\u20E3$/.test(segment)) return 2;
  // ZWJ sequences with 2+ Extended_Pictographic
  if (segment.includes('\u200D') && segment.length <= 50) {
    const p = segment.match(reExtPicto);
    if (p && p.length >= 2) return 2;
  }
  // East Asian Width: Wide/Fullwidth ranges → 2 cols
  if ((cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3400 && cp <= 0x4DBF) ||
      (cp >= 0xF900 && cp <= 0xFAFF) || (cp >= 0xFF01 && cp <= 0xFFEF) ||
      (cp >= 0x3000 && cp <= 0x303F) || (cp >= 0xFE30 && cp <= 0xFE6F) ||
      (cp >= 0xAC00 && cp <= 0xD7AF) || (cp >= 0x3040 && cp <= 0x30FF) ||
      (cp >= 0x3100 && cp <= 0x312F) || (cp >= 0x3130 && cp <= 0x318F) ||
      (cp >= 0x2E80 && cp <= 0x2EFF) || (cp >= 0x2F00 && cp <= 0x2FDF) ||
      (cp >= 0x20000 && cp <= 0x3FFFF)) return 2;
  return 1;
};

const strWidth = (s) => {
  const plain = stripAnsi(s);
  if (!plain) return 0;
  // Fast path: pure ASCII
  if (/^[\x20-\x7E]*$/.test(plain)) return plain.length;
  let w = 0;
  for (const {segment} of segmenter.segment(plain)) w += charWidth(segment);
  return w;
};

// truncTo returns the truncated string. Also sets truncTo.consumed for caller.
let _truncConsumed = 0;
const truncTo = (s, maxCols) => {
  _truncConsumed = 0;
  if (!s) return s;
  // Fast path: pure ASCII
  if (/^[\x20-\x7E]*$/.test(s)) {
    if (s.length <= maxCols) { _truncConsumed = s.length; return s; }
    _truncConsumed = maxCols;
    return s.slice(0, maxCols) + '\u2026';
  }
  let w = 0, chars = [];
  for (const {segment} of segmenter.segment(s)) {
    const cw = charWidth(segment);
    if (cw === 0) { _truncConsumed += segment.length; continue; }
    if (w + cw > maxCols) break;
    w += cw;
    _truncConsumed += segment.length;
    chars.push(segment);
  }
  const result = chars.join('');
  if (_truncConsumed < s.length) {
    return result + '\u2026';
  }
  return result;
};

// Visible length of a string (ignoring ANSI codes)
function wrapArg(key, val, maxCols, keyW) {
  const pad = keyW + 2; // key + space after key
  const maxValW = Math.max(20, maxCols - pad - 3); // 3 for "│  "
  const indent = ' '.repeat(pad + 2); // "│  " + key padding

  let s = val == null ? '' : (typeof val === 'string' ? val : JSON.stringify(val));
  // Flatten newlines to spaces
  s = s.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

  const isJson = s.startsWith('{') || s.startsWith('[');

  if (isJson) {
    // Tokenize → wrap at token boundaries → color
    const tokens = highlightJson(s);
    const tokenLines = wrapTokens(tokens, maxValW, opts.full ? 999 : 3);
    const out = [];
    for (let i = 0; i < tokenLines.length; i++) {
      out.push({ key, indent: i === 0 ? null : indent, val: renderTokenLines([tokenLines[i]])[0] });
    }
    if (out.length === 0) out.push({ key, indent: null, val: '' });
    return out;
  }

  // Non-JSON: plain text wrapping
  const out = [];
  let text = s;
  let lineIdx = 0;
  while (text.length > 0 && lineIdx < (opts.full ? 999 : 3)) {
    const maxL = opts.full ? 999 : 3;
    const isLast = lineIdx === maxL - 1;
    const budget = isLast ? maxValW - 1 : maxValW;
    const chunk = truncTo(text, budget);
    out.push({ key, indent: lineIdx === 0 ? null : indent, val: chunk });
    text = text.slice(_truncConsumed);
    lineIdx++;
    if (!text) break;
    if (isLast && text) {
      out[out.length - 1].val = truncTo(chunk, budget - 1) + '\u2026';
      break;
    }
  }
  if (out.length === 0) out.push({ key, indent: null, val: '' });
  return out;
}

// JSON syntax highlighting
function highlightJson(s) {
  // Tokenize JSON, return array of {type, text}
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '"') {
      let j = i + 1;
      while (j < s.length && s[j] !== '"') { if (s[j] === '\\') j++; j++; }
      const str = s.slice(i, j < s.length ? j + 1 : j);
      // Key if followed by :
      let k = j + 1; while (k < s.length && s[k] === ' ') k++;
      tokens.push({ type: s[k] === ':' ? 'key' : 'str', text: str });
      i = j + 1;
    } else if (ch === ':' || ch === ',' || ch === '{' || ch === '}' || ch === '[' || ch === ']') {
      tokens.push({ type: 'punct', text: ch });
      i++;
    } else if (ch === ' ' || ch === '\t') {
      let j = i; while (j < s.length && (s[j] === ' ' || s[j] === '\t')) j++;
      tokens.push({ type: 'ws', text: s.slice(i, j) });
      i = j;
    } else if (ch === 't' && s.slice(i, i + 4) === 'true') {
      tokens.push({ type: 'bool', text: 'true' }); i += 4;
    } else if (ch === 'f' && s.slice(i, i + 5) === 'false') {
      tokens.push({ type: 'bool', text: 'false' }); i += 5;
    } else if (ch === 'n' && s.slice(i, i + 4) === 'null') {
      tokens.push({ type: 'null', text: 'null' }); i += 4;
    } else if (ch >= '0' && ch <= '9' || ch === '-') {
      let j = i; while (j < s.length && /[0-9.eE+\-]/.test(s[j])) j++;
      tokens.push({ type: 'num', text: s.slice(i, j) }); i = j;
    } else {
      tokens.push({ type: 'plain', text: ch }); i++;
    }
  }
  return tokens;
}

// Apply ANSI color to a token
const colorToken = (t) => {
  const colors = {
    key: '\x1b[36m',   // cyan
    str: '\x1b[32m',   // green
    num: '\x1b[33m',   // yellow
    bool: '\x1b[33m',  // yellow
    null: '\x1b[90m',  // dim
    punct: '',          // no color
    ws: '',             // no color
    plain: '',          // no color
  };
  const c = colors[t.type] || '';
  return c ? `${c}${t.text}\x1b[0m` : t.text;
};

// Wrap tokens into lines, respecting token boundaries
function wrapTokens(tokens, maxCols, maxLines) {
  const lines = [];
  let lineTokens = [];
  let lineW = 0;
  let linesUsed = 0;

  for (let ti = 0; ti < tokens.length; ti++) {
    const t = tokens[ti];
    if (lineTokens.length === 0 && t.type === 'ws') continue;

    let tw = strWidth(t.text);
    const remaining = maxCols - lineW;

    // Token fits entirely
    if (lineW + tw <= maxCols) {
      lineTokens.push(t);
      lineW += tw;
      continue;
    }

    // Token doesn't fit — split it to fill remaining space
    if (lineTokens.length > 0 && remaining > 5) {
      // Split token: put first part on current line
      const head = truncTo(t.text, remaining);
      lineTokens.push({ ...t, text: head });
      lines.push(lineTokens);
      linesUsed++;
      lineTokens = [];
      lineW = 0;

      // Put rest on next line(s)
      let rest = t.text.slice(_truncConsumed);
      if (rest && linesUsed < maxLines) {
        while (rest && linesUsed < maxLines) {
          const isLast = linesUsed === maxLines - 1;
          const budget = isLast ? maxCols - 1 : maxCols;
          const chunk = truncTo(rest, budget);
          lines.push([{ ...t, text: chunk }]);
          linesUsed++;
          rest = rest.slice(_truncConsumed);
          if (chunk.endsWith('\u2026')) break;
        }
      }
    } else {
      // Flush current line, start fresh
      if (lineTokens.length > 0) {
        lines.push(lineTokens);
        linesUsed++;
        lineTokens = [];
        lineW = 0;
      }
      if (linesUsed >= maxLines) break;

      // Split token onto new line(s)
      let rest = t.text;
      while (rest && linesUsed < maxLines) {
        const isLast = linesUsed === maxLines - 1;
        const budget = isLast ? maxCols - 1 : maxCols;
        const chunk = truncTo(rest, budget);
        lines.push([{ ...t, text: chunk }]);
        linesUsed++;
        rest = rest.slice(_truncConsumed);
        if (chunk.endsWith('\u2026')) break;
      }
    }
  }
  if (lineTokens.length > 0 && linesUsed < maxLines) lines.push(lineTokens);

  while (lines.length > maxLines) lines.pop();
  if (lines.length >= maxLines) {
    const last = lines[lines.length - 1];
    const lastStr = last.map(t => t.text).join('');
    if (!lastStr.endsWith('\u2026')) {
      const truncated = truncTo(lastStr, maxCols - 1);
      lines[lines.length - 1] = [{ type: 'plain', text: truncated + '\u2026' }];
    }
  }

  return lines;
}

// Render token lines as colored strings
const renderTokenLines = (tokenLines) => tokenLines.map(line => line.map(colorToken).join(''));

// Wrap result text into up to N lines, each fitting within maxCols
function wrapResult(text, maxCols, maxLines) {
  const flat = text.replace(/[\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
  const lines = [];
  let remaining = flat;
  while (remaining && lines.length < maxLines) {
    const isLast = lines.length === maxLines - 1;
    const budget = isLast ? maxCols - 1 : maxCols;
    const chunk = truncTo(remaining, budget);
    lines.push(chunk);
    remaining = remaining.slice(_truncConsumed);
    if (!remaining) break;
    if (isLast) {
      // Force … on last line if more text remains
      if (!lines[lines.length - 1].endsWith('\u2026'))
        lines[lines.length - 1] = truncTo(chunk, budget - 1) + '\u2026';
      break;
    }
  }
  return lines;
}

function fmt(e, label) {
  const t = fmtT(e.ts), id = e.id?.slice(0, 10) || '?';

  if (opts.compact) {
    const args = Object.entries(e.args || {}).slice(0, 2).map(([k, v]) => T.x(`${k}=`) + trunc(v, 50)).join(' ');
    let line = `${T.x(t)} ${T.badge(e.name)} ${T.b(trunc(label, 20))} ${args}`;
    if (e.result != null) {
      const sz = fmtSz(Buffer.byteLength(e.result, 'utf8'));
      const dur = e.rts ? durColor(fmtDur(e.ts, e.rts)) : '';
      const meta = [dur, T.x(sz)].filter(Boolean).join(T.x(' · '));
      line += `\n  ${T.x('↳')} ${meta} ${T.d(trunc(e.result, 70))}`;
    }
    return line;
  }

  // Card layout — full width
  const W = process.stdout.columns || 80;
  const lines = [];

  // Top border
  lines.push(T.x('┌' + '─'.repeat(W - 2) + '┐'));

  // Row 1: time · session · tool badge · id
  const badge = T.badge(e.name);
  const row1 = `${T.x('│')} ${T.x(t)}  ${T.b(trunc(label, W - 38))}  ${badge}  ${T.x(id)}`;
  lines.push(padTo(row1, W - 1) + T.x('│'));

  // Args
  const args = Object.entries(e.args || {}).slice(0, 4);
  const keyW = args.reduce((m, [k]) => Math.max(m, k.length), 0);
  for (const [k, v] of args) {
    for (const wl of wrapArg(k, v, W - 4, keyW)) {
      const valPart = wl.indent ? wl.indent + wl.val : T.c(wl.key.padEnd(keyW)) + ' ' + wl.val;
      lines.push(padTo(`${T.x('│')}  ${valPart}`, W - 1) + T.x('│'));
    }
  }

  // Result
  if (e.result != null) {
    const isErr = e.result.includes('"status": "error"') || e.result.includes('"error"');
    const icon = isErr ? T.err('✗') : T.ok('✓');
    const dur = e.rts ? durColor(fmtDur(e.ts, e.rts)) : '';
    const sz = T.x(fmtSz(Buffer.byteLength(e.result, 'utf8')));
    const meta = [dur, sz].filter(Boolean).join(T.x(' · '));
    lines.push(padTo(`${T.x('│')} ${icon} ${T.b(e.name || '?')}  ${meta}`, W - 1) + T.x('│'));
    const rText = (typeof e.result === 'string' ? e.result : JSON.stringify(e.result)).trim();
    const flat = rText.replace(/[\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
    const isJson = flat.startsWith('{') || flat.startsWith('[');
    if (isJson) {
      const tokens = highlightJson(flat);
      const tokenLines = wrapTokens(tokens, W - 10, opts.full ? 999 : 2);
      for (const tl of renderTokenLines(tokenLines)) {
        lines.push(padTo(`${T.x('│')}   ${tl}`, W - 1) + T.x('│'));
      }
    } else {
      const rLines = wrapResult(flat, W - 10, opts.full ? 999 : 2);
      for (const rl of rLines) {
        lines.push(padTo(`${T.x('│')}   ${T.d(rl)}`, W - 1) + T.x('│'));
      }
    }
  }

  // Bottom border
  lines.push(T.x('└' + '─'.repeat(W - 2) + '┘'));
  return lines.join('\n');
}

// === Live output helpers ===
function fmtLiveCall(tc, label) {
  const t = fmtT(tc.timestamp);
  const id = tc.id?.slice(0, 10) || '?';
  const W = process.stdout.columns || 80;

  if (opts.compact) {
    const args = Object.entries(tc.arguments || {}).slice(0, 2).map(([k, v]) => T.x(`${k}=`) + trunc(v, 50)).join(' ');
    console.log(`${T.x(t)} ${T.badge(tc.name)} ${T.b(trunc(label, 20))} ${args}`);
    return;
  }

  console.log(T.x('┌' + '─'.repeat(W - 2) + '┐'));
  const badge = T.badge(tc.name);
  console.log(padTo(`${T.x('│')} ${T.x(t)}  ${T.b(trunc(label, W - 38))}  ${badge}  ${T.x(id)}`, W - 1) + T.x('│'));
  const args = Object.entries(tc.arguments || {}).slice(0, 4);
  const keyW = args.reduce((m, [k]) => Math.max(m, k.length), 0);
  for (const [k, v] of args) {
    for (const wl of wrapArg(k, v, W - 4, keyW)) {
      const valPart = wl.indent ? wl.indent + wl.val : T.c(wl.key.padEnd(keyW)) + ' ' + wl.val;
      console.log(padTo(`${T.x('│')}  ${valPart}`, W - 1) + T.x('│'));
    }
  }
}

function fmtLiveResult(msg, ts) {
  const callId = msg.toolCallId;
  const id = callId?.slice(0, 10) || '?';
  const name = msg.toolName || '?';
  const rStr = typeof (msg.content?.[0]?.text || '') === 'string' ? (msg.content?.[0]?.text || '') : JSON.stringify(msg.content?.[0]?.text || '');
  const isErr = rStr.includes('"status": "error"') || rStr.includes('"error"');
  const icon = isErr ? T.err('✗') : T.ok('✓');
  const sz = T.x(fmtSz(Buffer.byteLength(rStr, 'utf8')));
  let dur = '';
  if (pending[callId]) {
    dur = durColor(fmtDur(pending[callId], ts));
    delete pending[callId];
  }
  const meta = [dur, sz].filter(Boolean).join(T.x(' · '));

  if (opts.compact) {
    console.log(`  ${T.x('↳')} ${meta} ${T.d(trunc(rStr, 70))}`);
  } else {
    const W = process.stdout.columns || 80;
    console.log(padTo(`${T.x('│')} ${icon} ${T.b(name)}  ${meta}`, W - 1) + T.x('│'));
    const flat = rStr.replace(/[\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
    const isJson = flat.startsWith('{') || flat.startsWith('[');
    if (isJson) {
      const tokens = highlightJson(flat);
      const tokenLines = wrapTokens(tokens, W - 10, opts.full ? 999 : 2);
      for (const tl of renderTokenLines(tokenLines)) {
        console.log(padTo(`${T.x('│')}   ${tl}`, W - 1) + T.x('│'));
      }
    } else {
      const rLines = wrapResult(flat, W - 10, opts.full ? 999 : 2);
      for (const rl of rLines) {
        console.log(padTo(`${T.x('│')}   ${T.d(rl)}`, W - 1) + T.x('│'));
      }
    }
    console.log(T.x('└' + '─'.repeat(W - 2) + '┘'));
  }
}

// === Main ===
const sessions = findSessions();
if (!sessions.length) {
  console.error(`No sessions found under ${DIR}. Try --all.`);
  process.exit(1);
}

const labels = {};
for (const f of sessions) labels[path.basename(f)] = getLabel(f);

// Header
console.log('');
console.log(`  ${T.bd('clawmonitor')}  ${T.x(`${sessions.length} sessions · ${os.type()} · Ctrl+C to stop`)}`);

// Sessions (compact inline)
console.log('');
const sessLine = sessions.map(f => {
  const fn = path.basename(f);
  return T.tag(labels[fn]?.split('/').pop() || fn.slice(0, 8));
}).join(' ');
console.log(`  ${sessLine}`);

// History
console.log('');
let all = [];
for (const f of sessions) all.push(...extract(f));
const paired = pair(all).slice(-opts.history);
for (const e of paired) console.log(fmt(e, labels[e.file] || e.file));

// Live
console.log('');
console.log(`  ${T.bd('Live')}`);

// === Polling ===
const pending = {};
const watched = new Set();
const pos = {};

function getFiles() {
  const out = [];
  if (!fs.existsSync(DIR)) return out;
  for (const ag of fs.readdirSync(DIR)) {
    const sd = path.join(DIR, ag, 'sessions');
    if (!fs.existsSync(sd)) continue;
    for (const f of fs.readdirSync(sd))
      if (f.endsWith('.jsonl')) out.push(path.join(sd, f));
  }
  return out;
}

// Init at end of files
for (const f of getFiles()) {
  watched.add(f);
  try { pos[f] = fs.statSync(f).size; if (!labels[path.basename(f)]) labels[path.basename(f)] = getLabel(f); } catch {}
}

function poll() {
  for (const f of getFiles()) {
    if (!watched.has(f)) {
      watched.add(f); pos[f] = 0;
      try { labels[path.basename(f)] = getLabel(f); } catch {}
    }
    let p = pos[f] || 0;
    let data;
    try {
      const st = fs.statSync(f);
      if (st.size < p) { p = 0; }
      if (st.size === p) continue;
      // Skip stale data — if delta > 1MB, re-seek to last 100KB
      if (st.size - p > 1048576) { p = Math.max(0, st.size - 102400); }
      const fd = fs.openSync(f, 'r');
      const buf = Buffer.alloc(st.size - p);
      fs.readSync(fd, buf, 0, buf.length, p);
      fs.closeSync(fd);
      data = buf.toString('utf8');
      pos[f] = st.size;
    } catch { continue; }

    for (const ln of data.split('\n')) {
      if (!ln.trim()) continue;
      let o; try { o = JSON.parse(ln); } catch { continue; }
      if (o.type !== 'message' || !o.timestamp) continue;
      const ts = o.timestamp;
      const fn = path.basename(f);
      const label = labels[fn] || fn;

      if (o.message.role === 'assistant') {
        for (const tc of (o.message.content || []).filter(c => c.type === 'toolCall')) {
          pending[tc.id] = ts;
          fmtLiveCall({ ...tc, timestamp: ts }, label);
        }
      } else if (o.message.role === 'toolResult') {
        fmtLiveResult(o.message, ts);
      }
    }
  }
}

setInterval(poll, 200);

// Also re-scan for new files every 10s
setInterval(() => {
  for (const f of getFiles()) {
    if (!watched.has(f)) {
      watched.add(f); pos[f] = 0;
      try { labels[path.basename(f)] = getLabel(f); } catch {}
    }
  }
}, 10000);
process.on('SIGINT', () => { console.log(`\n  ${T.x('Stopped.')}`); process.exit(0); });
