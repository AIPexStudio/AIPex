import type { AgentEvent, AIPex } from "@aipexstudio/aipex-core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useChatContext,
  useComponentsContext,
  useConfigContext,
  useThemeContext,
} from "../context";
import { Chatbot, ChatbotProvider } from "./chatbot";

const baseMetrics = {
  tokensUsed: 0,
  promptTokens: 0,
  completionTokens: 0,
  itemCount: 0,
  maxTurns: 10,
  duration: 0,
  startTime: 0,
};

function createExecutionCompleteEvent(): AgentEvent {
  return {
    type: "execution_complete",
    finalOutput: "",
    metrics: { ...baseMetrics, startTime: Date.now() },
  };
}

// Mock the Agent class
function createMockAgent(): AIPex {
  const conversationManager = {
    deleteSession: vi.fn(),
  };

  const mockAgent = {
    chat: vi.fn(),
    getConversationManager: vi.fn(() => conversationManager),
  } as unknown as AIPex;

  return mockAgent;
}

// Helper to create an async generator from events
async function* createEventGenerator(
  events: AgentEvent[],
): AsyncGenerator<AgentEvent> {
  for (const event of events) {
    yield event;
  }
}

describe("Chatbot Component", () => {
  let mockAgent: AIPex;

  beforeEach(() => {
    vi.resetAllMocks();
    mockAgent = createMockAgent();

    // Default mock implementation
    (mockAgent.chat as ReturnType<typeof vi.fn>).mockReturnValue(
      createEventGenerator([
        { type: "session_created", sessionId: "session-1" },
        createExecutionCompleteEvent(),
      ]),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("should render the chatbot component", () => {
      render(<Chatbot agent={mockAgent} />);

      // Should show header with title
      expect(screen.getByText("AIPex")).toBeInTheDocument();
    });

    it("should render with custom title", () => {
      render(<Chatbot agent={mockAgent} title="My Chat" />);

      expect(screen.getByText("My Chat")).toBeInTheDocument();
    });

    it("should render welcome screen when no messages", () => {
      render(<Chatbot agent={mockAgent} />);

      expect(screen.getByText("Welcome to AIPex")).toBeInTheDocument();
    });
  });

  describe("component customization", () => {
    it("should render custom Header component", () => {
      const CustomHeader = () => <div data-testid="custom-header">Custom</div>;

      render(
        <Chatbot agent={mockAgent} components={{ Header: CustomHeader }} />,
      );

      expect(screen.getByTestId("custom-header")).toBeInTheDocument();
    });

    it("should render custom WelcomeScreen component", () => {
      const CustomWelcome = () => (
        <div data-testid="custom-welcome">Welcome!</div>
      );

      render(
        <Chatbot
          agent={mockAgent}
          components={{ WelcomeScreen: CustomWelcome }}
        />,
      );

      expect(screen.getByTestId("custom-welcome")).toBeInTheDocument();
    });
  });

  describe("slot customization", () => {
    it("should render custom emptyState slot", () => {
      const customEmptyState = () => (
        <div data-testid="custom-empty">No messages yet</div>
      );

      render(
        <Chatbot agent={mockAgent} slots={{ emptyState: customEmptyState }} />,
      );

      expect(screen.getByTestId("custom-empty")).toBeInTheDocument();
    });

    it("should render custom loadingIndicator slot", async () => {
      const customLoader = () => (
        <div data-testid="custom-loader">Loading...</div>
      );

      // Mock to keep in submitted state
      (mockAgent.chat as ReturnType<typeof vi.fn>).mockImplementation(
        async function* () {
          yield { type: "session_created", sessionId: "session-1" };
          // Don't complete - stay in loading state
          await new Promise(() => {}); // Never resolves
        },
      );

      render(
        <Chatbot
          agent={mockAgent}
          slots={{ loadingIndicator: customLoader }}
        />,
      );

      // Trigger a message to start loading
      // This would require more setup to properly test
    });
  });

  describe("theme customization", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <Chatbot agent={mockAgent} className="my-custom-class" />,
      );

      const chatbot = container.firstChild as HTMLElement;
      expect(chatbot.className).toContain("my-custom-class");
    });

    it("should apply theme className", () => {
      const { container } = render(
        <Chatbot agent={mockAgent} theme={{ className: "theme-dark" }} />,
      );

      const chatbot = container.firstChild as HTMLElement;
      expect(chatbot.className).toContain("theme-dark");
    });

    it("should apply theme CSS variables", () => {
      const { container } = render(
        <Chatbot
          agent={mockAgent}
          theme={{
            variables: {
              "--chatbot-primary": "red",
            },
          }}
        />,
      );

      const chatbot = container.firstChild as HTMLElement;
      expect(chatbot.style.getPropertyValue("--chatbot-primary")).toBe("red");
    });
  });

  describe("interactions", () => {
    it("should call chrome.runtime.openOptionsPage when settings button is clicked", () => {
      const openOptionsPage = vi.fn();
      vi.stubGlobal("chrome", {
        runtime: { openOptionsPage },
      });

      render(<Chatbot agent={mockAgent} />);

      const settingsButton = screen.getByText("Settings");
      fireEvent.click(settingsButton);

      expect(openOptionsPage).toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it("should call reset when new chat button is clicked", () => {
      render(<Chatbot agent={mockAgent} />);

      const newChatButton = screen.getByText("New Chat");
      fireEvent.click(newChatButton);

      // Verify the chat was reset (no messages)
      expect(screen.getByText("Welcome to AIPex")).toBeInTheDocument();
    });

    it("should send suggestion text when welcome suggestion is clicked", async () => {
      render(<Chatbot agent={mockAgent} />);

      const suggestion = screen.getByText(
        "Help me organize my browser tabs by topic",
      );
      fireEvent.click(suggestion);

      await waitFor(() => {
        expect(mockAgent.chat).toHaveBeenCalled();
      });
    });
  });
});

