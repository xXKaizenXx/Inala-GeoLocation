const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

const cwd = process.cwd();
const nodeModules = path.join(cwd, "node_modules");

// If Render skips dependency installation, TypeScript fails with TS2307.
// This hook makes the build self-healing by installing prod deps before `tsc`.
const needInstall =
  !exists(nodeModules) ||
  !exists(path.join(nodeModules, "express", "package.json")) ||
  !exists(path.join(nodeModules, "@types", "cors")) ||
  !exists(path.join(nodeModules, "@types", "express")) ||
  !exists(path.join(nodeModules, "@types", "node"));

if (needInstall) {
  // eslint-disable-next-line no-console
  console.log("[ensure-deps] node_modules missing; installing production deps...");
  // We need dev dependencies (notably `typescript`/`tsc`) for the build step.
  // Render sometimes skips/changes install behavior across environments.
  childProcess.execSync("npm install", { stdio: "inherit" });
}

