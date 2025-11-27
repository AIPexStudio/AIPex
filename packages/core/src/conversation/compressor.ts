import type { AgentInputItem } from "@openai/agents";
import { Agent, run } from "@openai/agents";
import type { AiSdkModel, CompressionConfig } from "../types.js";

export class ConversationCompressor {
  private config: Required<CompressionConfig>;
  private agent: Agent;

  constructor(model: AiSdkModel, config: CompressionConfig = {}) {
    this.config = {
      summarizeAfterItems: config.summarizeAfterItems ?? 20,
      keepRecentItems: config.keepRecentItems ?? 10,
      maxSummaryLength: config.maxSummaryLength ?? 500,
    };
    this.agent = new Agent({
      name: "Summarizer",
      instructions: `You are a conversation summarizer. Create a concise summary capturing key points, decisions, and information shared. Keep the summary under ${this.config.maxSummaryLength} characters.`,
      model,
    });
  }

  async compressItems(items: AgentInputItem[]): Promise<{
    summary: string;
    compressedItems: AgentInputItem[];
  }> {
    if (items.length <= this.config.summarizeAfterItems) {
      return { summary: "", compressedItems: items };
    }

    const itemsToSummarize = items.slice(
      0,
      items.length - this.config.keepRecentItems,
    );
    const recentItems = items.slice(-this.config.keepRecentItems);

    const summary = await this.generateSummary(itemsToSummarize);

    return {
      summary,
      compressedItems: recentItems,
    };
  }

  private async generateSummary(items: AgentInputItem[]): Promise<string> {
    const conversationText = items
      .filter((item) => item.type === "message")
      .map((item) => {
        const role = "role" in item ? item.role : "unknown";
        const content = this.extractContent(item);
        return `${role}: ${content}`;
      })
      .join("\n");

    const result = await run(
      this.agent,
      `Summarize this conversation:\n\n${conversationText}`,
    );

    return (result.finalOutput ?? "").trim();
  }

  private extractContent(item: AgentInputItem): string {
    if (!("content" in item)) return "";
    const content = item.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .filter((c) => c.type === "input_text" || c.type === "output_text")
        .map((c) => ("text" in c ? c.text : ""))
        .join(" ");
    }
    return "";
  }

  shouldCompress(itemCount: number): boolean {
    return itemCount > this.config.summarizeAfterItems;
  }
}
