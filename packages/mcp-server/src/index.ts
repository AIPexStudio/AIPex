#!/usr/bin/env node

/**
 * CLI entry point for the AIPex MCP server.
 * Usage: aipex-mcp [--port 9222] [--timeout 30000] [--verbose]
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WsBridge } from "./bridge/ws-bridge.js";
import { createMcpServer } from "./server.js";

function parseArgs(argv: string[]): {
  port: number;
  timeout: number;
  verbose: boolean;
} {
  const args = argv.slice(2);
  let port = 9222;
  let timeout = 30_000;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--port" && args[i + 1]) {
      port = Number.parseInt(args[i + 1]!, 10);
      i++;
    } else if (arg === "--timeout" && args[i + 1]) {
      timeout = Number.parseInt(args[i + 1]!, 10);
      i++;
    } else if (arg === "--verbose") {
      verbose = true;
    }
  }

  return { port, timeout, verbose };
}

async function main(): Promise<void> {
  const { port, timeout, verbose } = parseArgs(process.argv);

  const bridge = new WsBridge({ port, timeout, verbose });
  await bridge.start();

  const server = createMcpServer(bridge);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with stdio transport
  console.error(`[aipex-mcp] MCP server running (WebSocket on port ${port})`);

  process.on("SIGINT", () => {
    bridge.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    bridge.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[aipex-mcp] Fatal error:", err);
  process.exit(1);
});
