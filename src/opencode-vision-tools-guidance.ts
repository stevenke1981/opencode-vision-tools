export const GUIDANCE_MARKER = "<AGENT_VISION_PLUGIN>";

export const VISION_CONFIG_INSTRUCTION = `opencode-vision-tools (OpenCode eyes): USE vision* for DESKTOP screen/window/app tasks — screenshot desktop, find/focus windows, locate apps. USE browser* for WEB pages. Flow: visionDescribe or visionListWindows → visionFindWindow → visionFocusWindow → visionCaptureWindow. Never raw PowerShell screenshot hacks.`;

export const VISION_TOOLS_GUIDANCE = `${GUIDANCE_MARKER}
# OpenCode Eyes — Desktop Vision Tools (opencode-vision-tools)

Desktop **screen capture** and **app/window locate** — like ChatGPT/Codex computer use and Claude Code looking at the user's screen.
**Not for websites** — use browser* tools for URLs. Use vision* for OS desktop, native apps, dialogs.

---

## 1. When to USE vision tools

| Signal | Tool |
|--------|------|
| "What's on my screen" / desktop state | visionDescribe |
| Screenshot desktop | visionCaptureScreen |
| Screenshot specific app window | visionFindWindow → visionCaptureWindow |
| Find open app/window | visionFindWindow / visionListWindows |
| Focus/bring app to front | visionFocusWindow |
| Search installed or running app | visionLocateApp |
| UI bug on native app (not browser) | visionCaptureWindow |
| Multi-monitor / resolution | visionScreenInfo |
| Region screenshot | visionCaptureRegion |

**Core loop (Codex/Claude computer-use style):**
\`\`\`
visionDescribe() or visionListWindows()
  → visionFindWindow(query)
  → visionFocusWindow(pid/title/query)   # optional
  → visionCaptureWindow(path) or visionCaptureScreen(path)
\`\`\`

Report the saved **screenshot path** to the user — they or a vision model can inspect it.

---

## 2. When NOT to use

| Situation | Use instead |
|-----------|-------------|
| Website / localhost web app | browserOpen + browserScreenshot |
| Read source code | Read / Grep |
| File system only | Shell / Read |
| User didn't ask to see screen | Skip |

---

## 3. Tool reference

| Tool | When | Key args |
|------|------|----------|
| visionDoctor | First desktop vision task | — |
| visionScreenInfo | Monitor resolution | — |
| visionListWindows | All open windows | limit |
| visionFindWindow | Search by title/app | query, processId, title |
| visionFocusWindow | Bring window front | query, processId, title |
| visionLocateApp | Running + installed apps | query |
| visionCaptureScreen | Full desktop screenshot | path |
| visionCaptureWindow | Window screenshot | path, query/processId/title |
| visionCaptureRegion | Partial screen | path, x, y, width, height |
| visionDescribe | Eyes overview + optional shot | path?, limit? |

---

## 4. Examples

\`\`\`
visionDescribe({ path: "desktop.png", limit: 20 })
visionFindWindow({ query: "Codex" })
visionFocusWindow({ query: "Chrome" })
visionCaptureWindow({ query: "OpenCode", path: "opencode-ui.png" })
visionLocateApp({ query: "slack" })
\`\`\`

</AGENT_VISION_PLUGIN>`;

export function buildCompactContext(platform: string): string {
  return `
## Vision Tools (opencode-vision-tools — OpenCode eyes)
Desktop: visionDescribe → visionFindWindow → visionCaptureWindow. Web: use browser* instead.
Platform: ${platform}. Report screenshot paths after capture.
`.trim();
}

const VISION_INTENT_PATTERNS = [
  /\b(screenshot|screen\s*shot|螢幕|截圖|屏幕)\b/i,
  /\b(desktop|my screen|what.?s on (the )?screen|畫面|螢幕上)\b/i,
  /\b(find (the )?window|locate (the )?app|which window|找視窗|找視窗|定位)\b/i,
  /\b(focus|bring.*to front|切到|前景)\b/i,
  /\b(visionDescribe|visionCapture|visionFind|visionLocate|visionList)\b/,
  /\b(native app|desktop app|視窗|窗口)\b/i,
  /\b(look at (my )?screen|computer use|看看螢幕)\b/i,
];

export function shouldInjectVisionGuidance(text: string): boolean {
  return VISION_INTENT_PATTERNS.some((p) => p.test(text.slice(0, 4000)));
}

export function extractUserText(
  messages: Array<{ info: { role: string }; parts: Array<{ type: string; text?: string }> }>,
): string {
  const users = messages.filter((m) => m.info.role === "user");
  const last = users[users.length - 1];
  if (!last) return "";
  return last.parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("\n");
}