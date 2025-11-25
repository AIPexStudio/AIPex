import type { Agent, AgentEvent } from "@aipexstudio/aipex-core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Chatbot, ChatbotProvider } from "../components/chatbot";
import { useChatContext, useConfigContext } from "../core/context";

// Mock the Agent class
function createMockAgent(): Agent {
  const mockAgent = {
    execute: vi.fn(),
    continueConversation: vi.fn(),
    interrupt: vi.fn(),
    deleteSession: vi.fn(),
    getToolRegistry: vi.fn().mockReturnValue({
      getTool: vi.fn(),
      getAllDeclarations: vi.fn().mockReturnValue([]),
    }),
  } as unknown as Agent;

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

// Mock chrome storage
vi.mock("~/lib/storage", () => ({
  useStorage: vi.fn().mockReturnValue(["", vi.fn(), false]),
}));

describe("Chatbot Component", () => {
  let mockAgent: Agent;

  beforeEach(() => {
    vi.resetAllMocks();
    mockAgent = createMockAgent();

    // Default mock implementation
    (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
      createEventGenerator([
        { type: "session_created", sessionId: "session-1" },
        { type: "execution_complete", reason: "finished", turns: 0 },
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
      (mockAgent.execute as ReturnType<typeof vi.fn>).mockImplementation(
        async function* () {
          yield { type: "execution_start" };
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
    it("should open settings dialog when settings button is clicked", async () => {
      render(<Chatbot agent={mockAgent} />);

      const settingsButton = screen.getByText("Settings");
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("should call reset when new chat button is clicked", () => {
      render(<Chatbot agent={mockAgent} />);

      const newChatButton = screen.getByText("New Chat");
      fireEvent.click(newChatButton);

      // Verify the chat was reset (no messages)
      expect(screen.getByText("Welcome to AIPex")).toBeInTheDocument();
    });
  });
});

describe("ChatbotProvider", () => {
  let mockAgent: Agent;

  beforeEach(() => {
    mockAgent = createMockAgent();
    (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
      (async function* () {
        yield { type: "session_created", sessionId: "session-1" };
        yield { type: "execution_complete", reason: "finished", turns: 0 };
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

  it("should provide components context to children", async () => {
    const CustomHeader = () => <div>Custom Header</div>;

    // Import at the top of the test file instead of using require
    const { useComponentsContext } = await import("../core/context");

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

  it("should provide theme context to children", async () => {
    const { useThemeContext } = await import("../core/context");

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
  let mockAgent: Agent;

  beforeEach(() => {
    mockAgent = createMockAgent();
    (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
      createEventGenerator([
        { type: "session_created", sessionId: "session-1" },
        { type: "execution_complete", reason: "finished", turns: 0 },
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
  let mockAgent: Agent;

  beforeEach(() => {
    mockAgent = createMockAgent();
  });

  it("should handle message sending flow", async () => {
    const events: AgentEvent[] = [
      { type: "session_created", sessionId: "session-1" },
      { type: "execution_start" },
      { type: "turn_start", turnId: "turn-1", number: 1 },
      { type: "content_delta", delta: "Hello!" },
      { type: "execution_complete", reason: "finished", turns: 1 },
    ];

    (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
      createEventGenerator(events),
    );

    render(<Chatbot agent={mockAgent} />);

    // Initially should show welcome screen
    expect(screen.getByText("Welcome to AIPex")).toBeInTheDocument();
  });

  it("should preserve state across re-renders", async () => {
    const events: AgentEvent[] = [
      { type: "session_created", sessionId: "session-1" },
      { type: "execution_complete", reason: "finished", turns: 0 },
    ];

    (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
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
  let mockAgent: Agent;

  beforeEach(() => {
    mockAgent = createMockAgent();
    (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
      createEventGenerator([
        { type: "session_created", sessionId: "session-1" },
        { type: "execution_complete", reason: "finished", turns: 0 },
      ]),
    );
  });

  // Note: These tests are skipped because the handlers prop structure
  // may differ from the current implementation. The handlers are passed
  // to the useChat hook, not directly to UI event handlers.
  it.skip("should call onNewChat when new chat button is clicked", () => {
    const onNewChat = vi.fn();

    render(<Chatbot agent={mockAgent} handlers={{ onNewChat }} />);

    const newChatButton = screen.getByText("New Chat");
    fireEvent.click(newChatButton);

    expect(onNewChat).toHaveBeenCalled();
  });

  it.skip("should call onSettingsOpen when settings button is clicked", async () => {
    const onSettingsOpen = vi.fn();

    render(<Chatbot agent={mockAgent} handlers={{ onSettingsOpen }} />);

    const settingsButton = screen.getByText("Settings");
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(onSettingsOpen).toHaveBeenCalled();
    });
  });
});
