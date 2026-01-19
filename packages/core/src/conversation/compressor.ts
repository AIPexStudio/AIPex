import type { AgentInputItem } from "@openai/agents";
import { Agent, run } from "@openai/agents";
import type { AiSdkModel, CompressionConfig } from "../types.js";

export class ConversationCompressor {
  private config: Required<
    Omit<CompressionConfig, "tokenWatermark" | "protectRecentMessages">
  > & {
    tokenWatermark?: number;
    protectRecentMessages?: number;
  };
  private agent: Agent;

  constructor(model: AiSdkModel, config: CompressionConfig = {}) {
    this.config = {
      summarizeAfterItems: config.summarizeAfterItems ?? 20,
      keepRecentItems: config.keepRecentItems ?? 10,
      maxSummaryLength: config.maxSummaryLength ?? 500,
      tokenWatermark: config.tokenWatermark,
      protectRecentMessages: config.protectRecentMessages,
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

    let itemsToSummarize: AgentInputItem[];
    let recentItems: AgentInputItem[];

    // Use protectRecentMessages if configured
    if (this.config.protectRecentMessages !== undefined) {
      const protectIndex = this.findProtectedTailStartIndex(
        items,
        this.config.protectRecentMessages,
      );
      itemsToSummarize = items.slice(0, protectIndex);
      recentItems = items.slice(protectIndex);
    } else {
      // Fallback to keepRecentItems logic
      itemsToSummarize = items.slice(
        0,
        items.length - this.config.keepRecentItems,
      );
      recentItems = items.slice(-this.config.keepRecentItems);
    }

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

  shouldCompress(itemCount: number, lastPromptTokens?: number): boolean {
    // If tokenWatermark is set and we have lastPromptTokens, check if it exceeds watermark
    if (
      this.config.tokenWatermark !== undefined &&
      lastPromptTokens !== undefined
    ) {
      return lastPromptTokens > this.config.tokenWatermark;
    }
    // Fallback to item count based compression
    return itemCount > this.config.summarizeAfterItems;
  }

  /**
   * Find the start index for the protected tail based on protectRecentMessages count.
   * This method:
   * 1. Counts backwards N message items (type="message")
   * 2. Expands to include all non-message items between protected messages
   * 3. Ensures tool call/result pairs stay together (callId closure)
   * 4. Includes the assistant message preceding any tool calls in the protected region
   */
  private findProtectedTailStartIndex(
    items: AgentInputItem[],
    protectRecentMessages: number,
  ): number {
    if (protectRecentMessages <= 0 || items.length === 0) {
      return items.length;
    }

    // Count backwards to find N message items and track the earliest one
    let messageCount = 0;
    let startIndex = items.length;

    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i]?.type === "message") {
        messageCount++;
        if (messageCount === protectRecentMessages) {
          startIndex = i;
          break;
        }
      }
    }

    // If we didn't find enough messages, protect everything
    if (messageCount < protectRecentMessages) {
      return 0;
    }

    // Expand backwards to include all non-message items (tool calls/results)
    // that appear between the earliest protected message and the next message
    while (startIndex > 0 && items[startIndex - 1]?.type !== "message") {
      startIndex--;
    }

    // Now expand the protected region to ensure tool call/result pairs are complete
    startIndex = this.expandForToolCallClosure(items, startIndex);

    // Include the assistant message preceding any tool calls at the boundary
    startIndex = this.includePrecedingAssistantMessage(items, startIndex);

    return startIndex;
  }

  /**
   * Expand the protected region to ensure tool call/result pairs are not split.
   * Collects all callIds in the protected region and ensures both call and result are included.
   */
  private expandForToolCallClosure(
    items: AgentInputItem[],
    startIndex: number,
  ): number {
    const protectedCallIds = new Set<string>();

    // Collect callIds from the initially protected region
    for (let i = startIndex; i < items.length; i++) {
      const callId = this.extractCallId(items[i]);
      if (callId) {
        protectedCallIds.add(callId);
      }
    }

    // If no tool calls in protected region, no expansion needed
    if (protectedCallIds.size === 0) {
      return startIndex;
    }

    // Scan backwards to include any missing call/result items with these callIds
    let expandedStart = startIndex;
    for (let i = startIndex - 1; i >= 0; i--) {
      const callId = this.extractCallId(items[i]);
      if (callId && protectedCallIds.has(callId)) {
        expandedStart = i;
      }
    }

    return expandedStart;
  }

  /**
   * If the protected region starts with a tool call/result, include the preceding
   * assistant message that initiated the tool calls.
   */
  private includePrecedingAssistantMessage(
    items: AgentInputItem[],
    startIndex: number,
  ): number {
    if (startIndex === 0) {
      return startIndex;
    }

    // Check if the first item in protected region is a tool-related item
    const firstProtectedItem = items[startIndex];
    if (!firstProtectedItem || !this.isToolRelatedItem(firstProtectedItem)) {
      return startIndex;
    }

    // Look backwards for the preceding assistant message
    for (let i = startIndex - 1; i >= 0; i--) {
      const item = items[i];
      if (item?.type === "message" && item.role === "assistant") {
        return i;
      }
      // Stop if we hit a user or system message
      if (
        item?.type === "message" &&
        (item.role === "user" || item.role === "system")
      ) {
        break;
      }
    }

    return startIndex;
  }

  /**
   * Extract callId from tool call or result items.
   */
  private extractCallId(item: AgentInputItem | undefined): string | undefined {
    if (!item) return undefined;

    // Check for callId in various tool item formats
    const itemWithCallId = item as { callId?: string };
    if (typeof itemWithCallId.callId === "string") {
      return itemWithCallId.callId;
    }

    return undefined;
  }

  /**
   * Check if an item is tool-related (call or result).
   */
  private isToolRelatedItem(item: AgentInputItem): boolean {
    const type = item.type;
    return (
      type === "function_call" ||
      type === "function_call_result" ||
      type === "hosted_tool_call" ||
      type === "computer_use_call" ||
      type === "shell_call" ||
      type === "apply_patch_call" ||
      type === "computer_call_result" ||
      type === "shell_call_result" ||
      type === "apply_patch_call_result"
    );
  }
}
