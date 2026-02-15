/**
 * Browser Extension App Root
 * Simple wrapper using browser-specific hooks
 */

import { useAgent, useChatConfig } from "@aipexstudio/aipex-react";
import ChatBot from "@aipexstudio/aipex-react/components/chatbot";
import { ErrorBoundary } from "@aipexstudio/aipex-react/components/error/ErrorBoundary";
import type { InterventionMode } from "@aipexstudio/aipex-react/components/intervention";
import { I18nProvider } from "@aipexstudio/aipex-react/i18n/context";
import type { Language } from "@aipexstudio/aipex-react/i18n/types";
import { ThemeProvider } from "@aipexstudio/aipex-react/theme/context";
import type { Theme } from "@aipexstudio/aipex-react/theme/types";
import { ChromeStorageAdapter } from "@aipexstudio/browser-runtime";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "../../auth";
import { chromeStorageAdapter } from "../../hooks";
import { AutomationModeInputToolbar } from "../../lib/automation-mode-toolbar";
import {
  BROWSER_AGENT_CONFIG,
  useBrowserContextProviders,
  useBrowserModelFactory,
  useBrowserStorage,
  useBrowserTools,
} from "../../lib/browser-agent-config";
import { BrowserChatHeader } from "../../lib/browser-chat-header";
import { BrowserChatInputArea } from "../../lib/browser-chat-input-area";
import { BrowserContextLoader } from "../../lib/browser-context-loader";
import { BrowserMessageList } from "../../lib/browser-message-list";
import { ChatImagesListener } from "../../lib/chat-images-listener";
import { InputModeProvider } from "../../lib/input-mode-context";
import { InterventionModeProvider } from "../../lib/intervention-mode-context";
import { InterventionUI } from "../../lib/intervention-ui";
import { UpdateBannerWrapper } from "../../lib/update-banner-wrapper";

const i18nStorageAdapter = new ChromeStorageAdapter<Language>();
const themeStorageAdapter = new ChromeStorageAdapter<Theme>();

// ---------------------------------------------------------------------------
// Replay setup listener
// ---------------------------------------------------------------------------

/** Replay step shape coming from the external website */
interface ReplayStepData {
  id?: number;
  event: { type: string; [key: string]: unknown };
  url?: string | null;
  aiTitle?: string | null;
  aiSummary?: string | null;
}

/**
 * Listens for `NAVIGATE_AND_SETUP_REPLAY` messages forwarded by the
 * background service worker after an external `REPLAY_USER_MANUAL` request.
 *
 * The replay steps are persisted to `chrome.storage.local` under
 * `aipex-pending-replay` so they can be consumed by the use-case system
 * when it is available.
 */
function useReplaySetup() {
  useEffect(() => {
    const handler = (message: Record<string, unknown>) => {
      if (message?.request !== "NAVIGATE_AND_SETUP_REPLAY") return;

      const data = message.data as
        | {
            manualId?: number;
            startFromStep?: number;
            steps?: ReplayStepData[];
          }
        | undefined;

      if (!data || !Array.isArray(data.steps) || data.steps.length === 0) {
        console.warn("[ReplaySetup] Invalid or empty replay data received");
        return;
      }

      // Persist replay data for future use-case system consumption
      chrome.storage.local
        .set({
          "aipex-pending-replay": {
            manualId: data.manualId,
            startFromStep: data.startFromStep ?? 0,
            steps: data.steps,
            receivedAt: Date.now(),
          },
        })
        .catch(() => {
          /* storage may be unavailable */
        });

      console.log(
        "[ReplaySetup] Replay data stored:",
        data.steps.length,
        "steps for manual",
        data.manualId,
      );
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => {
      chrome.runtime.onMessage.removeListener(handler);
    };
  }, []);
}

// ---------------------------------------------------------------------------
// Pending prompt
// ---------------------------------------------------------------------------

/**
 * Reads and consumes a pending prompt saved by the openWithPrompt external
 * message handler in the background service worker.  Prompts older than 5 s
 * are treated as expired and silently discarded.
 */
function usePendingPrompt() {
  const [pendingInput, setPendingInput] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    const check = async () => {
      try {
        const result = await chrome.storage.local.get([
          "aipex-pending-prompt",
          "aipex-pending-prompt-timestamp",
        ]);

        const prompt = result["aipex-pending-prompt"];
        const timestamp = result["aipex-pending-prompt-timestamp"];

        if (prompt && typeof prompt === "string") {
          const now = Date.now();
          // Only use prompts that are less than 5 seconds old
          if (typeof timestamp === "number" && now - timestamp < 5000) {
            setPendingInput(prompt);
          }
        }

        // Always clear storage regardless of expiry
        if (prompt) {
          chrome.storage.local.remove([
            "aipex-pending-prompt",
            "aipex-pending-prompt-timestamp",
          ]);
        }
      } catch {
        // Silently ignore – storage may not be available yet
      }
    };

    check();
  }, []);

  return pendingInput;
}

