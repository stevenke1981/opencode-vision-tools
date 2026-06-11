#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const PLUGIN_NAME = "opencode-vision-tools";
const PLUGIN_FILE = `${PLUGIN_NAME}.ts`;
const ROOT = path.resolve(import.meta.dirname, "..");
const HOME = os.homedir();
const CONFIG_DIR = process.env.OPENCODE_CONFIG_DIR
  ? path.resolve(process.env.OPENCODE_CONFIG_DIR.replace(/^~/, HOME))
  : path.join(HOME, ".config", "opencode");

const PLUGINS_DIR = path.join(CONFIG_DIR, "plugins");
const COMMANDS_DIR = path.join(CONFIG_DIR, "commands");
const TARGET_PLUGIN = path.join(PLUGINS_DIR, PLUGIN_FILE);

const SUPPORT_FILES = [
  "opencode-vision-tools-runner.ts",
  "opencode-vision-tools-guidance.ts",
  "vision-windows.ps1",
];

function toConfigPath(absPath) {
  const normalized = absPath.replace(/\\/g, "/");
  if (normalized.startsWith(HOME.replace(/\\/g, "/"))) {
    return `~${normalized.slice(HOME.replace(/\\/g, "/").length)}`;
  }
  if (process.platform === "win32" && /^[A-Za-z]:/.test(normalized)) {
    return `/${normalized[0].toLowerCase()}${normalized.slice(2)}`;
  }
  return normalized;
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensurePackageJson() {
  const pkgFile = path.join(CONFIG_DIR, "package.json");
  let pkg = { dependencies: {} };
  let changed = false;
  if (await exists(pkgFile)) {
    pkg = JSON.parse(await fs.readFile(pkgFile, "utf8"));
    pkg.dependencies = pkg.dependencies ?? {};
  }
  if (!pkg.dependencies["@opencode-ai/plugin"]) {
    pkg.dependencies["@opencode-ai/plugin"] = "1.16.2";
    changed = true;
  }
  if (changed || !(await exists(path.join(CONFIG_DIR, "node_modules", "@opencode-ai", "plugin")))) {
    await fs.writeFile(pkgFile, JSON.stringify(pkg, null, 2) + "\n", "utf8");
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    spawnSync(npm, ["install", "--prefix", CONFIG_DIR], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
  }
}

async function registerInConfig(pluginEntry) {
  const candidates = ["opencode.jsonc", "opencode.json"];
  let configFile = null;
  for (const name of candidates) {
    const p = path.join(CONFIG_DIR, name);
    if (await exists(p)) {
      configFile = p;
      break;
    }
  }
  if (!configFile) {
    configFile = path.join(CONFIG_DIR, "opencode.jsonc");
    await fs.writeFile(
      configFile,
      JSON.stringify({ $schema: "https://opencode.ai/config.json", plugin: [pluginEntry] }, null, 2) + "\n",
      "utf8",
    );
    return;
  }
  const raw = await fs.readFile(configFile, "utf8");
  if (raw.includes(PLUGIN_NAME)) return;
  const pluginLine = `    "${pluginEntry}"`;
  const updated = /"plugin"\s*:\s*\[/.test(raw)
    ? raw.replace(/("plugin"\s*:\s*\[)([\s\S]*?)(\])/m, (_m, open, inner, close) => {
        const sep = inner.trim() ? ",\n" : "\n";
        return `${open}${inner.replace(/\s*,\s*$/, "")}${sep}${pluginLine}\n  ${close}`;
      })
    : raw.replace(/\{/, `{\n  "plugin": [\n${pluginLine}\n  ],`);
  await fs.writeFile(configFile, updated, "utf8");
}

async function main() {
  console.log(`Installing ${PLUGIN_NAME}...`);
  await fs.mkdir(PLUGINS_DIR, { recursive: true });
  await fs.mkdir(COMMANDS_DIR, { recursive: true });

  await fs.copyFile(path.join(ROOT, "src", "index.ts"), TARGET_PLUGIN);
  console.log(`Plugin -> ${TARGET_PLUGIN}`);

  for (const file of SUPPORT_FILES) {
    const dest = path.join(PLUGINS_DIR, file);
    await fs.copyFile(path.join(ROOT, "src", file), dest);
    console.log(`Module -> ${dest}`);
  }

  for (const file of await fs.readdir(path.join(ROOT, "commands"))) {
    const dest = path.join(COMMANDS_DIR, file);
    await fs.copyFile(path.join(ROOT, "commands", file), dest);
    console.log(`Command -> ${dest}`);
  }

  await ensurePackageJson();
  await registerInConfig(toConfigPath(TARGET_PLUGIN));

  console.log("\nDone! Restart OpenCode.");
  console.log("Tools: visionDoctor, visionDescribe, visionListWindows, visionFindWindow, visionFocusWindow, visionLocateApp, visionCaptureScreen, visionCaptureWindow, visionCaptureRegion, visionScreenInfo");
  console.log("Commands: /vision-guide, /vision-screenshot, /vision-find-app");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});