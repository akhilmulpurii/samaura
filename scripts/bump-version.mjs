import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");

const levelArg = process.argv.find((arg) => arg.startsWith("--level="));
const level = levelArg ? levelArg.split("=")[1] : "patch";

const allowedLevels = new Set(["major", "minor", "patch"]);
if (!allowedLevels.has(level)) {
  console.error(
    `Unsupported level "${level}". Use one of: ${Array.from(allowedLevels).join(", ")}.`,
  );
  process.exit(1);
}

const bumpTable = {
  major: [1, 0, 0],
  minor: [0, 1, 0],
  patch: [0, 0, 1],
};

function bumpVersion(current, bumpLevel) {
  const parts = current.split(".").map((part) => Number.parseInt(part, 10));

  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part) || part < 0)) {
    throw new Error(`Invalid semver string "${current}". Expecting format MAJOR.MINOR.PATCH.`);
  }

  const [major, minor, patch] = parts;
  const [bumpMajor, bumpMinor, bumpPatch] = bumpTable[bumpLevel];

  const next = [
    major + bumpMajor,
    bumpLevel === "major" ? 0 : minor + bumpMinor,
    bumpLevel === "patch" ? patch + bumpPatch : 0,
  ];

  if (bumpLevel === "minor") {
    next[2] = 0;
  }

  return next.join(".");
}

function writeJson(filePath, updater) {
  const content = readFileSync(filePath, "utf8");
  const data = JSON.parse(content);
  updater(data);
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function replaceVersionLine(filePath, matcher, replacerDescription, replacer) {
  const content = readFileSync(filePath, "utf8");
  const updated = content.replace(matcher, replacer);

  if (content === updated) {
    throw new Error(
      `Failed to update ${replacerDescription} in ${filePath}. Pattern not found.`,
    );
  }

  writeFileSync(filePath, updated);
}

function updateCargoLockVersion(filePath, packageName, newVersion) {
  const pattern =
    new RegExp(`(\\[\\[package\\]\\][\\s\\S]+?name = "${packageName}"[\\s\\S]+?version = ")` +
      `[^"]+(")`);
  replaceVersionLine(
    filePath,
    pattern,
    `package "${packageName}" version`,
    (_match, prefix, suffix) => `${prefix}${newVersion}${suffix}`,
  );
}

const packageJsonPath = resolve(repoRoot, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const currentVersion = packageJson.version;
const newVersion = bumpVersion(currentVersion, level);

writeJson(packageJsonPath, (data) => {
  data.version = newVersion;
});

const tauriConfigPath = resolve(repoRoot, "src-tauri", "tauri.conf.json");
writeJson(tauriConfigPath, (data) => {
  data.version = newVersion;
});

const cargoTomlPath = resolve(repoRoot, "src-tauri", "Cargo.toml");
replaceVersionLine(
  cargoTomlPath,
  /^version\s*=\s*".*?"$/m,
  "Cargo.toml package version",
  () => `version = "${newVersion}"`,
);

const cargoLockPath = resolve(repoRoot, "src-tauri", "Cargo.lock");
updateCargoLockVersion(cargoLockPath, "app", newVersion);

console.log(newVersion);
