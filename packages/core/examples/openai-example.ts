/**
 * Basic example of using AIPex Core
 *
 * This example demonstrates:
 * - Creating an agent with OpenAI provider
 * - Using DeepSeek API instead of OpenAI API
 * - Registering a custom tool
 * - Executing a task
 * - Handling events
 */

import dotenv from "dotenv";
import { z } from "zod";
import {
  Agent,
  HttpFetchTool,
  OpenAIProvider,
  ToolRegistry,
} from "../dist/src/index.js";
import { Tool } from "../dist/src/tools/base.js";

dotenv.config();

// Custom calculator tool
class CalculatorTool extends Tool<
  { operation: string; a: number; b: number },
  number
> {
  readonly name = "calculator";
  readonly description = "Perform basic arithmetic operations";
  readonly schema = z.object({
    operation: z
      .enum(["add", "subtract", "multiply", "divide"])
      .describe("The operation to perform"),
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  });

  execute(params: { operation: string; a: number; b: number }): number {
    switch (params.operation) {
      case "add":
        return params.a + params.b;
      case "subtract":
        return params.a - params.b;
      case "multiply":
        return params.a * params.b;
      case "divide":
        if (params.b === 0) throw new Error("Division by zero");
        return params.a / params.b;
      default:
        throw new Error(`Unknown operation: ${params.operation}`);
    }
  }
}

async function main() {
  // Check for API key
  const apiKey = process.env?.["DEEPSEEK_API_KEY"];
  if (!apiKey) {
    console.error("Please set DEEPSEEK_API_KEY environment variable");
    process.exit(1);
  }

  // Create LLM provider
  const llmProvider = new OpenAIProvider({
    apiKey,
    model: "deepseek-chat",
    baseUrl: "https://api.deepseek.com",
  });

  // Create and register tools
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(new CalculatorTool());
  toolRegistry.register(new HttpFetchTool());

  // Create agent
  const agent = Agent.create({
    llm: llmProvider,
    tools: toolRegistry,
    systemPrompt:
      "You are a helpful assistant that can perform calculations and fetch data from the web.",
    maxTurns: 10,
  });

  console.log("🤖 AIPex Agent started!\n");

  // Example 1: Simple calculation
  console.log("📝 Example 1: Multi-turn calculation");
  console.log("User: What is 15 * 234 and 10/2?");
  console.log("Assistant: ");

  for await (const event of agent.execute("What is 15 * 234 and 10/2?")) {
    if (event.type === "content_delta") {
      process.stdout.write(event.delta);
    } else if (event.type === "tool_call_complete") {
      console.log(
        `\n  [Tool: calculator] Result: ${JSON.stringify(event.result.data)}`,
      );
    } else if (event.type === "execution_complete") {
      console.log(`\n✅ Completed in ${event.turns} turns\n`);
    }
  }

  // Example 2: Multi-turn conversation
  console.log("\n📝 Example 2: Multi-turn conversation");
  let sessionId: string | undefined;

  console.log("User: My name is Alice");
  console.log("Assistant: ");

  for await (const event of agent.execute("My name is Alice")) {
    if (event.type === "session_created") {
      sessionId = event.sessionId;
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
  }

  // Show tool metrics
  console.log("\n📊 Tool Metrics:");
  const metrics = toolRegistry.getMetrics();
  console.log(JSON.stringify(metrics, null, 2));
  console.table(metrics);
}

// Run the example
main().catch(console.error);
