/**
 * WebSocket command executor for the AIPex extension.
 *
 * Connects as a WebSocket client to the aipex-mcp-bridge and listens
 * for tool execution commands. The bridge is the true MCP server — this
 * class simply executes tools and returns results.
 *
 * Handles:
 *   - tools/call   -- executes a tool from allBrowserTools
 *   - ping         -- responds with {} for keepalive
 *
 * No MCP protocol negotiation (initialize, tools/list) is needed on this
 * side — the bridge handles that entirely with static tool schemas.
 */

import type { FunctionTool } from "@aipexstudio/aipex-core";
import { allBrowserTools } from "../tools/index.js";
import {
  type JSONRPCMessage,
  type JSONRPCRequest,
  WebSocketClientTransport,
} from "./ws-transport.js";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface WsMcpServerState {
  status: ConnectionStatus;
  url: string | null;
  error: string | null;
  connectedAt: number | null;
  reconnectAttempt: number;
}

type StatusListener = (state: WsMcpServerState) => void;

const KEEPALIVE_ALARM_NAME = "ws-mcp-keepalive";
const KEEPALIVE_INTERVAL_MINUTES = 0.4;
const TOOL_CALL_TIMEOUT_MS = 60_000;

const STORAGE_KEY_WS_URL = "ws-mcp-url";

function getReconnectDelayMs(attempt: number): number {
  const withJitter = (base: number) =>
    Math.round(base * (0.7 + Math.random() * 0.6));
  return withJitter(Math.min(500 * 2 ** attempt, 10_000));
}

/**
 * Find a tool by name from the registered browser tools.
 */
function findBrowserTool(name: string): FunctionTool | undefined {
  return allBrowserTools.find((t) => t.name === name);
}

/**
 * Format a tool execution result into MCP content blocks.
 */
function buildMcpContent(
  data: unknown,
): Array<{ type: string; text?: string; data?: string; mimeType?: string }> {
  if (data === null || data === undefined) {
    return [{ type: "text", text: "null" }];
  }

  if (typeof data === "string") {
    // Check if it's a base64 data URL (screenshot)
    if (data.startsWith("data:image/")) {
      const commaIndex = data.indexOf(",");
      if (commaIndex > 0) {
        const mimeType = data.slice(5, data.indexOf(";"));
        const base64Data = data.slice(commaIndex + 1);
        return [{ type: "image", data: base64Data, mimeType }];
      }
    }
    return [{ type: "text", text: data }];
  }

  return [{ type: "text", text: JSON.stringify(data, null, 2) }];
}

export class WsMcpServer {
  private transport: WebSocketClientTransport | null = null;
  private state: WsMcpServerState = {
    status: "disconnected",
    url: null,
    error: null,
    connectedAt: null,
    reconnectAttempt: 0,
  };
  private listeners: Set<StatusListener> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private autoReconnectEnabled = true;

