/**
 * Tests for path traversal protection in the SKILL_API filesystem bridge.
 *
 * CWE-22: Skill code running in QuickJS VM can pass arbitrary paths to
 * filesystem operations. Without validation, one skill can read/write/delete
 * files belonging to other skills within the virtual filesystem.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { createSkillAPIBridge } from "./skill-api";

// Mock zenfs-manager so we don't need a real IndexedDB / ZenFS backend
vi.mock("./zenfs-manager", () => {
  const noop = vi.fn().mockResolvedValue(undefined);
  const noopSync = vi.fn();
  return {
    zenfs: {
      readFile: vi.fn().mockResolvedValue("file-content"),
      writeFile: noop,
      readdir: vi.fn().mockResolvedValue([]),
      exists: vi.fn().mockResolvedValue(true),
      mkdir: noop,
      rm: noop,
      stat: vi.fn().mockResolvedValue({
        isFile: true,
        isDirectory: false,
        size: 10,
        mtime: new Date(),
      }),
      existsSync: vi.fn().mockReturnValue(true),
      readFileSync: vi.fn().mockReturnValue("file-content"),
      writeFileSync: noopSync,
      readdirSync: vi.fn().mockReturnValue([]),
      mkdirSync: noopSync,
      rmSync: noopSync,
      statSync: vi.fn().mockReturnValue({
        isFile: true,
        isDirectory: false,
        size: 10,
        mtime: new Date(),
      }),
    },
  };
});

describe("skill-api path traversal protection", () => {
  const SKILL_ID = "test-skill-abc";
  let api: ReturnType<typeof createSkillAPIBridge>;

  beforeEach(() => {
    vi.clearAllMocks();
    api = createSkillAPIBridge({ skillId: SKILL_ID });
  });

  // ── Async methods ──────────────────────────────────────────────────

  describe("async fs methods reject path traversal", () => {
    it("readFile rejects '..' traversal", async () => {
      await expect(
        api.fs.readFile("../../other-skill/secrets.json"),
      ).rejects.toThrow();
    });

    it("readFile rejects absolute path to another skill", async () => {
      await expect(
        api.fs.readFile("/skills/other-skill/data.json"),
      ).rejects.toThrow();
    });

    it("writeFile rejects '..' traversal", async () => {
      await expect(
        api.fs.writeFile("../other-skill/payload", "pwned"),
      ).rejects.toThrow();
    });

    it("readdir rejects traversal to parent", async () => {
      await expect(api.fs.readdir("../../")).rejects.toThrow();
    });

    it("exists rejects traversal", async () => {
      await expect(api.fs.exists("../other-skill")).rejects.toThrow();
    });

    it("mkdir rejects traversal", async () => {
      await expect(api.fs.mkdir("../../etc")).rejects.toThrow();
    });

    it("rm rejects traversal", async () => {
      await expect(
        api.fs.rm("../other-skill", { recursive: true }),
      ).rejects.toThrow();
    });

    it("stat rejects traversal", async () => {
      await expect(api.fs.stat("../../other-skill")).rejects.toThrow();
    });
  });

  // ── Sync methods ───────────────────────────────────────────────────

  describe("sync fs methods reject path traversal", () => {
    it("existsSync rejects traversal", () => {
      expect(() => api.fs.existsSync("../../other-skill")).toThrow();
    });

    it("readFileSync rejects traversal", () => {
      expect(() => api.fs.readFileSync("../other-skill/data")).toThrow();
    });

    it("writeFileSync rejects traversal", () => {
      expect(() =>
        api.fs.writeFileSync("../other-skill/payload", "pwned"),
      ).toThrow();
    });

    it("readdirSync rejects traversal", () => {
      expect(() => api.fs.readdirSync("../../")).toThrow();
    });

    it("mkdirSync rejects traversal", () => {
      expect(() => api.fs.mkdirSync("../../etc")).toThrow();
    });

    it("rmSync rejects traversal", () => {
      expect(() => api.fs.rmSync("../other-skill")).toThrow();
    });

    it("statSync rejects traversal", () => {
      expect(() => api.fs.statSync("../../other-skill")).toThrow();
    });
  });

  // ── Allowed paths ─────────────────────────────────────────────────

  describe("allows valid paths within skill directory", () => {
    it("readFile allows relative path within skill dir", async () => {
      await expect(api.fs.readFile("data/config.json")).resolves.toBeDefined();
    });

    it("readFile allows simple filename", async () => {
      await expect(api.fs.readFile("file.txt")).resolves.toBeDefined();
    });

    it("writeFile allows relative path within skill dir", async () => {
      await expect(
        api.fs.writeFile("output/result.json", "{}"),
      ).resolves.toBeUndefined();
    });

    it("readdir allows current directory", async () => {
      await expect(api.fs.readdir(".")).resolves.toBeDefined();
    });

    it("exists allows subdirectory", async () => {
      await expect(api.fs.exists("subdir")).resolves.toBeDefined();
    });

    it("existsSync allows subdirectory", () => {
      expect(() => api.fs.existsSync("subdir")).not.toThrow();
    });

    it("readFileSync allows relative path", () => {
      expect(() => api.fs.readFileSync("data.txt")).not.toThrow();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("rejects path with embedded null byte", async () => {
      await expect(api.fs.readFile("data\0../../etc")).rejects.toThrow();
    });

    it("rejects path that resolves outside via middle '..'", async () => {
      await expect(
        api.fs.readFile("subdir/../../other-skill/file"),
      ).rejects.toThrow();
    });

    it("allows path with '..' that stays inside skill dir", async () => {
      // e.g. "subdir/../file.txt" resolves to "file.txt" which is still inside
      await expect(
        api.fs.readFile("subdir/../file.txt"),
      ).resolves.toBeDefined();
    });
  });
});
