/**
 * ContentScript - Extensible content script component
 * Provides a configurable component for browser extension content scripts
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { PluginRegistry } from "../../lib/plugin-registry";
import {
  getRuntime,
  type RuntimeApi,
  type RuntimeMessageSender,
} from "../../lib/runtime";
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

  /** Browser runtime-like API (defaults to global chrome.runtime if available) */
  runtime?: RuntimeApi;

  /** Container element used for plugin context (defaults to document.body) */
  container?: HTMLElement;

  /** Shadow root used for plugin context (defaults to container shadow root if any) */
  shadowRoot?: ShadowRoot;

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
    runtime: runtimeProp,
    container,
    shadowRoot: shadowRootProp,
  } = props;

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [actions, setActions] = useState<Action[]>([]);
  const pluginRegistryRef = useRef<PluginRegistry | null>(null);
  const sharedStateRef = useRef<Record<string, any>>({});
  const eventHandlersRef = useRef<Map<string, Set<(data: any) => void>>>(
    new Map(),
  );
  const runtime = runtimeProp ?? getRuntime();
  const resolvedContainer = container ?? document.body;

  // Initialize plugin registry and context
  useEffect(() => {
    let cleanupHost: HTMLElement | null = null;
    let effectiveShadowRoot: ShadowRoot | null = shadowRootProp ?? null;

    if (!effectiveShadowRoot) {
      const rootNode = resolvedContainer.getRootNode();
      if (rootNode instanceof ShadowRoot) {
        effectiveShadowRoot = rootNode;
      }
    }

    if (!effectiveShadowRoot && resolvedContainer.attachShadow) {
      try {
        effectiveShadowRoot = resolvedContainer.attachShadow({ mode: "open" });
      } catch {
        // Some hosts (e.g., <body>) may reject shadow roots; fall back below.
      }
    }

    if (!effectiveShadowRoot) {
      cleanupHost = document.createElement("div");
      cleanupHost.style.display = "none";
      document.body.appendChild(cleanupHost);
      effectiveShadowRoot = cleanupHost.attachShadow({ mode: "open" });
    }

    if (!effectiveShadowRoot) return;

    const registry = new PluginRegistry();
    pluginRegistryRef.current = registry;

    const emit = (event: string, data: any) => {
      registry.emitEvent(event, data);
      const handlers = eventHandlersRef.current.get(event);
      if (!handlers) return;
      handlers.forEach((handler) => {
        handler(data);
      });
    };

    const on = (event: string, handler: (data: any) => void) => {
      const handlers = eventHandlersRef.current.get(event) ?? new Set();
      handlers.add(handler);
      eventHandlersRef.current.set(event, handlers);
      return () => {
        const current = eventHandlersRef.current.get(event);
        if (!current) return;
        current.delete(handler);
        if (current.size === 0) {
          eventHandlersRef.current.delete(event);
        }
      };
    };

    const context: ContentScriptContext = {
      shadowRoot: effectiveShadowRoot,
      container: resolvedContainer,
      state: sharedStateRef.current,
      emit,
      on,
      getPlugin: (name) => registry.get(name),
    };

    for (const plugin of plugins) {
      registry.register(plugin);
    }

    void registry.setup(context);

    return () => {
      eventHandlersRef.current.clear();
      registry.cleanup();
      pluginRegistryRef.current = null;
      if (cleanupHost && cleanupHost !== resolvedContainer) {
        cleanupHost.remove();
      }
    };
  }, [plugins, resolvedContainer, shadowRootProp]);

  // Handle runtime messages
  useEffect(() => {
    if (!runtime?.onMessage) return;

    const handleMessage = async (
      message: any,
      sender: RuntimeMessageSender,
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

    runtime.onMessage.addListener(handleMessage);

    return () => {
      runtime.onMessage?.removeListener(handleMessage);
    };
  }, [messageHandlers, onOpen, onClose, runtime]);

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
  const root = createRoot(shadowContainer);
  root.render(
    React.createElement(ContentScript, {
      ...props,
      container: shadowContainer,
      shadowRoot,
    }),
  );

  // Return cleanup function
  return () => {
    root.unmount();
    container.remove();
  };
}
