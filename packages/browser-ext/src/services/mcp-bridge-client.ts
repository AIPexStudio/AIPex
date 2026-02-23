/**
 * MCP Bridge Client for the browser extension service worker.
 * Connects to the MCP server's WebSocket bridge and routes tool calls
 * to the ToolManager for execution.
 */

import { toolManager } from "./tool-manager";

interface BridgeToolCallRequest {
  id: string;
  type: "tool_call";
  tool: string;
  arguments: unknown;
}

interface BridgeListToolsRequest {
  id: string;
  type: "list_tools";
}

interface BridgePing {
  type: "ping";
}

type BridgeIncoming =
  | BridgeToolCallRequest
  | BridgeListToolsRequest
  | BridgePing;

const MCP_BRIDGE_PORT_KEY = "aipex-mcp-bridge-port";
const DEFAULT_PORT = 9222;
const MAX_RECONNECT_DELAY = 30_000;
const INITIAL_RECONNECT_DELAY = 1_000;

let ws: WebSocket | null = null;
let reconnectDelay = INITIAL_RECONNECT_DELAY;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let running = false;

async function getPort(): Promise<number> {
  try {
    const result = await chrome.storage.local.get(MCP_BRIDGE_PORT_KEY);
    const port = result[MCP_BRIDGE_PORT_KEY];
    return typeof port === "number" ? port : DEFAULT_PORT;
  } catch {
    return DEFAULT_PORT;
  }
}

function connect(port: number): void {
  if (!running) return;

  try {
    ws = new WebSocket(`ws://127.0.0.1:${port}`);
  } catch {
    scheduleReconnect(port);
    return;
  }

  ws.onopen = () => {
    console.log("[MCP Bridge] Connected to MCP server");
    reconnectDelay = INITIAL_RECONNECT_DELAY;
  };

  ws.onmessage = (event) => {
    handleMessage(event.data as string);
  };

  ws.onclose = () => {
    console.log("[MCP Bridge] Disconnected from MCP server");
    ws = null;
    scheduleReconnect(port);
  };

  ws.onerror = () => {
    // onclose will fire after this, which handles reconnection
  };
}

function scheduleReconnect(port: number): void {
  if (!running) return;
  if (reconnectTimer) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    connect(port);
  }, reconnectDelay);
}

function handleMessage(data: string): void {
  let message: BridgeIncoming;
  try {
    message = JSON.parse(data);
  } catch {
    return;
  }

  if (message.type === "ping") {
    send({ type: "pong" });
    return;
  }

  if (message.type === "tool_call") {
    handleToolCall(message);
    return;
  }

  if (message.type === "list_tools") {
    handleListTools(message);
    return;
  }
}

async function handleToolCall(request: BridgeToolCallRequest): Promise<void> {
  const tool = toolManager.getTool(request.tool);
  if (!tool) {
    send({
      id: request.id,
      type: "tool_result",
      success: false,
      error: `Unknown tool: ${request.tool}`,
    });
    return;
  }

  try {
    const resultStr = await tool.invoke(
      {} as never, // RunContext (not used by browser-runtime tools)
      JSON.stringify(request.arguments ?? {}),
    );
    const result =
      typeof resultStr === "string" ? JSON.parse(resultStr) : resultStr;
    send({
      id: request.id,
      type: "tool_result",
      success: true,
      result,
    });
  } catch (error) {
    send({
      id: request.id,
      type: "tool_result",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function handleListTools(request: BridgeListToolsRequest): void {
  const tools = toolManager.getAllTools();
  send({
    id: request.id,
    type: "tools_list",
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.parameters ?? {},
    })),
  });
}

function send(message: unknown): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export async function startMcpBridgeClient(): Promise<void> {
  if (running) return;
  running = true;
  const port = await getPort();
  console.log(`[MCP Bridge] Starting client (port ${port})`);
  connect(port);
}

export function stopMcpBridgeClient(): void {
  running = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  console.log("[MCP Bridge] Client stopped");
}
