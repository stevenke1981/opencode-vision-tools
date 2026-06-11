# opencode-vision-tools

[![OpenCode Plugin](https://img.shields.io/badge/OpenCode-plugin-blue)](https://opencode.ai/docs/plugins/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**OpenCode's eyes** — desktop screenshot, window listing, and app locate plugin for [OpenCode](https://opencode.ai).

Inspired by **ChatGPT / Codex computer use** and **Claude Code** screen inspection. Complements [opencode-agent-browser](https://github.com/stevenke1981/opencode-agent-browser) — `vision*` for **desktop**, `browser*` for **websites**.

Repository: https://github.com/stevenke1981/opencode-vision-tools

---

## For humans — quick start

### What it does

Gives OpenCode **desktop vision**:

- **Screenshot** — full screen, specific window, or screen region
- **Window list** — see every open app with title, PID, position, size
- **App locate** — find running windows + installed apps (Windows Start Menu)
- **Focus** — bring a window to the foreground before capture
- **LLM guidance** — plugin tells the agent when to use vision vs browser tools

### Install

```bash
git clone https://github.com/stevenke1981/opencode-vision-tools.git
cd opencode-vision-tools
```

**Windows (PowerShell):**

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

**macOS / Linux:**

```bash
bash install.sh
# Linux optional: sudo apt install scrot wmctrl
```

Restart OpenCode after install.

### Verify

```bash
opencode run "call visionDoctor and show the result"
```

Expected on Windows:

```
platform: windows
screen: 1536x864
windows_api: ok
screenshot: ok
```

### Tools

| Tool | Purpose |
|------|---------|
| `visionDoctor` | Check desktop vision capabilities |
| `visionDescribe` | List windows + optional desktop screenshot |
| `visionListWindows` | All open windows with bounds |
| `visionFindWindow` | Search windows by title/app name |
| `visionFocusWindow` | Bring window to foreground |
| `visionLocateApp` | Running windows + installed apps |
| `visionCaptureScreen` | Full desktop screenshot |
| `visionCaptureWindow` | Screenshot a specific window |
| `visionCaptureRegion` | Screenshot a screen region |
| `visionScreenInfo` | Monitor resolution |

### Slash commands

| Command | Description |
|---------|-------------|
| `/vision-guide` | Load when/how-to guide for the agent |
| `/vision-screenshot [app]` | Capture desktop or app window |
| `/vision-find-app <name>` | Locate running/installed application |

### Platform support

| Feature | Windows | macOS | Linux |
|---------|---------|-------|-------|
| Screenshot | Full (Win32 GDI+) | `screencapture` | `scrot` |
| Window list | Win32 EnumWindows | osascript (basic) | `wmctrl -l` |
| App search | Start Menu + processes | `mdfind` | limited |
| Focus window | SetForegroundWindow | limited | `wmctrl -a` |

Windows uses `vision-windows.ps1` (richest support).

### Related plugins

- [opencode-agent-browser](https://github.com/stevenke1981/opencode-agent-browser) — web pages
- [opencode-git-tools](https://github.com/stevenke1981/opencode-git-tools) — Git operations
- [opencode-agent-memory-tools](https://github.com/stevenke1981/opencode-agent-memory-tools-) — persistent memory

### License

MIT

---

## For AI agents — operating instructions

<!-- AGENT_README: opencode-vision-tools v1.0 -->

You have **vision\*** plugin tools = OpenCode's **desktop eyes**. **Prefer them** over raw PowerShell screenshot scripts or guessing what's on screen.

### Decision: when to USE vision*

Use vision tools if **any** of these is true:

| Signal | Tool |
|--------|------|
| User asks what's on screen / 螢幕上 | `visionDescribe` |
| Desktop screenshot needed | `visionCaptureScreen` |
| App window screenshot | `visionFindWindow` → `visionCaptureWindow` |
| Find/locate open app or window | `visionFindWindow`, `visionLocateApp` |
| Bring app to front before capture | `visionFocusWindow` |
| Native app UI (VS Code, Slack, Settings, dialogs) | `visionCaptureWindow` |
| Partial screen capture | `visionCaptureRegion` |
| Monitor info | `visionScreenInfo` |

**First desktop vision task:** `visionDoctor`

**Standard workflow (Codex / Claude computer-use):**

```
visionDescribe({ path: "desktop.png" })
  OR visionListWindows({ limit: 20 })
→ visionFindWindow({ query: "AppName" })
→ visionFocusWindow({ query: "AppName" })     // optional
→ visionCaptureWindow({ query: "AppName", path: "app.png" })
```

Always **report the saved PNG path** after capture so the user or a vision model can inspect it.

### Decision: when NOT to use

| Situation | Use instead |
|-----------|-------------|
| Website, URL, localhost **web** app | `browserOpen` + `browserScreenshot` |
| Read project source code | `Read` / `Grep` |
| Git / file / shell only | Other plugin tools |
| User did not ask for visual/desktop info | Skip vision tools |
| Secrets on screen | Capture only if user explicitly requests; warn about sensitive data |

### Tool reference

| Tool | When | Key args |
|------|------|----------|
| `visionDoctor` | First task; errors | — |
| `visionScreenInfo` | Resolution / monitors | — |
| `visionListWindows` | See all open windows | `limit`, `includeHidden` |
| `visionFindWindow` | Search by name/title | `query`, `title`, `processId` |
| `visionFocusWindow` | Bring window front | `query`, `title`, `processId` |
| `visionLocateApp` | Running + installed apps | `query` |
| `visionCaptureScreen` | Full desktop PNG | `path` (optional) |
| `visionCaptureWindow` | Window PNG | `path`, `query`/`title`/`processId` |
| `visionCaptureRegion` | Region PNG | `path`, `x`, `y`, `width`, `height` |
| `visionDescribe` | Eyes overview + shot | `path`, `limit` |

Screenshots default to the **project directory** unless `path` is set.

### Call examples

```javascript
// What's on screen?
visionDescribe({ path: "desktop.png", limit: 20 })

// Find and screenshot Codex window
visionFindWindow({ query: "Codex" })
visionCaptureWindow({ query: "Codex", path: "codex-ui.png" })

// Locate Slack (running + installed)
visionLocateApp({ query: "slack" })

// Region capture
visionCaptureRegion({ x: 100, y: 100, width: 800, height: 600, path: "region.png" })
```

### vision* vs browser* (critical)

| Layer | Tools | Target |
|-------|-------|--------|
| **Desktop / OS / native apps** | `vision*` | Windows UI, Electron apps via OS window, dialogs |
| **Web pages** | `browser*` | HTTP URLs, DOM, forms in browser |

When user says "screenshot the website" → **browser\***.
When user says "screenshot my screen" or "screenshot VS Code" → **vision\***.

### Plugin guidance (already active)

1. **config.instructions** — short decision rules every session
2. **Intent detection** — full guide on screenshot/desktop/螢幕 keywords
3. **session.compacting** — workflow survives context compression
4. **`/vision-guide`** — user can force-load this guide

### Rules

- List windows **before** capturing when the target app is unclear
- Use `visionFindWindow` to get PID/bounds before `visionCaptureWindow`
- Do not use raw `powershell` screenshot one-liners when vision* tools exist
- Pair with [opencode-agent-browser](https://github.com/stevenke1981/opencode-agent-browser) for full desktop + web coverage

<!-- END_AGENT_README -->

---

## More documentation

- [docs/LLM_USAGE.md](docs/LLM_USAGE.md) — extended guide (中文)
- [opencode.json.example](opencode.json.example) — plugin registration