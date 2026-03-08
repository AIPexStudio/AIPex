/**
 * WebSocket client transport for MCP-over-WebSocket.
 *
 * Uses the browser-native WebSocket API. AIPex connects as a WebSocket
 * client to the host agent's WebSocket server, then JSON-RPC 2.0 messages
 * flow bidirectionally over that connection.
 *
 * No dependency on @modelcontextprotocol/sdk to avoid pulling ajv
 * (which uses `new Function()`) into the MV3 service worker bundle.
 */

export interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface JSONRPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

export type JSONRPCMessage =
  | JSONRPCRequest
  | JSONRPCResponse
  | JSONRPCNotification;

function isValidJsonRpcMessage(data: unknown): data is JSONRPCMessage {
  if (typeof data !== "object" || data === null) return false;
  const msg = data as Record<string, unknown>;
  return msg.jsonrpc === "2.0";
}

const WS_CLOSE_NORMAL = 1000;

export class WebSocketClientTransport {
  private socket: WebSocket | null = null;
  private url: string;
  private closeFired = false;

  onmessage?: (message: JSONRPCMessage) => void;
  onerror?: (error: Error) => void;
  onclose?: () => void;

  constructor(url: string) {
    this.url = url;
  }

  start(): Promise<void> {
    if (this.socket) {
      throw new Error("WebSocketClientTransport already started");
    }

    this.closeFired = false;

    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.socket = ws;

      ws.onopen = () => {
        resolve();
      };

      ws.onerror = () => {
        const error = new Error("WebSocket error");
        reject(error);
        this.onerror?.(error);
      };

      ws.onclose = () => {
        this.socket = null;
        if (!this.closeFired) {
          this.closeFired = true;
          this.onclose?.();
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(String(event.data));
        } catch (error) {
          this.onerror?.(
            error instanceof Error ? error : new Error(String(error)),
          );
          return;
        }
        if (!isValidJsonRpcMessage(parsed)) {
          this.onerror?.(new Error("Received non-JSON-RPC message"));
          return;
        }
        this.onmessage?.(parsed);
      };
    });
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }
    this.socket.send(JSON.stringify(message));
  }

  async close(): Promise<void> {
    const ws = this.socket;
    if (!ws) return;

    this.socket = null;
    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      ws.close(WS_CLOSE_NORMAL);
    }
  }

  get isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}
