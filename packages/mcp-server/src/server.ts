/**
 * MCP server that exposes AIPex browser tools to external AI agents.
 * Bridges MCP protocol to the browser extension via WebSocket.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WsBridge } from "./bridge/ws-bridge.js";
import { SCREENSHOT_TOOLS, toolDefinitions } from "./tools/tool-definitions.js";

export function createMcpServer(bridge: WsBridge): McpServer {
  const server = new McpServer({
    name: "aipex",
    version: "0.0.1",
  });

  for (const def of toolDefinitions) {
    server.tool(def.name, def.description, def.inputSchema, async (args) => {
      const response = await bridge.callTool(def.name, args);

      if (!response.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: response.error ?? "Tool execution failed",
            },
          ],
          isError: true,
        };
      }

      const result = response.result as Record<string, unknown> | undefined;

      // Screenshot tools: return image content if imageData is present
      if (SCREENSHOT_TOOLS.has(def.name) && result?.imageData) {
        const imageDataStr = result.imageData as string;
        // Strip data URI prefix: "data:image/jpeg;base64," -> raw base64
        const commaIndex = imageDataStr.indexOf(",");
        const base64Data =
          commaIndex >= 0 ? imageDataStr.slice(commaIndex + 1) : imageDataStr;

        // Detect mime type from data URI
        const mimeMatch = imageDataStr.match(/^data:(image\/[^;]+)/);
        const mimeType = mimeMatch?.[1] ?? "image/jpeg";

        // Build metadata without the bulky imageData field
        const { imageData: _stripped, ...metadata } = result;

        return {
          content: [
            {
              type: "image" as const,
              data: base64Data,
              mimeType,
            },
            {
              type: "text" as const,
              text: JSON.stringify(metadata, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result ?? response.result, null, 2),
          },
        ],
      };
    });
  }

  return server;
}
