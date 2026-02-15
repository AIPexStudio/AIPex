import type { AgentInputItem } from "@openai/agents";
import { describe, expect, it } from "vitest";
import { EphemeralSession } from "./ephemeral-session.js";

function createUserMessage(text: string): AgentInputItem {
  return { type: "message", role: "user", content: text };
}

describe("EphemeralSession", () => {
  it("implements Session interface basics", async () => {
    const session = new EphemeralSession();
    expect(typeof session.id).toBe("string");
    expect(await session.getSessionId()).toBe(session.id);
    expect(await session.getItems()).toEqual([]);
  });

  it("stores and retrieves items", async () => {
    const session = new EphemeralSession();
    await session.addItems([createUserMessage("hello")]);
    const items = await session.getItems();
    expect(items.length).toBe(1);
    expect(session.getItemCount()).toBe(1);
  });

  it("supports getItems with limit", async () => {
    const session = new EphemeralSession();
    await session.addItems([
      createUserMessage("a"),
      createUserMessage("b"),
      createUserMessage("c"),
    ]);
    const limited = await session.getItems(2);
    expect(limited.length).toBe(2);
  });

  it("supports popItem", async () => {
    const session = new EphemeralSession();
    await session.addItems([createUserMessage("a"), createUserMessage("b")]);
    const popped = await session.popItem();
    expect(popped).toBeDefined();
    expect(session.getItemCount()).toBe(1);
  });

  it("supports clearSession", async () => {
    const session = new EphemeralSession();
    await session.addItems([createUserMessage("a")]);
    await session.clearSession();
    expect(session.getItemCount()).toBe(0);
  });

  it("stores items as-is without shaping (shaping is done by callModelInputFilter)", async () => {
    const screenshotResult: AgentInputItem = {
      type: "function_call_result",
      name: "capture_screenshot",
      callId: "call_abc",
      output: JSON.stringify({
        success: true,
        imageData: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==",
        sendToLLM: true,
        screenshotUid: "screenshot_1234567890_abc",
        tabId: 1,
      }),
    } as AgentInputItem;

    const session = new EphemeralSession();
    await session.addItems([screenshotResult]);

    const items = await session.getItems();
    // Items should be stored as-is (1 item, no shaping)
    expect(items.length).toBe(1);
    expect(items[0]).toEqual(screenshotResult);
  });

  it("accepts custom id", async () => {
    const session = new EphemeralSession("custom-id");
    expect(session.id).toBe("custom-id");
    expect(await session.getSessionId()).toBe("custom-id");
  });
});
