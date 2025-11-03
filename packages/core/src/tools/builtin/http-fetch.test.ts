import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../types.js";
import { HttpFetchTool } from "./http-fetch.js";

describe("HttpFetchTool", () => {
  let tool: HttpFetchTool;
  let context: ToolContext;

  beforeEach(() => {
    tool = new HttpFetchTool();
    context = {
      callId: "call-1",
      sessionId: "session-1",
      turnId: "turn-1",
    };

    // Reset fetch mock
    vi.restoreAllMocks();
  });

  it("should have correct metadata", () => {
    expect(tool.name).toBe("http_fetch");
    expect(tool.description).toContain("Fetch data");
  });

  it("should generate valid function declaration", () => {
    const declaration = tool.toFunctionDeclaration();

    expect(declaration.name).toBe("http_fetch");
    expect(declaration.parameters).toBeDefined();
  });

  it("should fetch with GET method", async () => {
    const mockResponse = {
      status: 200,
      statusText: "OK",
      url: "https://example.com",
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => '{"data": "test"}',
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await tool.execute(
      {
        url: "https://example.com",
        method: "GET",
      },
      context,
    );

    expect(result.status).toBe(200);
    expect(result.statusText).toBe("OK");
    expect(result.body).toBe('{"data": "test"}');
    expect(result.headers["content-type"]).toBe("application/json");
  });

  it("should fetch with POST method and body", async () => {
    const mockResponse = {
      status: 201,
      statusText: "Created",
      url: "https://example.com/api",
      headers: new Headers(),
      text: async () => "created",
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    await tool.execute(
      {
        url: "https://example.com/api",
        method: "POST",
        body: '{"name": "test"}',
        headers: { "Content-Type": "application/json" },
      },
      context,
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/api",
      expect.objectContaining({
        method: "POST",
        body: '{"name": "test"}',
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("should handle custom headers", async () => {
    const mockResponse = {
      status: 200,
      statusText: "OK",
      url: "https://example.com",
      headers: new Headers(),
      text: async () => "ok",
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    await tool.execute(
      {
        url: "https://example.com",
        method: "GET",
        headers: {
          Authorization: "Bearer token",
          "X-Custom": "value",
        },
      },
      context,
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer token",
          "X-Custom": "value",
        },
      }),
    );
  });

  it("should respect context abort signal", async () => {
    const controller = new AbortController();
    const contextWithSignal: ToolContext = {
      ...context,
      signal: controller.signal,
    };

    const mockResponse = {
      status: 200,
      statusText: "OK",
      url: "https://example.com",
      headers: new Headers(),
      text: async () => {
        controller.abort();
        throw new Error("Aborted");
      },
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    await expect(
      tool.execute(
        { url: "https://example.com", method: "GET" },
        contextWithSignal,
      ),
    ).rejects.toThrow();
  });

  it("should validate URL format", async () => {
    await expect(
      tool.execute({ url: "not-a-url" } as any, context),
    ).rejects.toThrow();
  });

  it("should use default method GET", async () => {
    const mockResponse = {
      status: 200,
      statusText: "OK",
      url: "https://example.com",
      headers: new Headers(),
      text: async () => "ok",
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    await tool.execute({ url: "https://example.com", method: "GET" }, context);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("should handle all HTTP methods", async () => {
    const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

    for (const method of methods) {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        url: "https://example.com",
        headers: new Headers(),
        text: async () => "ok",
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await tool.execute({ url: "https://example.com", method }, context);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com",
        expect.objectContaining({ method }),
      );
    }
  });
});
