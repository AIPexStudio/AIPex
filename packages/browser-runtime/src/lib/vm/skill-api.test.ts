import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSkillAPIBridge } from "./skill-api";
import { assertSkillFetchUrlAllowed, SsrfBlockedError } from "./url-guard";

describe("assertSkillFetchUrlAllowed", () => {
  it("allows public https URLs", () => {
    expect(() =>
      assertSkillFetchUrlAllowed("https://example.com/path"),
    ).not.toThrow();
    expect(() =>
      assertSkillFetchUrlAllowed("http://example.com"),
    ).not.toThrow();
  });

  it("blocks non-http(s) schemes", () => {
    expect(() => assertSkillFetchUrlAllowed("file:///etc/passwd")).toThrow(
      SsrfBlockedError,
    );
    expect(() => assertSkillFetchUrlAllowed("ftp://example.com")).toThrow(
      SsrfBlockedError,
    );
    expect(() => assertSkillFetchUrlAllowed("chrome://settings")).toThrow(
      SsrfBlockedError,
    );
    expect(() => assertSkillFetchUrlAllowed("javascript:alert(1)")).toThrow(
      SsrfBlockedError,
    );
  });

  it("blocks loopback hostnames and addresses", () => {
    expect(() => assertSkillFetchUrlAllowed("http://localhost/")).toThrow(
      SsrfBlockedError,
    );
    expect(() => assertSkillFetchUrlAllowed("http://127.0.0.1/")).toThrow(
      SsrfBlockedError,
    );
    expect(() => assertSkillFetchUrlAllowed("http://127.255.0.1/")).toThrow(
      SsrfBlockedError,
    );
    expect(() => assertSkillFetchUrlAllowed("http://[::1]/")).toThrow(
      SsrfBlockedError,
    );
  });

  it("blocks cloud-metadata link-local 169.254.169.254", () => {
    expect(() =>
      assertSkillFetchUrlAllowed("http://169.254.169.254/latest/meta-data/"),
    ).toThrow(SsrfBlockedError);
  });

  it("blocks RFC1918 private ranges", () => {
    expect(() => assertSkillFetchUrlAllowed("http://10.0.0.1/")).toThrow(
      SsrfBlockedError,
    );
    expect(() => assertSkillFetchUrlAllowed("http://172.16.5.4/")).toThrow(
      SsrfBlockedError,
    );
    expect(() => assertSkillFetchUrlAllowed("http://172.31.255.255/")).toThrow(
      SsrfBlockedError,
    );
    expect(() => assertSkillFetchUrlAllowed("http://192.168.1.1/")).toThrow(
      SsrfBlockedError,
    );
  });

  it("blocks IPv4-mapped IPv6 loopback", () => {
    expect(() =>
      assertSkillFetchUrlAllowed("http://[::ffff:127.0.0.1]/"),
    ).toThrow(SsrfBlockedError);
  });

  it("blocks IPv6 link-local and ULA", () => {
    expect(() => assertSkillFetchUrlAllowed("http://[fe80::1]/")).toThrow(
      SsrfBlockedError,
    );
    expect(() => assertSkillFetchUrlAllowed("http://[fc00::1]/")).toThrow(
      SsrfBlockedError,
    );
    expect(() => assertSkillFetchUrlAllowed("http://[fd12:3456::1]/")).toThrow(
      SsrfBlockedError,
    );
  });

  it("blocks .local / .internal / .localhost suffixes", () => {
    expect(() => assertSkillFetchUrlAllowed("http://printer.local/")).toThrow(
      SsrfBlockedError,
    );
    expect(() =>
      assertSkillFetchUrlAllowed("http://service.internal/"),
    ).toThrow(SsrfBlockedError);
    expect(() => assertSkillFetchUrlAllowed("http://app.localhost/")).toThrow(
      SsrfBlockedError,
    );
  });

  it("permits non-private public IPs", () => {
    expect(() => assertSkillFetchUrlAllowed("http://8.8.8.8/")).not.toThrow();
    expect(() => assertSkillFetchUrlAllowed("https://1.1.1.1/")).not.toThrow();
  });
});

describe("SKILL_API.fetch SSRF guard", () => {
  const originalFetch = globalThis.fetch;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(
      async () =>
        new Response("ok", {
          status: 200,
          headers: { "content-type": "text/plain" },
        }),
    );
    // @ts-expect-error - override global fetch for the test
    globalThis.fetch = fetchSpy;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("forwards public URLs to host fetch", async () => {
    const api = createSkillAPIBridge({ skillId: "test" });
    const result = await api.fetch("https://example.com/data");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it("rejects SSRF attempts to cloud metadata without invoking host fetch", async () => {
    const api = createSkillAPIBridge({ skillId: "test" });
    await expect(
      api.fetch(
        "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
      ),
    ).rejects.toThrow(/Fetch failed/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects SSRF attempts to localhost without invoking host fetch", async () => {
    const api = createSkillAPIBridge({ skillId: "test" });
    await expect(api.fetch("http://localhost:8080/admin")).rejects.toThrow(
      /Fetch failed/,
    );
    await expect(api.fetch("http://127.0.0.1/")).rejects.toThrow(
      /Fetch failed/,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects file:// scheme attempts", async () => {
    const api = createSkillAPIBridge({ skillId: "test" });
    await expect(api.fetch("file:///etc/passwd")).rejects.toThrow(
      /Fetch failed/,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not follow redirects (defense-in-depth against redirect-to-internal)", async () => {
    const api = createSkillAPIBridge({ skillId: "test" });
    await api.fetch("https://example.com/");
    const callOptions = fetchSpy.mock.calls[0][1];
    expect(callOptions.redirect).toBe("error");
  });
});
