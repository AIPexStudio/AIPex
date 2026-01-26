import { z } from "zod";
import { tool } from "./index.js";

const httpFetchParameters = z.object({
  url: z.string().url().describe("The URL to fetch"),
  headers: z
    .record(z.string(), z.string())
    .optional()
    .describe("Optional HTTP headers to include in the request"),
});

type HttpFetchInput = z.infer<typeof httpFetchParameters>;

export const httpFetchTool = tool({
  name: "http_fetch",
  description:
    "Fetch data from a URL using HTTP GET request. Returns the response body as text.",
  parameters: httpFetchParameters,
  execute: async (input: HttpFetchInput) => {
    try {
      const response = await fetch(input.url, {
        method: "GET",
        headers: input.headers as Record<string, string> | undefined,
      });

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} ${response.statusText}`,
        );
      }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return await response.json();
      }

      return await response.text();
    } catch (error) {
      throw new Error(
        `Failed to fetch ${input.url}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
