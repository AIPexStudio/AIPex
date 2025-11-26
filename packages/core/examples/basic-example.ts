import { google } from "@ai-sdk/google";
import { z } from "zod";
import {
  AIPexAgent,
  aisdk,
  ConversationManager,
  calculatorTool,
  httpFetchTool,
  InMemorySessionStorage,
  tool,
} from "../src/index.js";

async function main() {
  console.log("🤖 AIPex Core - Basic Example\n");

  // Example 1: Simple one-shot execution
  console.log("📝 Example 1: Simple Calculation (No Session)");
  console.log("User: What is 15 * 234?");
  console.log("Assistant: ");

  const simpleAgent = AIPexAgent.create({
    instructions: "You are a helpful assistant that can perform calculations.",
    model: aisdk(google("gemini-2.5-flash")),
    tools: [calculatorTool],
  });

  for await (const event of simpleAgent.executeStream("What is 15 * 234?")) {
    if (event.type === "content_delta") {
      process.stdout.write(event.delta);
    } else if (event.type === "tool_call_complete") {
      console.log(
        `\n  [Tool: calculator] Result: ${JSON.stringify(event.result.data)}`,
      );
    } else if (event.type === "execution_complete") {
      console.log(`\n✅ Completed\n`);
    }
  }

  // Example 2: Conversation with session management
  console.log("\n📝 Example 2: Conversation with Session");

  const storage = new InMemorySessionStorage();
  const manager = new ConversationManager(storage);

  const agent = AIPexAgent.create({
    instructions: "You are a helpful assistant with memory.",
    model: aisdk(google("gemini-2.5-flash")),
    tools: [calculatorTool, httpFetchTool],
    conversationManager: manager,
  });

  let sessionId: string | undefined;

  console.log("User: My name is Alice");
  console.log("Assistant: ");

  for await (const event of agent.executeStream("My name is Alice")) {
    if (event.type === "session_created") {
      sessionId = event.sessionId;
      console.log(`[Session ${sessionId} created]`);
    }
    if (event.type === "content_delta") {
      process.stdout.write(event.delta);
    }
  }

  if (sessionId) {
    console.log("\n\nUser: What is my name?");
    console.log("Assistant: ");

    for await (const event of agent.continueConversation(
      sessionId,
      "What is my name?",
    )) {
      if (event.type === "content_delta") {
        process.stdout.write(event.delta);
      }
    }
    console.log("\n");

    const session = await manager.getSession(sessionId);
    if (session) {
      const stats = session.getStats();
      console.log("\n📊 Session Stats:");
      console.log(`  - Turns: ${stats.turnCount}`);
      console.log(`  - Messages: ${stats.messageCount}`);
      console.log(`  - Tool Calls: ${stats.toolCallCount}`);
    }
  }

  // Example 3: Custom tool
  console.log("\n📝 Example 3: Custom Tool");

  const weatherTool = tool({
    name: "get_weather",
    description: "Get the weather for a city",
    parameters: z.object({
      city: z.string().describe("The city name"),
    }),
    execute: async (input) => {
      return `The weather in ${input.city} is sunny and 72°F`;
    },
  });

  const weatherAgent = AIPexAgent.create({
    instructions: "You are a weather assistant.",
    model: aisdk(google("gemini-2.5-flash")),
    tools: [weatherTool],
  });

  console.log("User: What's the weather in Tokyo?");
  console.log("Assistant: ");

  for await (const event of weatherAgent.executeStream(
    "What's the weather in Tokyo?",
  )) {
    if (event.type === "content_delta") {
      process.stdout.write(event.delta);
    } else if (event.type === "tool_call_complete") {
      console.log(`\n  [Tool: ${event.toolName}] ${event.result.data}`);
    }
  }

  console.log("\n\n✅ All examples completed!");
}

main().catch(console.error);
