# LLM 使用說明 — opencode-vision-tools（OpenCode 眼睛）

桌面視覺工具：螢幕截圖、視窗列表、應用程式搜尋定位。參考 Codex / Claude Code 的 computer use 模式。

## 何時使用 vision*

- 螢幕截圖（桌面、視窗、區域）
- 找開啟中的應用程式 / 視窗
- 將視窗帶到前景
- 搜尋已安裝應用（Windows 開始功能表）
- 使用者問「螢幕上有什麼」

## 何時不要用

- 網頁 → 用 `browser*`
- 讀原始碼 → 用 `Read` / `Grep`

## 標準流程

```
visionDescribe → visionFindWindow → visionFocusWindow → visionCaptureWindow
```

## 與 browser* 分工

| 場景 | 工具 |
|------|------|
| Chrome 裡的網頁 | browser* |
| VS Code / Slack / 設定視窗 | vision* |
| 整個桌面 | visionCaptureScreen |