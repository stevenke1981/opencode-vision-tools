---
description: Capture desktop or app window screenshot (OpenCode eyes)
agent: build
---

Take a screenshot using vision* tools:

Target from $ARGUMENTS:
- If an app/window name → `visionFindWindow` then `visionCaptureWindow`
- If "desktop" or empty → `visionCaptureScreen` or `visionDescribe`

1. `visionDoctor` if first vision task in session
2. Capture and report the saved PNG path
3. Briefly describe visible windows from `visionListWindows` if helpful