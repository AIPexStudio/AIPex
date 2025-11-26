import type {
  CompletedTurn,
  CompressionConfig,
  Message,
  SummarizerFunction,
} from "../types.js";

export class ConversationCompressor {
  private config: Required<CompressionConfig>;

  constructor(
    private summarizer: SummarizerFunction,
    config: CompressionConfig = {},
  ) {
    this.config = {
      summarizeAfterTurns: config.summarizeAfterTurns ?? 10,
      keepRecentTurns: config.keepRecentTurns ?? 5,
      maxSummaryLength: config.maxSummaryLength ?? 500,
    };
  }

  async compressTurns(turns: CompletedTurn[]): Promise<{
    summary: string;
    compressedTurns: CompletedTurn[];
  }> {
    if (turns.length <= this.config.summarizeAfterTurns) {
      return { summary: "", compressedTurns: turns };
    }

    const turnsToSummarize = turns.slice(
      0,
      turns.length - this.config.keepRecentTurns,
    );
    const recentTurns = turns.slice(-this.config.keepRecentTurns);

    const summary = await this.generateSummary(turnsToSummarize);

    return {
      summary,
      compressedTurns: recentTurns,
    };
  }

  private async generateSummary(turns: CompletedTurn[]): Promise<string> {
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

    const prompt = `You are a conversation summarizer. Create a concise summary of the following conversation, capturing key points, decisions, and information shared. Keep the summary under ${this.config.maxSummaryLength} characters.\n\nConversation:\n${conversationText}`;

    const summary = await this.summarizer(prompt);
    return summary.trim();
  }

  async compressMessages(messages: Message[]): Promise<Message[]> {
    if (messages.length <= this.config.summarizeAfterTurns * 2) {
      return messages;
    }

    const systemMessages = messages.filter((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");
    const turns: Message[][] = [];
    let currentTurn: Message[] = [];

    for (const message of nonSystemMessages) {
      currentTurn.push(message);

      if (message.role === "assistant") {
        turns.push(currentTurn);
        currentTurn = [];
      }
    }

    if (currentTurn.length > 0) {
      turns.push(currentTurn);
    }

    if (turns.length <= this.config.summarizeAfterTurns) {
      return messages;
    }

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

    const prompt = `You are a conversation summarizer. Create a concise summary of the following conversation, capturing key points, decisions, and information shared. Keep the summary under ${this.config.maxSummaryLength} characters.\n\nConversation:\n${conversationText}`;

    const summaryText = await this.summarizer(prompt);

    const summaryMessage: Message = {
      role: "system",
      content: `Previous conversation summary: ${summaryText}`,
    };

    return [...systemMessages, summaryMessage, ...recentTurns.flat()];
  }

  shouldCompress(turnCount: number): boolean {
    return turnCount > this.config.summarizeAfterTurns;
  }
}
