import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const removedBackendName = ["con", "vex"].join("");
const forbiddenPattern = new RegExp(removedBackendName, "i");
const sourceRoots = ["app", "components", "lib"];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const failures = [];
const expectedReels = Array.from({ length: 3 }, (_, weekIndex) =>
  Array.from(
    { length: 3 },
    (_, slot) => `public/reels/week${weekIndex + 1}_slot${slot}.mp4`,
  ),
).flat();

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

if (existsSync(join(projectRoot, removedBackendName))) {
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
  "components/MetricsChart.tsx",
  "components/ProductInputForm.tsx",
  "components/ReelPreview.tsx",
  "app/programs/new/page.tsx",
  "lib/demoReels.ts",
  "lib/demoProgram.ts",
]) {
  if (!existsSync(join(projectRoot, requiredPath))) {
    failures.push(`${requiredPath} is missing`);
  }
}

const fixtureSource = readFileSync(join(projectRoot, "lib/demoReels.ts"), "utf8");
const fixtureReels = Array.from(
  fixtureSource.matchAll(/videoPath:\s*reelPath\((\d+),\s*(\d+)\)/g),
  ([, week, oneBasedIndex]) =>
    `public/reels/week${week}_slot${Number(oneBasedIndex) - 1}.mp4`,
);

if (
  fixtureReels.length !== expectedReels.length ||
  new Set(fixtureReels).size !== expectedReels.length
) {
  failures.push("lib/demoReels.ts must reference exactly nine unique reel slots");
}

for (const expectedReel of expectedReels) {
  if (!fixtureReels.includes(expectedReel)) {
    failures.push(`lib/demoReels.ts does not reference ${expectedReel}`);
  }

  const reelPath = join(projectRoot, expectedReel);
  if (!existsSync(reelPath)) {
    failures.push(`${expectedReel} is missing`);
  } else if (statSync(reelPath).size === 0) {
    failures.push(`${expectedReel} is empty`);
  }
}

const reelsDirectory = join(projectRoot, "public", "reels");
const bundledReels = existsSync(reelsDirectory)
  ? readdirSync(reelsDirectory)
      .filter((name) => extname(name).toLowerCase() === ".mp4")
      .map((name) => `public/reels/${name}`)
      .sort()
  : [];
const unexpectedReels = bundledReels.filter((path) => !expectedReels.includes(path));
if (unexpectedReels.length > 0) {
  failures.push(`unexpected bundled reels: ${unexpectedReels.join(", ")}`);
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Demo-only architecture check passed.");