  private validateUrl(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`Invalid WebSocket URL: ${url}`);
    }

    const hostname = parsed.hostname;
    const allowedHosts = ["localhost", "127.0.0.1", "[::1]", "::1"];
    if (!allowedHosts.includes(hostname)) {
      throw new Error(
        `Only localhost connections are allowed. Got: ${hostname}`,
      );
    }

    if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
      throw new Error(
        `URL must use ws:// or wss:// protocol. Got: ${parsed.protocol}`,
      );
    }
  }

  async connect(url: string): Promise<void> {
    this.validateUrl(url);
    this.cancelReconnect();

    if (
      this.state.status === "connected" ||
      this.state.status === "connecting"
    ) {
      await this.disconnect();
    }

    this.updateState({
      status: "connecting",
      url,
      error: null,
      connectedAt: null,
    });

    try {
      const transport = new WebSocketClientTransport(url);
      this.transport = transport;

      transport.onclose = () => {
        this.handleDisconnect();
      };

      transport.onerror = (error: Error) => {
        console.error("[WsMcpServer] Transport error:", error.message);
      };

      transport.onmessage = (message: JSONRPCMessage) => {
        this.handleMessage(message);
      };

      await transport.start();
      this.updateState({
        status: "connected",
        connectedAt: Date.now(),
        reconnectAttempt: 0,
      });
      this.startKeepalive();
      this.persistUrl(url);
      this.autoReconnectEnabled = true;
      console.log(`[WsMcpServer] Connected to ${url}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.updateState({ status: "error", error: message, connectedAt: null });
      this.transport = null;
      this.scheduleReconnect(url);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.autoReconnectEnabled = false;
    this.cancelReconnect();
    this.stopKeepalive();

    if (this.transport) {
      try {
        await this.transport.close();
      } catch {
        // ignore close errors
      }
      this.transport = null;
    }

    this.updateState({
      status: "disconnected",
      url: null,
      error: null,
      connectedAt: null,
      reconnectAttempt: 0,
    });
    this.clearPersistedUrl();
    console.log("[WsMcpServer] Disconnected");
  }

  isConnected(): boolean {
    return this.state.status === "connected";
  }

  getStatus(): WsMcpServerState {
    return { ...this.state };
  }

  onStatusChange(listener: StatusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async getSavedUrl(): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY_WS_URL);
      return (result[STORAGE_KEY_WS_URL] as string) || null;
    } catch {
      return null;
    }
  }

  // -- Auto-reconnect with exponential backoff --

  private scheduleReconnect(url: string): void {
    if (!this.autoReconnectEnabled) return;
    this.cancelReconnect();

    const attempt = this.state.reconnectAttempt;
    const delay = getReconnectDelayMs(attempt);
    console.log(
      `[WsMcpServer] Scheduling reconnect attempt ${attempt + 1} in ${delay}ms`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.updateState({ reconnectAttempt: attempt + 1 });
      this.connect(url).catch(() => {
        // connect() itself schedules next retry on failure
      });
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private persistUrl(url: string): void {
    try {
      chrome.storage.local.set({ [STORAGE_KEY_WS_URL]: url });
    } catch {
      // ignore storage errors
    }
  }

  private clearPersistedUrl(): void {
    try {
      chrome.storage.local.remove(STORAGE_KEY_WS_URL);
    } catch {
      // ignore
    }
  }

  // -- Message handling --

  private handleMessage(message: JSONRPCMessage): void {
    if (!("method" in message) || !("id" in message)) {
      return;
    }
    const request = message as JSONRPCRequest;
    this.handleRequest(request).catch((error) => {
      console.error("[WsMcpServer] Unhandled error processing request:", error);
      this.sendError(request.id, -32603, "Internal error");
    });
  }

  private async handleRequest(request: JSONRPCRequest): Promise<void> {
    switch (request.method) {
      case "tools/call":
        return this.handleToolsCall(request);
      case "ping":
        return this.sendResult(request.id, {});
      default:
        return this.sendError(
          request.id,
          -32601,
          `Method not found: ${request.method}`,
        );
    }
  }

  private async handleToolsCall(request: JSONRPCRequest): Promise<void> {
    const params = (request.params || {}) as Record<string, unknown>;
    const name = params.name as string | undefined;
    const args = (params.arguments || {}) as Record<string, unknown>;

    if (!name) {
      return this.sendError(
        request.id,
        -32602,
        "Missing required parameter: name",
      );
    }

    try {
      const toolExecution = this.executeTool(name, args);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                `Tool '${name}' timed out after ${TOOL_CALL_TIMEOUT_MS}ms`,
              ),
            ),
          TOOL_CALL_TIMEOUT_MS,
        );
      });

      const result = await Promise.race([toolExecution, timeoutPromise]);

      await this.sendResult(request.id, {
        content: buildMcpContent(result),
      });
    } catch (error) {
      await this.sendResult(request.id, {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      });
    }
  }

  private async executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const browserTool = findBrowserTool(name);
    if (!browserTool) {
      throw new Error(`Tool not found: ${name}`);
    }

    // FunctionTool.invoke(runContext, inputJsonString, details?)
    // We pass an empty object as RunContext since we're outside the agent loop.
    return await (browserTool as any).invoke({} as any, JSON.stringify(args));
  }

  private async sendResult(
    id: string | number,
    result: unknown,
  ): Promise<void> {
    if (!this.transport) return;
    await this.transport.send({
      jsonrpc: "2.0",
      id,
      result,
    } as JSONRPCMessage);
  }

  private async sendError(
    id: string | number,
    code: number,
    message: string,
  ): Promise<void> {
    if (!this.transport) return;
    await this.transport.send({
      jsonrpc: "2.0",
      id,
      error: { code, message },
    } as JSONRPCMessage);
  }

  // -- Connection lifecycle --

  private handleDisconnect(): void {
    this.stopKeepalive();
    const lastUrl = this.state.url;
    this.transport = null;
    if (this.state.status !== "disconnected") {
      this.updateState({
        status: "disconnected",
        error: null,
        connectedAt: null,
      });
      console.log("[WsMcpServer] Connection closed by remote");
      if (lastUrl && this.autoReconnectEnabled) {
        this.scheduleReconnect(lastUrl);
      }
    }
  }

  private updateState(partial: Partial<WsMcpServerState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      try {
        listener(this.getStatus());
      } catch {
        // don't let listener errors break us
      }
    }
  }

  // -- Service Worker Keepalive --

  private startKeepalive(): void {
    try {
      chrome.alarms.create(KEEPALIVE_ALARM_NAME, {
        periodInMinutes: KEEPALIVE_INTERVAL_MINUTES,
      });
    } catch (error) {
      console.warn("[WsMcpServer] Failed to create keepalive alarm:", error);
    }
  }

  private stopKeepalive(): void {
    try {
      chrome.alarms.clear(KEEPALIVE_ALARM_NAME);
    } catch {
      // ignore
    }
  }

  handleAlarm(alarm: chrome.alarms.Alarm): void {
    if (alarm.name !== KEEPALIVE_ALARM_NAME) return;

    if (this.state.status === "connected" && this.transport?.isOpen) {
      this.sendPing();
      return;
    }

    if (this.state.status === "connecting") {
      return;
    }

    const url = this.state.url;
    if (url && this.autoReconnectEnabled) {
      this.connect(url).catch(() => {
        // connect() schedules its own retry on failure
      });
    }
  }

  private async sendPing(): Promise<void> {
    if (!this.transport?.isOpen) return;
    try {
      await this.transport.send({
        jsonrpc: "2.0",
        id: `ping-${Date.now()}`,
        method: "ping",
      } as JSONRPCMessage);
    } catch {
      console.warn("[WsMcpServer] Ping send failed, closing connection");
      this.handleDisconnect();
    }
  }
}

export const wsMcpServer = new WsMcpServer();
