import { google } from "@ai-sdk/google";
import { z } from "zod";
import {
  AIPexAgent,
  aisdk,
  ConversationCompressor,
  ConversationManager,
  calculatorTool,
  httpFetchTool,
  InMemoryStorage,
  type SerializedSession,
  SessionStorage,
  tool,
} from "../src/index.js";

async function main() {
  console.log("🤖 AIPex Core - Basic Example\n");

  const model = aisdk(google("gemini-2.5-flash"));

  // Example 1: Simple one-shot execution
  console.log("📝 Example 1: Simple Calculation (No Session)");
  console.log("User: What is 15 * 234?");
  console.log("Assistant: ");

  const simpleAgent = AIPexAgent.create({
    instructions: "You are a helpful assistant that can perform calculations.",
    model,
    tools: [calculatorTool],
  });

  for await (const event of simpleAgent.executeStream("What is 15 * 234?")) {
    if (event.type === "content_delta") {
      process.stdout.write(event.delta);
    } else if (event.type === "tool_call_complete") {
      console.log(
        `\n  [Tool: calculator] Result: ${JSON.stringify(event.result)}`,
      );
    } else if (event.type === "execution_complete") {
      console.log(`\n✅ Completed\n`);
    }
  }

  // Example 2: Conversation with session management
  console.log("\n📝 Example 2: Conversation with Session");

  const storage = new SessionStorage(new InMemoryStorage<SerializedSession>());
  const manager = new ConversationManager(storage);

  const agent = AIPexAgent.create({
    instructions: "You are a helpful assistant with memory.",
    model,
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
      console.log("\n📊 Session Info:");
      console.log(`  - Items: ${session.getItemCount()}`);
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
    model,
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
      console.log(`\n  [Tool: ${event.toolName}] ${event.result}`);
    }
  }

  // Example 4: Conversation Compression
  console.log("\n\n📝 Example 4: Conversation Compression");

  const compressor = new ConversationCompressor(model, {
    summarizeAfterItems: 4, // Low threshold for demo
    keepRecentItems: 2,
  });

  const compressStorage = new SessionStorage(
    new InMemoryStorage<SerializedSession>(),
  );
  const compressManager = new ConversationManager(compressStorage, {
    compressor,
  });

  const compressAgent = AIPexAgent.create({
    instructions: "You are a helpful assistant.",
    model,
    conversationManager: compressManager,
  });

  let compressSessionId: string | undefined;

  // Build up conversation history
  const messages = [
    "My favorite color is blue",
    "I live in Tokyo",
    "I work as a software engineer",
  ];

  for (const msg of messages) {
    console.log(`User: ${msg}`);
    console.log("Assistant: ");

    for await (const event of compressSessionId
      ? compressAgent.continueConversation(compressSessionId, msg)
      : compressAgent.executeStream(msg)) {
      if (event.type === "session_created") {
        compressSessionId = event.sessionId;
      }
      if (event.type === "content_delta") {
        process.stdout.write(event.delta);
      }
    }
    console.log("\n");
  }

  if (compressSessionId) {
    const session = await compressManager.getSession(compressSessionId);
    console.log(`📊 Before compression: ${session?.getItemCount()} items`);

    // Manually trigger compression
    const result = await compressManager.compressSession(compressSessionId);
    console.log(`🗜️ Compression result: ${result.compressed}`);
    if (result.summary) {
      console.log(`📄 Summary: ${result.summary.slice(0, 100)}...`);
    }

    const afterSession = await compressManager.getSession(compressSessionId);
    console.log(`📊 After compression: ${afterSession?.getItemCount()} items`);
  }

  console.log("\n\n✅ All examples completed!");
}

main().catch(console.error);
