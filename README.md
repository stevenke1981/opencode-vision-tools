# opencode-vision-tools

**OpenCode's eyes** — desktop screenshot, window listing, and app locate plugin for [OpenCode](https://opencode.ai).

Inspired by **ChatGPT / Codex computer use** and **Claude Code** screen inspection. Complements [opencode-agent-browser](https://github.com/stevenke1981/opencode-agent-browser) (web) — use `vision*` for **desktop**, `browser*` for **websites**.

---

## For humans — quick start

### Install

```bash
git clone https://github.com/stevenke1981/opencode-vision-tools.git
cd opencode-vision-tools
```

**Windows:**

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

**macOS / Linux:**

```bash
bash install.sh
# Linux: sudo apt install scrot wmctrl  (optional, for full features)
```

Restart OpenCode.

### Verify

```bash
opencode run "call visionDoctor and show the result"
```

### Tools

| Tool | Purpose |
|------|---------|
| `visionDoctor` | Check desktop vision capabilities |
| `visionDescribe` | List windows + optional desktop screenshot |
| `visionListWindows` | All open windows with bounds |
| `visionFindWindow` | Search windows by title/app |
| `visionFocusWindow` | Bring window to foreground |
| `visionLocateApp` | Running windows + installed apps (Windows Start Menu) |
| `visionCaptureScreen` | Full desktop screenshot |
| `visionCaptureWindow` | Screenshot specific window |
| `visionCaptureRegion` | Region screenshot |
| `visionScreenInfo` | Monitor resolution |

### Slash commands

- `/vision-guide` — when/how to use vision tools
- `/vision-screenshot [app]` — capture desktop or window
- `/vision-find-app <name>` — locate application

### Platform support

| Feature | Windows | macOS | Linux |
|---------|---------|-------|-------|
| Screenshot | Full | screencapture | scrot |
| Window list | Win32 API | osascript (basic) | wmctrl |
| App locate | Start Menu + processes | mdfind | limited |
| Focus window | Yes | limited | wmctrl |

Windows has the richest support via `vision-windows.ps1`.

---

## For AI agents — operating instructions

<!-- AGENT_README: opencode-vision-tools -->

You have **vision\*** tools = OpenCode's **desktop eyes**. Use for **native OS UI**, not web pages.

### When to USE vision*

| Signal | Tool |
|--------|------|
| "What's on my screen" | `visionDescribe` |
| Desktop screenshot | `visionCaptureScreen` |
| App window screenshot | `visionFindWindow` → `visionCaptureWindow` |
| Find open app | `visionFindWindow`, `visionLocateApp` |
| Focus app before capture | `visionFocusWindow` |
| Native app UI (VS Code, Slack, Settings) | `visionCaptureWindow` |

### When NOT to use

| Situation | Use instead |
|-----------|-------------|
| Website / URL / localhost web | `browserOpen` + `browserScreenshot` |
| Source code | `Read` / `Grep` |
| No visual/desktop request | Skip |

### Workflow (Codex / Claude computer-use style)

```
visionDescribe({ path: "desktop.png" })
  OR visionListWindows()
→ visionFindWindow({ query: "AppName" })
→ visionFocusWindow({ query: "AppName" })   // optional
→ visionCaptureWindow({ query: "AppName", path: "app.png" })
```

Always **report the PNG path** after capture.

### vision* vs browser*

| Layer | Tools | Target |
|-------|-------|--------|
| Desktop / OS | `vision*` | Windows, dialogs, native apps |
| Web | `browser*` | HTTP URLs, SPAs, forms |

<!-- END_AGENT_README -->

## License

MIT