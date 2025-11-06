/**
 * Basic example of using AIPex Core
 *
 * This example demonstrates:
 * - Creating an agent with multiple provider support (Claude, Gemini, or DeepSeek)
 * - Registering a custom tool
 * - Executing a task
 * - Handling events
 *
 * Set one of these environment variables:
 * - ANTHROPIC_API_KEY for Claude
 * - GEMINI_API_KEY for Gemini
 * - DEEPSEEK_API_KEY for DeepSeek
 */

import { z } from "zod";
import dotenv from "dotenv";
import {
  Agent,
  ClaudeProvider,
  GeminiProvider,
  HttpFetchTool,
  OpenAIProvider,
  ToolRegistry,
} from "../dist/src/index.js";
import type { LLMProvider } from "../dist/src/llm/provider.js";
import { Tool } from "../dist/src/tools/base.js";

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
  dotenv.config();

  // Check for API keys and create appropriate provider
  let llmProvider: LLMProvider;
  let providerName: string;

  const anthropicKey = process.env?.["ANTHROPIC_API_KEY"];
  const geminiKey = process.env?.["GEMINI_API_KEY"];
  const deepseekKey = process.env?.["DEEPSEEK_API_KEY"];

  if (anthropicKey) {
    llmProvider = new ClaudeProvider({
      apiKey: anthropicKey,
      model: "claude-sonnet-4-5",
    });
    providerName = "Claude";
  } else if (geminiKey) {
    llmProvider = new GeminiProvider({
      apiKey: geminiKey,
      model: "gemini-2.0-flash-exp",
    });
    providerName = "Gemini";
  } else if (deepseekKey) {
    llmProvider = new OpenAIProvider({
      apiKey: deepseekKey,
      model: "deepseek-chat",
      baseUrl: "https://api.deepseek.com",
    });
    providerName = "DeepSeek";
  } else {
    console.error(
      "Please set one of: ANTHROPIC_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY environment variable",
    );
    process.exit(1);
  }

  console.log(`🤖 Using ${providerName} provider\n`);

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

  // Example 1: Simple calculation
  console.log("📝 Example 1: Calculation");
  console.log("User: What is 15 * 234?");
  console.log("Assistant: ");

  for await (const event of agent.execute("What is 15 * 234?")) {
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