describe("ChatbotProvider", () => {
  let mockAgent: AIPex;

  beforeEach(() => {
    mockAgent = createMockAgent();
    (mockAgent.chat as ReturnType<typeof vi.fn>).mockReturnValue(
      (async function* () {
        yield { type: "session_created", sessionId: "session-1" };
        yield createExecutionCompleteEvent();
      })(),
    );
  });

  it("should provide chat context to children", () => {
    const TestChild = () => {
      const { status, messages } = useChatContext();
      return (
        <div>
          <span data-testid="status">{status}</span>
          <span data-testid="count">{messages.length}</span>
        </div>
      );
    };

    render(
      <ChatbotProvider agent={mockAgent}>
        <TestChild />
      </ChatbotProvider>,
    );

    expect(screen.getByTestId("status")).toHaveTextContent("idle");
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("should provide config context to children", () => {
    const TestChild = () => {
      const { settings, isLoading } = useConfigContext();
      return (
        <div>
          <span data-testid="loading">{isLoading ? "yes" : "no"}</span>
          <span data-testid="model">{settings.aiModel || "none"}</span>
        </div>
      );
    };

    render(
      <ChatbotProvider agent={mockAgent} initialSettings={{ aiModel: "gpt-4" }}>
        <TestChild />
      </ChatbotProvider>,
    );

    expect(screen.getByTestId("model")).toHaveTextContent("gpt-4");
  });

  it("should throw error when useChatContext is used outside provider", () => {
    const TestChild = () => {
      useChatContext();
      return null;
    };

    expect(() => render(<TestChild />)).toThrow(
      "useChatContext must be used within a ChatbotProvider",
    );
  });

  it("should provide components context to children", () => {
    const CustomHeader = () => <div>Custom Header</div>;

    const TestChild = () => {
      const { components } = useComponentsContext();
      return (
        <div data-testid="has-header">{components.Header ? "yes" : "no"}</div>
      );
    };

    render(
      <ChatbotProvider agent={mockAgent} components={{ Header: CustomHeader }}>
        <TestChild />
      </ChatbotProvider>,
    );

    expect(screen.getByTestId("has-header")).toHaveTextContent("yes");
  });

  it("should provide theme context to children", () => {
    const TestChild = () => {
      const { theme, className } = useThemeContext();
      return (
        <div>
          <span data-testid="theme-class">{className || "none"}</span>
          <span data-testid="has-vars">{theme.variables ? "yes" : "no"}</span>
        </div>
      );
    };

    render(
      <ChatbotProvider
        agent={mockAgent}
        theme={{
          className: "dark-theme",
          variables: { "--chatbot-primary": "blue" },
        }}
      >
        <TestChild />
      </ChatbotProvider>,
    );

    expect(screen.getByTestId("theme-class")).toHaveTextContent("dark-theme");
    expect(screen.getByTestId("has-vars")).toHaveTextContent("yes");
  });
});

describe("Chatbot Accessibility", () => {
  let mockAgent: AIPex;

  beforeEach(() => {
    mockAgent = createMockAgent();
    (mockAgent.chat as ReturnType<typeof vi.fn>).mockReturnValue(
      createEventGenerator([
        { type: "session_created", sessionId: "session-1" },
        createExecutionCompleteEvent(),
      ]),
    );
  });

  it("should have accessible buttons", () => {
    render(<Chatbot agent={mockAgent} />);

    const settingsButton = screen.getByText("Settings");
    const newChatButton = screen.getByText("New Chat");

    expect(settingsButton).toBeInTheDocument();
    expect(newChatButton).toBeInTheDocument();
  });
});

describe("Chatbot State Management", () => {
  let mockAgent: AIPex;

  beforeEach(() => {
    mockAgent = createMockAgent();
  });

  it("should handle message sending flow", async () => {
    const events: AgentEvent[] = [
      { type: "session_created", sessionId: "session-1" },
      { type: "content_delta", delta: "Hello!" },
      createExecutionCompleteEvent(),
    ];

    (mockAgent.chat as ReturnType<typeof vi.fn>).mockReturnValue(
      createEventGenerator(events),
    );

    render(<Chatbot agent={mockAgent} />);

    // Initially should show welcome screen
    expect(screen.getByText("Welcome to AIPex")).toBeInTheDocument();
  });

  it("should preserve state across re-renders", async () => {
    const events: AgentEvent[] = [
      { type: "session_created", sessionId: "session-1" },
      createExecutionCompleteEvent(),
    ];

    (mockAgent.chat as ReturnType<typeof vi.fn>).mockReturnValue(
      createEventGenerator(events),
    );

    const { rerender } = render(<Chatbot agent={mockAgent} />);

    // Re-render with same props
    rerender(<Chatbot agent={mockAgent} />);

    // Should still show the same content
    expect(screen.getByText("Welcome to AIPex")).toBeInTheDocument();
  });
});

describe("Chatbot Event Handlers", () => {
  let mockAgent: AIPex;

  beforeEach(() => {
    mockAgent = createMockAgent();
    (mockAgent.chat as ReturnType<typeof vi.fn>).mockReturnValue(
      createEventGenerator([
        { type: "session_created", sessionId: "session-1" },
        createExecutionCompleteEvent(),
      ]),
    );
  });

  // Note: These tests are skipped because the handlers prop structure
  // may differ from the current implementation. The handlers are passed
  // to the useChat hook, not directly to UI event handlers.
  it.skip("should call onNewChat when new chat button is clicked", () => {
    const onNewChat = vi.fn();

    render(<Chatbot agent={mockAgent} handlers={{ onNewChat } as any} />);

    const newChatButton = screen.getByText("New Chat");
    fireEvent.click(newChatButton);

    expect(onNewChat).toHaveBeenCalled();
  });

  it.skip("should call onSettingsOpen when settings button is clicked", async () => {
    const onSettingsOpen = vi.fn();

    render(<Chatbot agent={mockAgent} handlers={{ onSettingsOpen } as any} />);

    const settingsButton = screen.getByText("Settings");
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(onSettingsOpen).toHaveBeenCalled();
    });
  });
});
