import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const removedBackendName = ["con", "vex"].join("");
const forbiddenPattern = new RegExp(removedBackendName, "i");
const sourceRoots = ["app", "components", "lib"];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const failures = [];

function sourceFiles(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : sourceExtensions.has(extname(path))
        ? [path]
        : [];
  });
}

const removedBackendPath = join(projectRoot, removedBackendName);
if (existsSync(removedBackendPath)) {
  failures.push(`${removedBackendName}/ still exists`);
}

for (const root of sourceRoots) {
  for (const file of sourceFiles(join(projectRoot, root))) {
    if (forbiddenPattern.test(readFileSync(file, "utf8"))) {
      failures.push(`${relative(projectRoot, file)} still references ${removedBackendName}`);
    }
  }
}

const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"));
if (packageJson.dependencies?.[removedBackendName] || packageJson.devDependencies?.[removedBackendName]) {
  failures.push(`${removedBackendName} is still listed as a dependency`);
}

for (const requiredPath of [
  "app/demo/page.tsx",
  "components/DemoDashboard.tsx",
  "lib/demoReels.ts",
]) {
  if (!existsSync(join(projectRoot, requiredPath))) {
    failures.push(`${requiredPath} is missing`);
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Demo-only architecture check passed.");
