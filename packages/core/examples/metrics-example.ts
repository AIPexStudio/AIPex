import { openai } from "@ai-sdk/openai";
import {
  AIPexAgent,
  aisdk,
  ConversationManager,
  InMemorySessionStorage,
} from "../src/index.js";

async function demonstrateMetrics() {
  const storage = new InMemorySessionStorage();
  const manager = new ConversationManager(storage);

  const agent = AIPexAgent.create({
    name: "MetricsDemo",
    instructions: "You are a helpful assistant that demonstrates metrics.",
    model: aisdk(openai("gpt-4o")),
    maxTokens: 4096,
    maxTurns: 10,
    conversationManager: manager,
  });

  console.log("Starting agent execution...\n");

  for await (const event of agent.executeStream(
    "Hello! Can you help me understand how metrics work?",
  )) {
    switch (event.type) {
      case "session_created":
        console.log(`✓ Session created: ${event.sessionId}`);
        break;

      case "content_delta":
        console.log(`📝 Response: ${event.delta}`);
        break;

      case "metrics_update":
        console.log("\n📊 Metrics Update:");
        console.log(`  - Tokens Used: ${event.metrics.tokensUsed}`);
        console.log(
          `  - Prompt Tokens: ${event.metrics.promptTokens} | Completion Tokens: ${event.metrics.completionTokens}`,
        );
        console.log(`  - Max Tokens: ${event.metrics.maxTokens ?? "Not set"}`);
        console.log(
          `  - Turn: ${event.metrics.turnCount}/${event.metrics.maxTurns}`,
        );
        console.log(`  - Tool Calls: ${event.metrics.toolCallCount}`);
        console.log(`  - Duration: ${event.metrics.duration}ms`);
        break;

      case "turn_complete":
        console.log(`✓ Turn ${event.turnNumber} completed`);
        break;

      case "execution_complete":
        console.log("\n✅ Execution Complete!");
        console.log("\n📈 Final Metrics:");
        console.log(`  - Total Tokens: ${event.metrics.tokensUsed}`);
        console.log(`  - Total Turns: ${event.metrics.turnCount}`);
        console.log(`  - Total Duration: ${event.metrics.duration}ms`);
        console.log(
          `  - Average tokens per turn: ${Math.round(event.metrics.tokensUsed / event.metrics.turnCount)}`,
        );
        break;
    }
  }
}

demonstrateMetrics().catch(console.error);
