import { z } from "zod";
import { Tool } from "../base.js";
import type { ToolContext } from "../types.js";

const HttpFetchSchema = z.object({
  url: z.string().url().describe("The URL to fetch"),
  method: z
    .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
    .describe("HTTP method"),
  headers: z
    .record(z.string())
    .optional()
    .describe("HTTP headers as key-value pairs"),
  body: z.string().optional().describe("Request body (for POST, PUT, PATCH)"),
  timeout: z.number().optional().describe("Request timeout in milliseconds"),
});

type HttpFetchParams = z.input<typeof HttpFetchSchema>;

interface HttpFetchResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  url: string;
}

export class HttpFetchTool extends Tool<HttpFetchParams, HttpFetchResult> {
  readonly name = "http_fetch";
  readonly description =
    "Fetch data from a URL using HTTP. Supports GET, POST, PUT, PATCH, and DELETE methods.";
  readonly schema = HttpFetchSchema;

  async execute(
    params: HttpFetchParams,
    context: ToolContext,
  ): Promise<HttpFetchResult> {
    const { url, method = "GET", headers, body, timeout = 30000 } = params;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Combine context signal with timeout signal
    if (context.signal) {
      context.signal.addEventListener("abort", () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        method,
        headers: headers || {},
        body: method !== "GET" && body ? body : undefined,
        signal: controller.signal,
      });

      // Convert headers to plain object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Get response body as text
      const responseBody = await response.text();

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        url: response.url,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
