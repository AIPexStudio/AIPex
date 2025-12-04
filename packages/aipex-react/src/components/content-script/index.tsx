/**
 * ContentScript - Extensible content script component
 * Provides a configurable component for browser extension content scripts
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { PluginRegistry } from "../../lib/plugin-registry";
import type {
  Action,
  ActionProvider,
  CommandSuggestion,
  ContentScriptContext,
  ContentScriptPlugin,
  MessageHandlers,
  OmniTheme,
} from "../../types/plugin";

export interface ContentScriptProps {
  /** Omni component to render (use custom or default) */
  omniComponent?: React.ComponentType<OmniComponentProps>;

  /** Custom action provider */
  actionProvider?: ActionProvider;

  /** Custom command suggestions */
  commandSuggestions?: CommandSuggestion[];

  /** Placeholder texts for input (cycles through) */
  placeholders?: string[];

  /** Custom theme */
  theme?: OmniTheme;

  /** Plugins to load */
  plugins?: ContentScriptPlugin[];

  /** Message handlers for chrome.runtime.onMessage */
  messageHandlers?: MessageHandlers;

  /** Called when Omni is opened */
  onOpen?: () => void;

  /** Called when Omni is closed */
  onClose?: () => void;

  /** Initial open state */
  initialOpen?: boolean;
}

export interface OmniComponentProps {
  isOpen: boolean;
  onClose: () => void;
  actions: Action[];
  onRefreshActions: () => void;
  commandSuggestions?: CommandSuggestion[];
  placeholders?: string[];
  theme?: OmniTheme;
  actionProvider?: ActionProvider;
}

/**
 * Default Omni component (can be overridden)
 */
export function DefaultOmni(props: OmniComponentProps) {
  // This would be a simple implementation
  // Real implementation should be more sophisticated
  if (!props.isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 999999,
        background: props.theme?.backgroundColor || "white",
        borderRadius: props.theme?.borderRadius || "8px",
        padding: props.theme?.padding || "16px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
        maxWidth: props.theme?.maxWidth || "600px",
        width: "90%",
      }}
    >
      <div>
        <input
          placeholder={props.placeholders?.[0] || "Search..."}
          style={{ width: "100%", padding: "8px", marginBottom: "8px" }}
        />
        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
          {props.actions.map((action, i) => (
            <div
              key={action.id ?? `${action.type}-${action.title}-${i}`}
              style={{
                padding: "8px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
            >
              {action.emoji && <span>{action.emoji} </span>}
              <strong>{action.title}</strong>
              {action.desc && (
                <div style={{ fontSize: "0.9em", color: "#666" }}>
                  {action.desc}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * ContentScript component
 */
export function ContentScript(props: ContentScriptProps) {
  const {
    omniComponent: OmniComponent = DefaultOmni,
    actionProvider,
    commandSuggestions,
    placeholders,
    theme,
    plugins = [],
    messageHandlers = {},
    onOpen,
    onClose,
    initialOpen = false,
  } = props;

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [actions, setActions] = useState<Action[]>([]);
  const pluginRegistryRef = useRef<PluginRegistry | null>(null);

  // Initialize plugin registry
  useEffect(() => {
    const registry = new PluginRegistry();
    pluginRegistryRef.current = registry;

    for (const plugin of plugins) {
      registry.register(plugin);
    }

    return () => {
      registry.cleanup();
    };
  }, [plugins]);

  // Setup plugins with context
  useEffect(() => {
    if (!pluginRegistryRef.current) return;

    // Create context (in real implementation, this would have proper values)
    const context: ContentScriptContext = {
      shadowRoot: document.body as any, // Placeholder
      container: document.body,
      state: {},
      emit: (event, data) => {
        pluginRegistryRef.current?.emitEvent(event, data);
      },
      on: (_event, _handler) => {
        // Event subscription logic
        return () => {};
      },
      getPlugin: (name) => pluginRegistryRef.current?.get(name),
    };

    pluginRegistryRef.current.setup(context);
  }, []);

  // Handle runtime messages
  useEffect(() => {
    const handleMessage = async (
      message: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: any) => void,
    ) => {
      // Handle built-in messages
      if (message.action === "aipex_open_omni") {
        setIsOpen(true);
        onOpen?.();
        sendResponse({ success: true });
        return true;
      }

      if (message.action === "aipex_close_omni") {
        setIsOpen(false);
        onClose?.();
        sendResponse({ success: true });
        return true;
      }

      // Handle custom messages
      const handler = messageHandlers[message.action];
      if (handler) {
        try {
          const result = await handler(message, sender);
          sendResponse({ success: true, data: result });
        } catch (error) {
          sendResponse({ success: false, error: String(error) });
        }
        return true;
      }

      // Handle with plugins
      await pluginRegistryRef.current?.handleMessage(message);

      return false;
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [messageHandlers, onOpen, onClose]);

  const refreshActions = useCallback(async () => {
    if (actionProvider) {
      try {
        const newActions = await actionProvider.getActions("", {});
        setActions(newActions);
      } catch (error) {
        console.error("Failed to fetch actions:", error);
      }
    }
  }, [actionProvider]);

  useEffect(() => {
    if (isOpen) {
      refreshActions();
    }
  }, [isOpen, refreshActions]);

  return (
    <OmniComponent
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
        onClose?.();
      }}
      actions={actions}
      onRefreshActions={refreshActions}
      commandSuggestions={commandSuggestions}
      placeholders={placeholders}
      theme={theme}
      actionProvider={actionProvider}
    />
  );
}

/**
 * Initialize content script in a Shadow DOM
 */
export function initContentScript(
  props: ContentScriptProps,
  options?: {
    containerId?: string;
    shadowMode?: "open" | "closed";
    injectCSS?: string;
  },
): () => void {
  const {
    containerId = "aipex-content-root",
    shadowMode = "open",
    injectCSS,
  } = options || {};

  // Create container
  const container = document.createElement("div");
  container.id = containerId;
  document.body.appendChild(container);

  // Create shadow root
  const shadowRoot = container.attachShadow({ mode: shadowMode });

  // Create shadow container
  const shadowContainer = document.createElement("div");
  shadowRoot.appendChild(shadowContainer);

  // Inject CSS if provided
  if (injectCSS) {
    const style = document.createElement("style");
    style.textContent = injectCSS;
    shadowRoot.appendChild(style);
  }

  // Render React app
  const root = ReactDOM.createRoot(shadowContainer);
  root.render(React.createElement(ContentScript, props));

  // Return cleanup function
  return () => {
    root.unmount();
    container.remove();
  };
}
