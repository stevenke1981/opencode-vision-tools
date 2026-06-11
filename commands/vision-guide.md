---
description: Load desktop vision guide — OpenCode eyes (screenshot + app/window locate)
agent: build
---

Use **vision* plugin tools** for desktop screen and native app tasks. Use **browser*** for websites.

## When to use vision tools

- Screenshot desktop or native app window
- Find/locate/focus an open application
- "What's on my screen?"
- UI issues in desktop apps (VS Code, Slack, settings, etc.)

## Workflow

1. `visionDoctor` — first desktop vision task
2. `visionDescribe` or `visionListWindows` — see open windows
3. `visionFindWindow` / `visionLocateApp` — locate target ($ARGUMENTS if provided)
4. `visionFocusWindow` — bring to front (optional)
5. `visionCaptureWindow` or `visionCaptureScreen` — screenshot

Report the saved PNG path after capture.