/**
 * Manages the "aipex-conversation-active" heartbeat in chrome.storage.local
 * so content scripts can show the breathing border overlay while the AI is
 * actively generating a response.
 */
function useConversationHeartbeat() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    // Avoid duplicate intervals
    if (intervalRef.current) return;

    const tick = () => {
      chrome.storage.local
        .set({ "aipex-conversation-active": Date.now() })
        .catch(() => {});
    };
    tick(); // Immediate first tick
    intervalRef.current = setInterval(tick, 2000);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    chrome.storage.local.remove("aipex-conversation-active").catch(() => {});
  }, []);

  // Cleanup on unmount
  useEffect(() => stop, [stop]);

  return { start, stop };
}

function ChatApp() {
  const { settings, isLoading } = useChatConfig({
    storageAdapter: chromeStorageAdapter,
    autoLoad: true,
  });

  const storage = useBrowserStorage();
  const modelFactory = useBrowserModelFactory();
  const contextProviders = useBrowserContextProviders();
  const tools = useBrowserTools();

  const { agent, error } = useAgent({
    settings,
    isLoading,
    modelFactory,
    storage,
    contextProviders,
    tools,
    ...BROWSER_AGENT_CONFIG,
  });

  const pendingInput = usePendingPrompt();
  const heartbeat = useConversationHeartbeat();
  useReplaySetup();

  const handleStatusChange = useCallback(
    (status: string) => {
      if (status === "streaming" || status === "submitted") {
        heartbeat.start();
      } else {
        heartbeat.stop();
      }
    },
    [heartbeat],
  );

  const [interventionMode, setInterventionMode] =
    useState<InterventionMode>("passive");

  // Sidepanel lifecycle: port connection + cleanup on hide/close
  useEffect(() => {
    // Long-lived port so the background can detect sidepanel disconnect
    const port = chrome.runtime.connect({ name: "sidepanel" });

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Stop any active recording
        chrome.runtime.sendMessage({ request: "stop-recording" }).catch(() => {
          /* background may be busy */
        });
        // Stop element capture on the active tab
        chrome.runtime
          .sendMessage({
            request: "relay-to-active-tab",
            message: { request: "stop-capture" },
          })
          .catch(() => {
            /* tab may be closed */
          });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      port.disconnect();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <InputModeProvider>
      <InterventionModeProvider
        mode={interventionMode}
        setMode={setInterventionMode}
      >
        <ChatBot
          agent={agent}
          configError={error}
          initialSettings={settings}
          storageAdapter={chromeStorageAdapter}
          initialInput={pendingInput}
          handlers={{
            onStatusChange: handleStatusChange,
          }}
          components={{
            Header: BrowserChatHeader,
            MessageList: BrowserMessageList,
            InputArea: BrowserChatInputArea,
          }}
          slots={{
            beforeMessages: () => <UpdateBannerWrapper />,
            afterMessages: () => (
              <>
                <InterventionUI
                  mode={interventionMode}
                  onModeChange={setInterventionMode}
                />
                <ChatImagesListener />
              </>
            ),
            inputToolbar: (props) => <AutomationModeInputToolbar {...props} />,
            promptExtras: () => <BrowserContextLoader />,
          }}
        />
      </InterventionModeProvider>
    </InputModeProvider>
  );
}

export function renderChatApp() {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    return;
  }

  const App = () => (
    <ErrorBoundary>
      <I18nProvider storageAdapter={i18nStorageAdapter}>
        <ThemeProvider storageAdapter={themeStorageAdapter}>
          <AuthProvider>
            <ChatApp />
          </AuthProvider>
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
