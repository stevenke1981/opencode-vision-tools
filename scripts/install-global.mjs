#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const PLUGIN_NAME = "opencode-vision-tools";
const PLUGIN_FILE = `${PLUGIN_NAME}.ts`;
const PLUGIN_DEP = "@opencode-ai/plugin";
const PLUGIN_VERSION = "1.16.2";
const NPM_TIMEOUT_MS = 300_000;
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

const skipNpm = process.argv.includes("--skip-npm");

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

function runNpm(args) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  console.log(`> ${npm} ${args.join(" ")}`);
  const result = spawnSync(npm, args, {
    cwd: CONFIG_DIR,
    stdio: "inherit",
    shell: false,
    timeout: NPM_TIMEOUT_MS,
    env: { ...process.env, npm_config_progress: "true" },
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (result.status !== 0) {
    throw new Error(`npm exited with code ${result.status ?? "unknown"}`);
  }
}

async function ensurePackageJson() {
  if (skipNpm) {
    console.log("Skipping npm (--skip-npm).");
    return;
  }

  const pluginModule = path.join(CONFIG_DIR, "node_modules", PLUGIN_DEP);
  if (await exists(pluginModule)) {
    console.log(`${PLUGIN_DEP} already installed — skipping npm.`);
    return;
  }

  const pkgFile = path.join(CONFIG_DIR, "package.json");
  let pkg = { dependencies: {} };
  if (await exists(pkgFile)) {
    pkg = JSON.parse(await fs.readFile(pkgFile, "utf8"));
    pkg.dependencies = pkg.dependencies ?? {};
  }
  if (!pkg.dependencies[PLUGIN_DEP]) {
    pkg.dependencies[PLUGIN_DEP] = PLUGIN_VERSION;
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.writeFile(pkgFile, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  }

  console.log(`Installing ${PLUGIN_DEP}@${PLUGIN_VERSION} only (not full opencode config deps)...`);
  runNpm([
    "install",
    `${PLUGIN_DEP}@${PLUGIN_VERSION}`,
    "--no-fund",
    "--no-audit",
    "--prefer-offline",
  ]);
  console.log(`${PLUGIN_DEP} installed.`);
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
  if (raw.includes(PLUGIN_NAME)) {
    console.log(`Plugin already registered in ${configFile}`);
    return;
  }

  let config;
  try {
    const stripped = raw.replace(/\/\/.*$/gm, "").replace(/,\s*([}\]])/g, "$1");
    config = JSON.parse(stripped);
  } catch {
    throw new Error(
      `Could not parse ${configFile}. Add manually to "plugin": ["${pluginEntry}"]`,
    );
  }

  config.plugin = Array.isArray(config.plugin) ? config.plugin : [];
  if (!config.plugin.includes(pluginEntry)) {
    config.plugin.push(pluginEntry);
  }
  await fs.writeFile(configFile, JSON.stringify(config, null, 2) + "\n", "utf8");
  console.log(`Registered plugin in ${configFile}`);
}

async function main() {
  console.log(`Installing ${PLUGIN_NAME}...`);
  console.log(`Config dir: ${CONFIG_DIR}`);
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