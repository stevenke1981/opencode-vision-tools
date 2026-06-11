---
description: Find and locate a desktop application or window
agent: build
---

Locate app/window: **$ARGUMENTS**

1. `visionLocateApp` with query from $ARGUMENTS
2. `visionFindWindow` for open window matches
3. If user wants to interact: `visionFocusWindow`
4. Summarize: PID, process name, window title, bounds

For websites use browser* tools instead.