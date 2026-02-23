/**
 * WebSocket bridge server.
 * Listens on a local port for the browser extension to connect.
 * Routes tool call requests to the extension and returns responses.
 */

import { randomUUID } from "node:crypto";
import { type WebSocket, WebSocketServer } from "ws";
import type {
  BridgeListToolsResponse,
  BridgeMessage,
  BridgeToolCallResponse,
} from "./protocol.js";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface WsBridgeOptions {
  port: number;
  timeout: number;
  verbose: boolean;
}

export class WsBridge {
  private wss: WebSocketServer | null = null;
  private client: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private keepaliveInterval: ReturnType<typeof setInterval> | null = null;
  private readonly port: number;
  private readonly timeout: number;
  private readonly verbose: boolean;

  constructor(options: WsBridgeOptions) {
    this.port = options.port;
    this.timeout = options.timeout;
    this.verbose = options.verbose;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.port, host: "127.0.0.1" });

      this.wss.on("listening", () => {
        this.log(`WebSocket bridge listening on ws://127.0.0.1:${this.port}`);
        resolve();
      });

      this.wss.on("error", (err) => {
        reject(err);
      });

      this.wss.on("connection", (ws) => {
        if (this.client) {
          this.log("Replacing existing extension connection");
          this.client.close();
          this.rejectAllPending("Extension reconnected");
        }

        this.client = ws;
        this.log("Extension connected");

        this.startKeepalive();

        ws.on("message", (data) => {
          try {
            const message = JSON.parse(data.toString()) as BridgeMessage;
            this.handleMessage(message);
          } catch {
            this.log("Failed to parse message from extension");
          }
        });

        ws.on("close", () => {
          if (this.client === ws) {
            this.client = null;
            this.log("Extension disconnected");
            this.stopKeepalive();
            this.rejectAllPending("Extension disconnected");
          }
        });

        ws.on("error", (err) => {
          this.log(`WebSocket error: ${err.message}`);
        });
      });
    });
  }

  stop(): void {
    this.stopKeepalive();
    this.rejectAllPending("Bridge shutting down");
    if (this.client) {
      this.client.close();
      this.client = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  isConnected(): boolean {
    return this.client !== null && this.client.readyState === 1; // WebSocket.OPEN
  }

  async callTool(
    toolName: string,
    args: unknown,
  ): Promise<BridgeToolCallResponse> {
    if (!this.isConnected()) {
      throw new Error(
        "Extension not connected. Ensure AIPex is running with MCP bridge enabled.",
      );
    }

    const id = randomUUID();
    const request = {
      id,
      type: "tool_call" as const,
      tool: toolName,
      arguments: args,
    };

    return this.sendAndWait(id, request) as Promise<BridgeToolCallResponse>;
  }

  async listTools(): Promise<BridgeListToolsResponse> {
    if (!this.isConnected()) {
      throw new Error(
        "Extension not connected. Ensure AIPex is running with MCP bridge enabled.",
      );
    }

    const id = randomUUID();
    const request = {
      id,
      type: "list_tools" as const,
    };

    return this.sendAndWait(id, request) as Promise<BridgeListToolsResponse>;
  }

  private sendAndWait(id: string, request: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Tool call timed out after ${this.timeout}ms`));
      }, this.timeout);

      this.pending.set(id, { resolve, reject, timer });
      this.client!.send(JSON.stringify(request));
    });
  }

  private handleMessage(message: BridgeMessage): void {
    if (message.type === "pong") {
      return;
    }

    if (message.type === "tool_result" || message.type === "tools_list") {
      const id = message.id;
      const pending = this.pending.get(id);
      if (pending) {
        this.pending.delete(id);
        clearTimeout(pending.timer);
        pending.resolve(message);
      }
    }
  }

  private rejectAllPending(reason: string): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
      this.pending.delete(id);
    }
  }

  private startKeepalive(): void {
    this.stopKeepalive();
    this.keepaliveInterval = setInterval(() => {
      if (this.isConnected()) {
        this.client!.send(JSON.stringify({ type: "ping" }));
      }
    }, 15_000);
  }

  private stopKeepalive(): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }
  }

  private log(msg: string): void {
    if (this.verbose) {
      console.error(`[aipex-mcp] ${msg}`);
    }
  }
}
