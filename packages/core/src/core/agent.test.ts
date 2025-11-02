import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { GeminiProvider } from "../llm/gemini-provider.js";
import { Tool } from "../tools/base.js";
import { ToolRegistry } from "../tools/registry.js";
import { Agent } from "./agent.js";

const mockGenerateContentStream = vi.fn();

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContentStream: mockGenerateContentStream,
        };
      }
    },
  };
});

class MockTool extends Tool<{ value: number }, number> {
  readonly name = "mock_tool";
  readonly description = "A mock tool";
  readonly schema = z.object({ value: z.number() });

  execute(params: { value: number }): number {
    return params.value * 2;
  }
}

describe("Agent", () => {
  let provider: GeminiProvider;
  let registry: ToolRegistry;

  beforeEach(() => {
    vi.clearAllMocks();

    provider = new GeminiProvider({
      apiKey: "test-key",
      model: "gemini-2.0-flash-exp",
    });

    registry = new ToolRegistry();
    registry.register(new MockTool());
  });

  describe("create", () => {
    it("should create agent with config", () => {
      const agent = Agent.create({
        llm: provider,
        tools: registry,
        maxTurns: 5,
        systemPrompt: "You are a helpful assistant",
      });

      expect(agent).toBeInstanceOf(Agent);
    });
  });

  describe("execute", () => {
    it("should create new session on execute", async () => {
      const agent = Agent.create({
        llm: provider,
        tools: registry,
      });

      async function* mockStreamGenerator() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ text: "Hello" }],
              },
              finishReason: "STOP",
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValue({
        stream: mockStreamGenerator(),
        response: Promise.resolve({
          usageMetadata: {
            totalTokenCount: 10,
            promptTokenCount: 5,
            candidatesTokenCount: 5,
          },
        }),
      });

      let sessionId: string | undefined;

      for await (const event of agent.execute("Hello")) {
        if (event.type === "session_created") {
          sessionId = event.sessionId;
        }
      }

      expect(sessionId).toBeDefined();
      expect(agent.getSession(sessionId!)).toBeDefined();
    });

    it("should emit execution events", async () => {
      const agent = Agent.create({
        llm: provider,
        tools: registry,
      });

      async function* mockStreamGenerator() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ text: "Response" }],
              },
              finishReason: "STOP",
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValue({
        stream: mockStreamGenerator(),
        response: Promise.resolve({
          usageMetadata: {
            totalTokenCount: 10,
            promptTokenCount: 5,
            candidatesTokenCount: 5,
          },
        }),
      });

      const events: string[] = [];

      for await (const event of agent.execute("Test")) {
        events.push(event.type);
      }

      expect(events).toContain("session_created");
      expect(events).toContain("execution_start");
      expect(events).toContain("turn_start");
      expect(events).toContain("execution_complete");
    });
  });

  describe("continueConversation", () => {
    it("should continue existing session", async () => {
      const agent = Agent.create({
        llm: provider,
        tools: registry,
      });

      async function* mockStreamGenerator() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ text: "Response" }],
              },
              finishReason: "STOP",
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValue({
        stream: mockStreamGenerator(),
        response: Promise.resolve({
          usageMetadata: {
            totalTokenCount: 10,
            promptTokenCount: 5,
            candidatesTokenCount: 5,
          },
        }),
      });

      let sessionId: string | undefined;

      // First message
      for await (const event of agent.execute("Hello")) {
        if (event.type === "session_created") {
          sessionId = event.sessionId;
        }
      }

      // Continue conversation
      const events: string[] = [];
      for await (const event of agent.continueConversation(
        sessionId!,
        "Follow up",
      )) {
        events.push(event.type);
      }

      expect(events).not.toContain("session_created");
      expect(events).toContain("execution_start");
    });
  });

  describe("session management", () => {
    it("should delete session", async () => {
      const agent = Agent.create({
        llm: provider,
        tools: registry,
      });

      async function* mockStreamGenerator() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ text: "Response" }],
              },
              finishReason: "STOP",
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValue({
        stream: mockStreamGenerator(),
        response: Promise.resolve({
          usageMetadata: {
            totalTokenCount: 10,
            promptTokenCount: 5,
            candidatesTokenCount: 5,
          },
        }),
      });

      let sessionId: string | undefined;

      for await (const event of agent.execute("Hello")) {
        if (event.type === "session_created") {
          sessionId = event.sessionId;
        }
      }

      expect(agent.deleteSession(sessionId!)).toBe(true);
      expect(agent.getSession(sessionId!)).toBeUndefined();
    });

    it("should list sessions", async () => {
      const agent = Agent.create({
        llm: provider,
        tools: registry,
      });

      async function* mockStreamGenerator() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ text: "Response" }],
              },
              finishReason: "STOP",
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValue({
        stream: mockStreamGenerator(),
        response: Promise.resolve({
          usageMetadata: {
            totalTokenCount: 10,
            promptTokenCount: 5,
            candidatesTokenCount: 5,
          },
        }),
      });

      for await (const _event of agent.execute("Hello")) {
        // Execute to create session
      }

      const sessions = agent.listSessions();
      expect(sessions.length).toBeGreaterThan(0);
    });
  });

  describe("getToolRegistry", () => {
    it("should return tool registry", () => {
      const agent = Agent.create({
        llm: provider,
        tools: registry,
      });

      expect(agent.getToolRegistry()).toBe(registry);
    });
  });
});
