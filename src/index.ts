import { type Plugin, tool } from "@opencode-ai/plugin";
import {
  GUIDANCE_MARKER,
  VISION_CONFIG_INSTRUCTION,
  VISION_TOOLS_GUIDANCE,
  buildCompactContext,
  extractUserText,
  shouldInjectVisionGuidance,
} from "./opencode-vision-tools-guidance.js";
import {
  checkVision,
  detectPlatform,
  runVision,
  screenshotPath,
} from "./opencode-vision-tools-runner.js";

export const VisionToolsPlugin: Plugin = async ({ client, directory }) => {
  const status = checkVision();
  const platform = detectPlatform();

  await client.app.log({
    body: {
      service: "opencode-vision-tools",
      level: status.ready ? "info" : "warn",
      message: status.ready
        ? `Vision tools active (${platform}) — OpenCode eyes ready`
        : `Vision tools loaded but desktop capture may be unavailable (${platform})`,
    },
  });

  return {
    config: async (config) => {
      config.instructions = config.instructions ?? [];
      if (!config.instructions.some((i) => typeof i === "string" && i.includes("opencode-vision-tools"))) {
        config.instructions.push(VISION_CONFIG_INSTRUCTION);
      }
    },

    "experimental.chat.messages.transform": async (_input, output) => {
      if (!output.messages.length) return;
      const userText = extractUserText(output.messages);
      if (!shouldInjectVisionGuidance(userText)) return;

      const firstUser = output.messages.find((m) => m.info.role === "user");
      if (!firstUser?.parts.length) return;
      if (firstUser.parts.some((p) => p.type === "text" && p.text.includes(GUIDANCE_MARKER))) return;

      const ref = firstUser.parts[0];
      firstUser.parts.unshift({ ...ref, type: "text", text: VISION_TOOLS_GUIDANCE });
    },

    "experimental.session.compacting": async (_input, output) => {
      output.context.push(buildCompactContext(platform));
    },

    tool: {
      visionDoctor: tool({
        description:
          "Check desktop vision capabilities (OpenCode eyes). Call before first screen capture or window locate task.",
        args: {},
        async execute() {
          const result = checkVision();
          return [
            `platform: ${result.platform}`,
            `ready: ${result.ready}`,
            "",
            result.doctor,
            "",
            "Desktop → vision* tools. Websites → browser* tools.",
          ].join("\n");
        },
      }),

      visionScreenInfo: tool({
        description: "Get primary screen resolution and monitor info",
        args: {},
        async execute() {
          return runVision({ command: "screen-info" });
        },
      }),

      visionListWindows: tool({
        description:
          "List open desktop windows with title, process, PID, bounds. Call to see what's on screen (native apps, not browser DOM).",
        args: {
          limit: tool.schema.number().optional().default(30),
          includeHidden: tool.schema.boolean().optional().default(false),
        },
        async execute(args) {
          return runVision({
            command: "list-windows",
            limit: args.limit,
            includeHidden: args.includeHidden,
          });
        },
      }),

      visionFindWindow: tool({
        description:
          "Search open windows by app name or title (app locate). Like Codex/Claude finding the right window before screenshot.",
        args: {
          query: tool.schema.string().optional().describe("Fuzzy match on title or process name"),
          title: tool.schema.string().optional(),
          processId: tool.schema.number().optional(),
          limit: tool.schema.number().optional().default(15),
        },
        async execute(args) {
          if (!args.query && !args.title && !args.processId) {
            return "visionFindWindow requires query, title, or processId.";
          }
          return runVision({
            command: "find-window",
            query: args.query,
            title: args.title,
            processId: args.processId,
            limit: args.limit,
          });
        },
      }),

      visionFocusWindow: tool({
        description: "Bring a window to the foreground before capturing or interacting",
        args: {
          query: tool.schema.string().optional(),
          title: tool.schema.string().optional(),
          processId: tool.schema.number().optional(),
        },
        async execute(args) {
          if (!args.query && !args.title && !args.processId) {
            return "visionFocusWindow requires query, title, or processId.";
          }
          return runVision({
            command: "focus-window",
            query: args.query,
            title: args.title,
            processId: args.processId,
          });
        },
      }),

      visionLocateApp: tool({
        description:
          "Search running windows AND installed Start Menu apps by name. Desktop app discovery (not web).",
        args: {
          query: tool.schema.string().describe("App name to search, e.g. chrome, slack, code"),
          limit: tool.schema.number().optional().default(20),
        },
        async execute(args) {
          return runVision({ command: "locate-app", query: args.query, limit: args.limit });
        },
      }),

      visionCaptureScreen: tool({
        description:
          "Screenshot the full desktop (primary monitor). OpenCode eyes — for UI state, desktop apps, dialogs. Not for web pages.",
        args: {
          path: tool.schema.string().optional().describe("Output PNG path (defaults to project dir)"),
        },
        async execute(args) {
          const out = args.path ?? screenshotPath(directory, undefined);
          return runVision({ command: "capture-screen", path: out });
        },
      }),

      visionCaptureWindow: tool({
        description:
          "Screenshot a specific window by query/title/PID. Prefer after visionFindWindow.",
        args: {
          path: tool.schema.string().optional(),
          query: tool.schema.string().optional(),
          title: tool.schema.string().optional(),
          processId: tool.schema.number().optional(),
        },
        async execute(args) {
          if (!args.query && !args.title && !args.processId) {
            return "visionCaptureWindow requires query, title, or processId.";
          }
          const out = args.path ?? screenshotPath(directory, `window-${Date.now()}.png`);
          return runVision({
            command: "capture-window",
            path: out,
            query: args.query,
            title: args.title,
            processId: args.processId,
          });
        },
      }),

      visionCaptureRegion: tool({
        description: "Screenshot a rectangular region of the screen (x, y, width, height)",
        args: {
          x: tool.schema.number().describe("Left coordinate"),
          y: tool.schema.number().describe("Top coordinate"),
          width: tool.schema.number().describe("Region width"),
          height: tool.schema.number().describe("Region height"),
          path: tool.schema.string().optional(),
        },
        async execute(args) {
          const out = args.path ?? screenshotPath(directory, `region-${Date.now()}.png`);
          return runVision({
            command: "capture-region",
            path: out,
            x: args.x,
            y: args.y,
            width: args.width,
            height: args.height,
          });
        },
      }),

      visionDescribe: tool({
        description:
          "OpenCode eyes overview: list open windows + optional full screenshot. Call when user asks what's on screen or before desktop UI tasks.",
        args: {
          path: tool.schema
            .string()
            .optional()
            .describe("If set, also capture full desktop to this path"),
          limit: tool.schema.number().optional().default(20),
        },
        async execute(args) {
          const out = args.path ?? screenshotPath(directory, `desktop-${Date.now()}.png`);
          return runVision({ command: "describe", path: out, limit: args.limit });
        },
      }),
    },
  };
};

export default VisionToolsPlugin;