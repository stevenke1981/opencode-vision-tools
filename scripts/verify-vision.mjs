#!/usr/bin/env node
import { checkVision, runVision, screenshotPath } from "../src/opencode-vision-tools-runner.ts";

const status = checkVision();
console.log("ready:", status.ready);
console.log(status.doctor);

const out = screenshotPath(process.cwd(), "verify-vision.png");
const list = runVision({ command: "list-windows", limit: 5 });
console.log("windows:\n", list.slice(0, 500));

const cap = runVision({ command: "capture-screen", path: out });
console.log(cap);