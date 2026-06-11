import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type VisionPlatform = "windows" | "darwin" | "linux" | "unsupported";

export type VisionCommandArgs = {
  command: string;
  path?: string;
  query?: string;
  processId?: number;
  title?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  limit?: number;
  includeHidden?: boolean;
  timeoutMs?: number;
};

const DEFAULT_MAX_OUTPUT = 20_000;

function pluginDir(): string {
  try {
    return dirname(fileURLToPath(import.meta.url));
  } catch {
    return join(homedir(), ".config", "opencode", "plugins");
  }
}

export function detectPlatform(): VisionPlatform {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return "darwin";
  if (process.platform === "linux") return "linux";
  return "unsupported";
}

function truncate(text: string, max = DEFAULT_MAX_OUTPUT): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n\n...(truncated)`;
}

function runPowerShellScript(args: VisionCommandArgs): string {
  const script = join(pluginDir(), "vision-windows.ps1");
  if (!existsSync(script)) {
    throw new Error(`vision-windows.ps1 not found at ${script}. Re-run install.ps1`);
  }

  const psArgs = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    script,
    "-Command",
    args.command,
  ];
  if (args.path) psArgs.push("-Path", args.path);
  if (args.query) psArgs.push("-Query", args.query);
  if (args.processId) psArgs.push("-ProcessId", String(args.processId));
  if (args.title) psArgs.push("-Title", args.title);
  if (args.x !== undefined) psArgs.push("-X", String(args.x));
  if (args.y !== undefined) psArgs.push("-Y", String(args.y));
  if (args.width) psArgs.push("-Width", String(args.width));
  if (args.height) psArgs.push("-Height", String(args.height));
  if (args.limit) psArgs.push("-Limit", String(args.limit));
  if (args.includeHidden) psArgs.push("-IncludeHidden");

  const result = spawnSync("powershell", psArgs, {
    encoding: "utf8",
    timeout: args.timeoutMs ?? 60_000,
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error) throw new Error(result.error.message);
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `exit ${result.status}`).trim());
  }
  return truncate(result.stdout || "");
}

function runShell(cmd: string, shellArgs: string[], timeoutMs = 60_000): string {
  const result = spawnSync(cmd, shellArgs, {
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) throw new Error(result.error.message);
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `exit ${result.status}`).trim());
  }
  return truncate(result.stdout || result.stderr || "");
}

function runDarwin(args: VisionCommandArgs): string {
  switch (args.command) {
    case "doctor":
      return runShell("sw_vers", []);
    case "screen-info": {
      const out = runShell("system_profiler", ["SPDisplaysDataType"]);
      return truncate(out, 3000);
    }
    case "list-windows":
    case "find-window": {
      const script = args.query
        ? `tell application "System Events" to get name of every process whose name contains "${args.query}"`
        : `tell application "System Events" to get {name, id} of every window of every process`;
      return runShell("osascript", ["-e", script]);
    }
    case "capture-screen": {
      if (!args.path) throw new Error("path required");
      runShell("screencapture", ["-x", args.path]);
      return `Screenshot: ${args.path}`;
    }
    case "capture-window": {
      if (!args.path) throw new Error("path required");
      runShell("screencapture", ["-x", "-w", args.path]);
      return `Screenshot (interactive window): ${args.path}`;
    }
    case "locate-app": {
      if (!args.query) throw new Error("query required");
      return runShell("mdfind", [`kMDItemDisplayName == '*${args.query}*'c`]);
    }
    case "describe": {
      const wins = runDarwin({ command: "list-windows", limit: args.limit });
      let out = `=== macOS desktop ===\n${wins}`;
      if (args.path) {
        runDarwin({ command: "capture-screen", path: args.path });
        out += `\nScreenshot: ${args.path}`;
      }
      return out;
    }
    default:
      throw new Error(`Command ${args.command} not fully supported on macOS. Use capture-screen or list-windows.`);
  }
}

function runLinux(args: VisionCommandArgs): string {
  const hasScrot = spawnSync("which", ["scrot"], { encoding: "utf8" }).status === 0;
  const hasWmctrl = spawnSync("which", ["wmctrl"], { encoding: "utf8" }).status === 0;

  switch (args.command) {
    case "doctor":
      return `platform: linux\nscrot: ${hasScrot}\nwmctrl: ${hasWmctrl}`;
    case "list-windows":
    case "find-window": {
      if (!hasWmctrl) throw new Error("wmctrl not installed. Install: sudo apt install wmctrl");
      const cmd = args.query ? ["-l"] : ["-l"];
      let out = runShell("wmctrl", cmd);
      if (args.query) {
        out = out
          .split("\n")
          .filter((l) => l.toLowerCase().includes(args.query!.toLowerCase()))
          .join("\n");
      }
      return out || "No matching windows.";
    }
    case "capture-screen": {
      if (!args.path) throw new Error("path required");
      if (!hasScrot) throw new Error("scrot not installed. Install: sudo apt install scrot");
      runShell("scrot", [args.path]);
      return `Screenshot: ${args.path}`;
    }
    case "focus-window": {
      if (!hasWmctrl || !args.title) throw new Error("wmctrl + title required");
      runShell("wmctrl", ["-a", args.title]);
      return `Focused: ${args.title}`;
    }
    case "describe": {
      let out = "=== Linux desktop ===\n";
      if (hasWmctrl) out += runLinux({ command: "list-windows", limit: args.limit });
      if (args.path && hasScrot) {
        runLinux({ command: "capture-screen", path: args.path });
        out += `\nScreenshot: ${args.path}`;
      }
      return out;
    }
    default:
      throw new Error(`Command ${args.command} limited on Linux. Install scrot + wmctrl.`);
  }
}

export function runVision(args: VisionCommandArgs): string {
  const platform = detectPlatform();
  switch (platform) {
    case "windows":
      return runPowerShellScript(args);
    case "darwin":
      return runDarwin(args);
    case "linux":
      return runLinux(args);
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

export function checkVision(): {
  platform: VisionPlatform;
  ready: boolean;
  doctor: string;
} {
  try {
    const doctor = runVision({ command: "doctor", timeoutMs: 30_000 });
    return { platform: detectPlatform(), ready: true, doctor };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { platform: detectPlatform(), ready: false, doctor: message };
  }
}

export function screenshotPath(directory: string, filename?: string): string {
  const name = filename ?? `vision-${Date.now()}.png`;
  return join(directory, name);
}