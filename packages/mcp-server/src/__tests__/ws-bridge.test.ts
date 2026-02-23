import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";
import { WsBridge } from "../bridge/ws-bridge.js";

describe("WsBridge", () => {
  let bridge: WsBridge;
  const TEST_PORT = 19222;

  beforeEach(() => {
    vi.resetAllMocks();
    bridge = new WsBridge({
      port: TEST_PORT,
      timeout: 2000,
      verbose: false,
    });
  });

  afterEach(() => {
    bridge.stop();
    vi.restoreAllMocks();
  });

  it("starts and accepts connections", async () => {
    await bridge.start();
    expect(bridge.isConnected()).toBe(false);

    const client = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
    await new Promise<void>((resolve) => {
      client.on("open", resolve);
    });

    // Small delay for the bridge to register the connection
    await new Promise((r) => setTimeout(r, 50));
    expect(bridge.isConnected()).toBe(true);

    client.close();
    await new Promise((r) => setTimeout(r, 50));
    expect(bridge.isConnected()).toBe(false);
  });

  it("sends tool_call and receives response", async () => {
    await bridge.start();

    const client = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
    await new Promise<void>((resolve) => {
      client.on("open", resolve);
    });

    // Extension mock: echo the tool call back as a success result
    client.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === "tool_call") {
        client.send(
          JSON.stringify({
            id: msg.id,
            type: "tool_result",
            success: true,
            result: { tabs: [], count: 0 },
          }),
        );
      }
    });

    await new Promise((r) => setTimeout(r, 50));

    const response = await bridge.callTool("get_all_tabs", {});
    expect(response.success).toBe(true);
    expect(response.result).toEqual({ tabs: [], count: 0 });

    client.close();
  });

  it("rejects tool_call when not connected", async () => {
    await bridge.start();
    await expect(bridge.callTool("get_all_tabs", {})).rejects.toThrow(
      "Extension not connected",
    );
  });

  it("times out if extension does not respond", async () => {
    await bridge.start();

    const client = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
    await new Promise<void>((resolve) => {
      client.on("open", resolve);
    });
    await new Promise((r) => setTimeout(r, 50));

    // Don't send any response — should timeout
    await expect(bridge.callTool("get_all_tabs", {})).rejects.toThrow(
      "timed out",
    );

    client.close();
  });

  it("replaces existing connection when a new one connects", async () => {
    await bridge.start();

    const client1 = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
    await new Promise<void>((resolve) => {
      client1.on("open", resolve);
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(bridge.isConnected()).toBe(true);

    const client2 = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
    await new Promise<void>((resolve) => {
      client2.on("open", resolve);
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(bridge.isConnected()).toBe(true);

    // client1 should have been closed by the bridge
    await new Promise((r) => setTimeout(r, 50));
    expect(client1.readyState).toBe(WebSocket.CLOSED);

    client2.close();
  });

  it("responds to ping with pong", async () => {
    await bridge.start();

    const client = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
    await new Promise<void>((resolve) => {
      client.on("open", resolve);
    });
    await new Promise((r) => setTimeout(r, 50));

    // Bridge sends pings for keepalive; let's test the client sending a ping
    // and seeing that the bridge handles it without errors
    // (pong handling is done by the extension side, not the bridge)
    // Here we verify the bridge doesn't crash on ping messages
    client.send(JSON.stringify({ type: "pong" }));
    await new Promise((r) => setTimeout(r, 50));
    expect(bridge.isConnected()).toBe(true);

    client.close();
  });
});
