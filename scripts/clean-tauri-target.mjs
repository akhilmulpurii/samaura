import { rm } from "node:fs/promises";
import { resolve } from "node:path";

async function main() {
  const targetDir = resolve("src-tauri", "target");

  try {
    await rm(targetDir, { recursive: true, force: true });
    console.log(`Removed ${targetDir}`);
  } catch (error) {
    console.error(`Failed to remove ${targetDir}`, error);
    process.exit(1);
  }
}

main();
