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

### Install (global, `~/.config`)

One command clones/updates to `~/.config/opencode-vision-tools` and registers the plugin in `~/.config/opencode/` for all projects.

**Windows (PowerShell):**

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
# or from any clone:
irm https://raw.githubusercontent.com/stevenke1981/opencode-vision-tools/main/install.ps1 | iex
```

**macOS / Linux:**

```bash
bash install.sh
# Linux optional: sudo apt install scrot wmctrl
```

**Manual:**

```bash
git clone https://github.com/stevenke1981/opencode-vision-tools.git ~/.config/opencode-vision-tools
cd ~/.config/opencode-vision-tools
node scripts/install-global.mjs
```

Restart OpenCode after install.

| Path | Purpose |
|------|---------|
| `~/.config/opencode-vision-tools/` | Project source (git clone) |
| `~/.config/opencode/plugins/opencode-vision-tools/index.ts` | Plugin entrypoint |
| `~/.config/opencode/plugins/opencode-vision-tools/` | Helper modules + `vision-windows.ps1` |
| `~/.config/opencode/commands/` | Slash commands |

### OpenCode loading note

OpenCode auto-loads files directly under `~/.config/opencode/plugins/`.
Only plugin entrypoints should be registered or placed where OpenCode treats
them as plugins. This installer keeps helper files in
`plugins/opencode-vision-tools/` next to `index.ts`, so files like
`opencode-vision-tools-runner.ts` and `opencode-vision-tools-guidance.ts` are
imported by the entrypoint instead of being misloaded as standalone plugins.

**Windows:** use `install.ps1` or `node scripts/install-global.mjs` — do **not** run `ls`/`dir` inside OpenCode before install (TUI can garble ANSI output and look stuck).

**Fast reinstall** (files only, skip npm):

```bash
node scripts/install-global.mjs --skip-npm
```

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

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Installer appears stuck for minutes | Old installer ran full `npm install` on entire `~/.config/opencode` (superpowers, transformers, etc.) | Update repo; installer now installs only `@opencode-ai/plugin` |
| Garbled `‹\|38;2;...` text in OpenCode | `bashExec` + `ls -la` ANSI codes in TUI | Skip listing; run `node scripts/install-global.mjs` directly |
| `vision-windows.ps1 not found` | Plugin files not copied | Re-run installer |
| npm timeout | Slow network | Retry, or `--skip-npm` if `@opencode-ai/plugin` already exists |

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

### Install (agents)

On Windows, install with **one command** to the global path — do not run exploratory `ls`/`dir` first:

```bash
node ~/.config/opencode-vision-tools/scripts/install-global.mjs
# or first-time: powershell -ExecutionPolicy Bypass -File install.ps1
```

If `@opencode-ai/plugin` is already in `~/.config/opencode/node_modules`, use `--skip-npm` for instant copy-only install.

### Rules

- List windows **before** capturing when the target app is unclear
- Use `visionFindWindow` to get PID/bounds before `visionCaptureWindow`
- Do not use raw `powershell` screenshot one-liners when vision* tools exist
- Pair with [opencode-agent-browser](https://github.com/stevenke1981/opencode-agent-browser) for full desktop + web coverage
- Keep helper modules under `plugins/opencode-vision-tools/`; do not copy them into the plugins root

<!-- END_AGENT_README -->

---

## More documentation

- [docs/LLM_USAGE.md](docs/LLM_USAGE.md) — extended guide (中文)
- [opencode.json.example](opencode.json.example) — plugin registration
