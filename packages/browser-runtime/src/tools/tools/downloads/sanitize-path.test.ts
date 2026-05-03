import { describe, expect, it } from "vitest";
import { sanitizeDownloadPath, sanitizeSegment } from "./sanitize-path";

describe("sanitizeSegment", () => {
  it("returns simple names unchanged", () => {
    expect(sanitizeSegment("hello")).toBe("hello");
    expect(sanitizeSegment("my-file")).toBe("my-file");
  });

  it("strips path separators", () => {
    expect(sanitizeSegment("a/b")).toBe("ab");
    expect(sanitizeSegment("a\\b")).toBe("ab");
    expect(sanitizeSegment("/etc/passwd")).toBe("etcpasswd");
  });

  it("removes .. traversal sequences", () => {
    expect(sanitizeSegment("..")).toBe("download");
    expect(sanitizeSegment("....")).toBe("download");
    expect(sanitizeSegment("..foo")).toBe("foo");
  });

  it("removes control characters", () => {
    expect(sanitizeSegment("file\x00name")).toBe("filename");
    expect(sanitizeSegment("file\x1fname")).toBe("filename");
  });

  it("removes illegal filesystem characters", () => {
    expect(sanitizeSegment('file<>:"|?*name')).toBe("filename");
  });

  it("trims leading/trailing dots and spaces", () => {
    expect(sanitizeSegment(".hidden")).toBe("hidden");
    expect(sanitizeSegment("file.")).toBe("file");
    expect(sanitizeSegment("  file  ")).toBe("file");
  });

  it("returns fallback for empty result", () => {
    expect(sanitizeSegment("")).toBe("download");
    expect(sanitizeSegment("///")).toBe("download");
    expect(sanitizeSegment("...", "fallback")).toBe("fallback");
  });
});

describe("sanitizeDownloadPath", () => {
  it("preserves simple folder/file paths", () => {
    expect(sanitizeDownloadPath("folder/file")).toBe("folder/file");
    expect(sanitizeDownloadPath("a/b/c")).toBe("a/b/c");
  });

  it("blocks classic path traversal — no .. in result", () => {
    const result = sanitizeDownloadPath("../../../etc/passwd");
    expect(result).not.toContain("..");
    // ".." segments are dropped; "etc" and "passwd" survive
    expect(result).toBe("etc/passwd");
  });

  it("blocks traversal via backslash", () => {
    const result = sanitizeDownloadPath("..\\..\\Desktop\\malware");
    expect(result).not.toContain("..");
    expect(result).toBe("Desktop/malware");
  });

  it("blocks mixed traversal", () => {
    const result = sanitizeDownloadPath("folder/../../secret");
    expect(result).not.toContain("..");
    expect(result).toBe("folder/secret");
  });

  it("collapses empty segments", () => {
    expect(sanitizeDownloadPath("a//b")).toBe("a/b");
    expect(sanitizeDownloadPath("/a/b/")).toBe("a/b");
  });

  it("returns fallback for entirely malicious input", () => {
    expect(sanitizeDownloadPath("../../..")).toBe("download");
    expect(sanitizeDownloadPath("")).toBe("download");
  });

  it("handles realistic attack payloads", () => {
    // Payload: attempt to write to Desktop via traversal
    const payload = "../../../Desktop/malware";
    const result = sanitizeDownloadPath(payload);
    expect(result).not.toContain("..");
    expect(result).toBe("Desktop/malware");
  });

  it("strips illegal chars from individual segments", () => {
    expect(sanitizeDownloadPath("my<folder>/my:file")).toBe("myfolder/myfile");
  });
});
