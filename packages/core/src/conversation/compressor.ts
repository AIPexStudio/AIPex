import type { LLMProvider } from "../llm/provider.js";
import type { UnifiedMessage } from "../llm/types.js";
import type { CompletedTurn } from "./types.js";

export interface CompressionConfig {
  summarizeAfterTurns?: number;
  keepRecentTurns?: number;
  maxSummaryLength?: number;
}

export class ConversationCompressor {
  private config: Required<CompressionConfig>;

  constructor(
    private llmProvider: LLMProvider,
    config: CompressionConfig = {},
  ) {
    this.config = {
      summarizeAfterTurns: config.summarizeAfterTurns || 10,
      keepRecentTurns: config.keepRecentTurns || 5,
      maxSummaryLength: config.maxSummaryLength || 500,
    };
  }

  async compressTurns(turns: CompletedTurn[]): Promise<{
    summary: string;
    compressedTurns: CompletedTurn[];
  }> {
    if (turns.length <= this.config.summarizeAfterTurns) {
      return { summary: "", compressedTurns: turns };
    }

    // Split turns into old (to summarize) and recent (to keep)
    const turnsToSummarize = turns.slice(
      0,
      turns.length - this.config.keepRecentTurns,
    );
    const recentTurns = turns.slice(-this.config.keepRecentTurns);

    // Generate summary of old turns
    const summary = await this.generateSummary(turnsToSummarize);

    return {
      summary,
      compressedTurns: recentTurns,
    };
  }

  private async generateSummary(turns: CompletedTurn[]): Promise<string> {
    // Convert turns to a readable format for the LLM
    const conversationText = turns
      .map((turn) => {
        let text = `User: ${turn.userMessage.content}\n`;
        text += `Assistant: ${turn.assistantMessage.content}`;

        if (turn.functionCalls.length > 0) {
          text += `\n  Tools used: ${turn.functionCalls.map((fc) => fc.name).join(", ")}`;
        }

        return text;
      })
      .join("\n\n");

    // Request summary from LLM
    const response = await this.llmProvider.generateContent({
      messages: [
        {
          role: "system",
          content: `You are a conversation summarizer. Create a concise summary of the following conversation, capturing key points, decisions, and information shared. Keep the summary under ${this.config.maxSummaryLength} characters.`,
        },
        {
          role: "user",
          content: `Please summarize this conversation:\n\n${conversationText}`,
        },
      ],
    });

    return response.text.trim();
  }

  async compressMessages(
    messages: UnifiedMessage[],
  ): Promise<UnifiedMessage[]> {
    if (messages.length <= this.config.summarizeAfterTurns * 2) {
      return messages;
    }

    // Keep system messages
    const systemMessages = messages.filter((m) => m.role === "system");

    // Group remaining messages into turns (user + assistant pairs)
    const nonSystemMessages = messages.filter((m) => m.role !== "system");
    const turns: UnifiedMessage[][] = [];
    let currentTurn: UnifiedMessage[] = [];

    for (const message of nonSystemMessages) {
      currentTurn.push(message);

      // A turn is complete when we have an assistant response
      if (message.role === "assistant") {
        turns.push(currentTurn);
        currentTurn = [];
      }
    }

    // If there's an incomplete turn, add it
    if (currentTurn.length > 0) {
      turns.push(currentTurn);
    }

    // If we don't have enough turns, return as is
    if (turns.length <= this.config.summarizeAfterTurns) {
      return messages;
    }

    // Summarize old turns
    const turnsToSummarize = turns.slice(
      0,
      turns.length - this.config.keepRecentTurns,
    );
    const recentTurns = turns.slice(-this.config.keepRecentTurns);

    const conversationText = turnsToSummarize
      .map((turn) => {
        return turn.map((msg) => `${msg.role}: ${msg.content}`).join("\n");
      })
      .join("\n\n");

    const response = await this.llmProvider.generateContent({
      messages: [
        {
          role: "system",
          content: `You are a conversation summarizer. Create a concise summary of the following conversation, capturing key points, decisions, and information shared. Keep the summary under ${this.config.maxSummaryLength} characters.`,
        },
        {
          role: "user",
          content: `Please summarize this conversation:\n\n${conversationText}`,
        },
      ],
    });

    const summaryMessage: UnifiedMessage = {
      role: "system",
      content: `Previous conversation summary: ${response.text.trim()}`,
    };

    // Combine: system messages + summary + recent turns
    return [...systemMessages, summaryMessage, ...recentTurns.flat()];
  }

  shouldCompress(turnCount: number): boolean {
    return turnCount > this.config.summarizeAfterTurns;
  }
}
