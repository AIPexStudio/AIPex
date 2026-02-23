/**
 * WebSocket bridge protocol between MCP server and browser extension.
 * Uses JSON messages with request ID correlation for async request-response.
 */

export interface BridgeToolCallRequest {
  id: string;
  type: "tool_call";
  tool: string;
  arguments: unknown;
}

export interface BridgeToolCallResponse {
  id: string;
  type: "tool_result";
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface BridgeListToolsRequest {
  id: string;
  type: "list_tools";
}

export interface BridgeListToolsResponse {
  id: string;
  type: "tools_list";
  tools: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;
}

export interface BridgePing {
  type: "ping";
}

export interface BridgePong {
  type: "pong";
}

export type BridgeRequest =
  | BridgeToolCallRequest
  | BridgeListToolsRequest
  | BridgePing;

export type BridgeResponse =
  | BridgeToolCallResponse
  | BridgeListToolsResponse
  | BridgePong;

export type BridgeMessage = BridgeRequest | BridgeResponse;
