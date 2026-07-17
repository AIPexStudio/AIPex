import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const scriptNames = [
  "init_skill.js",
  "write_file.js",
  "delete_file.js",
  "quick_validate.js",
  "package_skill.js",
];

describe("skill-creator script entry points", () => {
  it.each(scriptNames)("exposes main in %s", async (scriptName) => {
    const scriptPath = fileURLToPath(
      new URL(`scripts/${scriptName}`, import.meta.url),
    );
    const code = await readFile(scriptPath, "utf8");

    expect(code).toMatch(/async function main\(args\)/);
    expect(code).not.toMatch(/async function _main\(args\)/);
  });
});
