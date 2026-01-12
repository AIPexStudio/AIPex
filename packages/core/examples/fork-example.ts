import { openai } from "@ai-sdk/openai";
import {
  AIPex,
  aisdk,
  ConversationManager,
  InMemoryStorage,
  type SerializedSession,
  SessionStorage,
} from "../src/index.js";

async function main() {
  console.log("🤖 AIPex Core - Session Fork Example\n");

  const storage = new SessionStorage(new InMemoryStorage<SerializedSession>());
  const manager = new ConversationManager(storage);

  const agent = AIPex.create({
    instructions: "You are a helpful assistant that remembers conversations.",
    // TODO: remove as any when @openai/agents-extensions 0.3.8 is released
    model: aisdk(openai("gpt-4o") as any),
    conversationManager: manager,
  });

  // Start a conversation
  console.log("📝 Starting main conversation...\n");

  let mainSessionId: string | undefined;

  console.log("User: My favorite color is blue");
  console.log("Assistant: ");

  for await (const event of agent.chat("My favorite color is blue")) {
    if (event.type === "session_created") {
      mainSessionId = event.sessionId;
      console.log(`[Session ${mainSessionId} created]`);
    }
    if (event.type === "content_delta") {
      process.stdout.write(event.delta);
    }
  }

  if (!mainSessionId) {
    console.error("Failed to create session");
    return;
  }

  console.log("\n\nUser: My favorite food is sushi");
  console.log("Assistant: ");

  for await (const event of agent.chat("My favorite food is sushi", {
    sessionId: mainSessionId,
  })) {
    if (event.type === "content_delta") {
      process.stdout.write(event.delta);
    }
  }

  console.log("\n\nUser: I like playing tennis");
  console.log("Assistant: ");

  for await (const event of agent.chat("I like playing tennis", {
    sessionId: mainSessionId,
  })) {
    if (event.type === "content_delta") {
      process.stdout.write(event.delta);
    }
  }

  // Fork the session at item 1 (after first user+assistant pair)
  console.log("\n\n🔱 Forking session at item 1...\n");

  const forkedSession = await manager.forkSession(mainSessionId, 1);
  console.log(`[Forked session ${forkedSession.id} created]`);

  console.log("\n📝 Branch A (Main): Continuing with favorite food and tennis");
  console.log("User: What do I like?");
  console.log("Assistant: ");

  for await (const event of agent.chat("What do I like?", {
    sessionId: mainSessionId,
  })) {
    if (event.type === "content_delta") {
      process.stdout.write(event.delta);
    }
  }

  console.log(
    "\n\n📝 Branch B (Fork): Alternative timeline - favorite color only",
  );
  console.log("User: My favorite food is pizza (different answer!)");
  console.log("Assistant: ");

  for await (const event of agent.chat("My favorite food is pizza", {
    sessionId: forkedSession.id,
  })) {
    if (event.type === "content_delta") {
      process.stdout.write(event.delta);
    }
  }

  console.log("\n\nUser (in fork): What do I like?");
  console.log("Assistant: ");

  for await (const event of agent.chat("What do I like?", {
    sessionId: forkedSession.id,
  })) {
    if (event.type === "content_delta") {
      process.stdout.write(event.delta);
    }
  }

  // Show the fork tree
  console.log("\n\n🌳 Session Fork Tree:");
  const tree = await manager.getSessionTree();

  function printTree(trees: typeof tree, indent = 0) {
    for (const node of trees) {
      const prefix = "  ".repeat(indent);
      const forkInfo =
        node.session.forkAtItemIndex !== undefined
          ? ` (forked at item ${node.session.forkAtItemIndex})`
          : " (root)";
      console.log(
        `${prefix}📄 ${node.session.id}${forkInfo} - ${node.session.itemCount} items`,
      );
      console.log(`${prefix}   Preview: "${node.session.preview}"`);
      if (node.children.length > 0) {
        printTree(node.children, indent + 1);
      }
    }
  }

  printTree(tree);

  // Show session details
  const mainSession = await manager.getSession(mainSessionId);
  const forkedSessionData = await manager.getSession(forkedSession.id);

  console.log("\n\n📊 Session Comparison:");
  console.log("\nMain Session:");
  if (mainSession) {
    console.log(`  - ID: ${mainSession.id}`);
    console.log(`  - Items: ${mainSession.getItemCount()}`);
    const forkInfo = mainSession.getForkInfo();
    console.log(
      `  - Fork Info: ${forkInfo.parentSessionId ? `Parent: ${forkInfo.parentSessionId}` : "Root session"}`,
    );
  }

  console.log("\nForked Session:");
  if (forkedSessionData) {
    console.log(`  - ID: ${forkedSessionData.id}`);
    console.log(`  - Items: ${forkedSessionData.getItemCount()}`);
    const forkInfo = forkedSessionData.getForkInfo();
    console.log(
      `  - Fork Info: Parent: ${forkInfo.parentSessionId}, Forked at item: ${forkInfo.forkAtItemIndex}`,
    );
  }

  console.log("\n✅ Fork example completed!");
}

main().catch(console.error);
