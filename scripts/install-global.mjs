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
const GLOBAL_CONFIG = path.join(HOME, ".config");
const OPENCODE_DIR = process.env.OPENCODE_CONFIG_DIR
  ? path.resolve(process.env.OPENCODE_CONFIG_DIR.replace(/^~/, HOME))
  : path.join(GLOBAL_CONFIG, "opencode");
const INSTALL_DIR = process.env.INSTALL_DIR
  ? path.resolve(process.env.INSTALL_DIR.replace(/^~/, HOME))
  : path.join(GLOBAL_CONFIG, PLUGIN_NAME);

const PLUGINS_DIR = path.join(OPENCODE_DIR, "plugins");
const COMMANDS_DIR = path.join(OPENCODE_DIR, "commands");
const TARGET_PLUGIN_DIR = path.join(PLUGINS_DIR, PLUGIN_NAME);
const TARGET_PLUGIN = path.join(TARGET_PLUGIN_DIR, "index.ts");

const SUPPORT_FILES = [
  "opencode-vision-tools-runner.ts",
  "opencode-vision-tools-guidance.ts",
  "vision-windows.ps1",
];
const OLD_ROOT_FILES = [PLUGIN_FILE, ...SUPPORT_FILES];

const SYNC_ITEMS = ["src", "commands", "scripts", "package.json", "install.ps1", "install.sh", "README.md", "LICENSE", "opencode.json.example"];

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

async function copyTree(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyTree(from, to);
    } else {
      await fs.copyFile(from, to);
    }
  }
}

async function syncToGlobalInstallDir() {
  if (path.resolve(ROOT) === path.resolve(INSTALL_DIR)) {
    return INSTALL_DIR;
  }
  await fs.mkdir(INSTALL_DIR, { recursive: true });
  for (const item of SYNC_ITEMS) {
    const src = path.join(ROOT, item);
    if (!(await exists(src))) continue;
    const dest = path.join(INSTALL_DIR, item);
    const stat = await fs.stat(src);
    if (stat.isDirectory()) {
      await fs.rm(dest, { recursive: true, force: true }).catch(() => {});
      await copyTree(src, dest);
    } else {
      await fs.copyFile(src, dest);
    }
  }
  console.log(`Global install dir -> ${INSTALL_DIR}`);
  return INSTALL_DIR;
}

function runNpm(args, cwd) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  console.log(`> ${npm} ${args.join(" ")}`);
  const result = spawnSync(npm, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    timeout: NPM_TIMEOUT_MS,
    env: { ...process.env, npm_config_progress: "true" },
  });
  if (result.error) throw new Error(result.error.message);
  if (result.status !== 0) throw new Error(`npm exited with code ${result.status ?? "unknown"}`);
}

async function ensurePackageJson() {
  if (skipNpm) {
    console.log("Skipping npm (--skip-npm).");
    return;
  }

  const pluginModule = path.join(OPENCODE_DIR, "node_modules", PLUGIN_DEP);
  if (await exists(pluginModule)) {
    console.log(`${PLUGIN_DEP} already installed — skipping npm.`);
    return;
  }

  const pkgFile = path.join(OPENCODE_DIR, "package.json");
  let pkg = { dependencies: {} };
  if (await exists(pkgFile)) {
    pkg = JSON.parse(await fs.readFile(pkgFile, "utf8"));
    pkg.dependencies = pkg.dependencies ?? {};
  }
  if (!pkg.dependencies[PLUGIN_DEP]) {
    pkg.dependencies[PLUGIN_DEP] = PLUGIN_VERSION;
    await fs.mkdir(OPENCODE_DIR, { recursive: true });
    await fs.writeFile(pkgFile, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  }

  console.log(`Installing ${PLUGIN_DEP}@${PLUGIN_VERSION} only...`);
  runNpm(["install", `${PLUGIN_DEP}@${PLUGIN_VERSION}`, "--no-fund", "--no-audit", "--prefer-offline"], OPENCODE_DIR);
  console.log(`${PLUGIN_DEP} installed.`);
}

async function registerInConfig(pluginEntry) {
  const candidates = ["opencode.jsonc", "opencode.json"];
  let configFile = null;
  for (const name of candidates) {
    const p = path.join(OPENCODE_DIR, name);
    if (await exists(p)) {
      configFile = p;
      break;
    }
  }
  if (!configFile) {
    configFile = path.join(OPENCODE_DIR, "opencode.jsonc");
    await fs.writeFile(
      configFile,
      JSON.stringify({ $schema: "https://opencode.ai/config.json", plugin: [pluginEntry] }, null, 2) + "\n",
      "utf8",
    );
    return;
  }

  const raw = await fs.readFile(configFile, "utf8");
  let config;
  try {
    const stripped = raw.replace(/^\s*\/\/.*$/gm, "").replace(/,\s*([}\]])/g, "$1");
    config = JSON.parse(stripped);
  } catch {
    throw new Error(`Could not parse ${configFile}. Add manually to "plugin": ["${pluginEntry}"]`);
  }

  config.plugin = Array.isArray(config.plugin) ? config.plugin : [];
  config.plugin = config.plugin.filter(
    (p) => typeof p !== "string" || !p.includes(PLUGIN_NAME),
  );
  config.plugin.push(pluginEntry);
  await fs.writeFile(configFile, JSON.stringify(config, null, 2) + "\n", "utf8");
  console.log(`Registered plugin in ${configFile}`);
}

async function main() {
  console.log(`Installing ${PLUGIN_NAME} globally...`);
  const sourceDir = await syncToGlobalInstallDir();
  console.log(`OpenCode config: ${OPENCODE_DIR}`);
  await fs.mkdir(PLUGINS_DIR, { recursive: true });
  await fs.mkdir(TARGET_PLUGIN_DIR, { recursive: true });
  await fs.mkdir(COMMANDS_DIR, { recursive: true });

  for (const file of OLD_ROOT_FILES) {
    await fs.rm(path.join(PLUGINS_DIR, file), { force: true });
  }

  for (const file of await fs.readdir(path.join(sourceDir, "src"))) {
    const dest = path.join(TARGET_PLUGIN_DIR, file);
    await fs.copyFile(path.join(sourceDir, "src", file), dest);
    console.log(`${file === "index.ts" ? "Plugin" : "Module"} -> ${dest}`);
  }

  for (const file of await fs.readdir(path.join(sourceDir, "commands"))) {
    const dest = path.join(COMMANDS_DIR, file);
    await fs.copyFile(path.join(sourceDir, "commands", file), dest);
    console.log(`Command -> ${dest}`);
  }

  await ensurePackageJson();
  await registerInConfig(toConfigPath(TARGET_PLUGIN));

  console.log("\nDone! Restart OpenCode.");
  console.log(`Global project: ${INSTALL_DIR}`);
  console.log(`Plugin entry: ${toConfigPath(TARGET_PLUGIN)}`);
  console.log("Tools: visionDoctor, visionDescribe, visionListWindows, visionFindWindow, visionFocusWindow, visionLocateApp, visionCaptureScreen, visionCaptureWindow, visionCaptureRegion, visionScreenInfo");
  console.log("Commands: /vision-guide, /vision-screenshot, /vision-find-app");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
