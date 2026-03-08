/**
 * MCP WebSocket Bridge Panel
 * UI for connecting/disconnecting the extension to the aipex-mcp-bridge.
 */

import type { WsMcpServerState } from "@aipexstudio/browser-runtime";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_URL = "ws://localhost:9223";

type ConnectionStatus = WsMcpServerState["status"];

export function McpBridgePanel() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const refreshStatus = useCallback(async () => {
    try {
      const state = await chrome.runtime.sendMessage({
        request: "ws-bridge-status",
      });
      if (state) {
        setStatus(state.status);
        setError(state.error);
        setConnectedAt(state.connectedAt);
        setReconnectAttempt(state.reconnectAttempt);
        if (state.url) setUrl(state.url);
      }
    } catch {
      // Background may not be ready
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  const handleConnect = async () => {
    setError(null);
    try {
      const response = await chrome.runtime.sendMessage({
        request: "ws-bridge-connect",
        url,
      });
      if (!response.success) {
        setError(response.error || "Connection failed");
      }
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDisconnect = async () => {
    try {
      await chrome.runtime.sendMessage({ request: "ws-bridge-disconnect" });
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const statusColor = {
    disconnected: "bg-gray-400",
    connecting: "bg-yellow-400 animate-pulse",
    connected: "bg-green-500",
    error: "bg-red-500",
  }[status];

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">MCP WebSocket Bridge</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Connect to an external MCP client (e.g. Claude, Cursor) via the
        aipex-mcp-bridge. The bridge exposes AIPex browser tools to external AI
        agents.
      </p>

      {/* Status indicator */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-block h-3 w-3 rounded-full ${statusColor}`} />
        <span className="text-sm font-medium capitalize">{status}</span>
        {connectedAt && status === "connected" && (
          <span className="text-xs text-muted-foreground ml-2">
            since {new Date(connectedAt).toLocaleTimeString()}
          </span>
        )}
        {reconnectAttempt > 0 && status !== "connected" && (
          <span className="text-xs text-muted-foreground ml-2">
            (reconnect attempt {reconnectAttempt})
          </span>
        )}
      </div>

      {/* URL input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="ws://localhost:9223"
          disabled={status === "connected" || status === "connecting"}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        {status === "connected" ? (
          <button
            type="button"
            onClick={handleDisconnect}
            className="inline-flex items-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            disabled={status === "connecting" || !url.trim()}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {status === "connecting" ? "Connecting..." : "Connect"}
          </button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Info */}
      <div className="mt-4 text-xs text-muted-foreground space-y-1">
        <p>
          The bridge exposes <code>tools/list</code> and <code>tools/call</code>{" "}
          over the MCP protocol, allowing external agents to use AIPex browser
          automation tools.
        </p>
        <p>Only localhost connections (127.0.0.1, ::1) are allowed.</p>
      </div>
    </div>
  );
}
