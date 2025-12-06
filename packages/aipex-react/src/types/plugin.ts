/**
 * Plugin System Type Definitions
 * Enables extensibility for AIPex applications
 */

import type { ReactNode } from "react";

// ============ Action Provider ============

export interface Action {
  id?: string;
  title: string;
  desc?: string;
  type: string;
  action?: string;
  emoji?: string;
  emojiChar?: string;
  url?: string;
  keyCheck?: string;
  [key: string]: any;
}

export interface ActionProvider {
  /**
   * Get actions based on search query
   */
  getActions(query: string, context?: ActionContext): Promise<Action[]>;

  /**
   * Handle action execution
   */
  handleAction(action: Action, context?: ActionContext): Promise<void>;
}

export interface ActionContext {
  tabId?: number;
  windowId?: number;
  url?: string;
  [key: string]: any;
}

// ============ Command Suggestions ============

export interface CommandSuggestion {
  command: string;
  description: string;
  handler: () => void | Promise<void>;
}

// ============ Message Handlers ============

export type MessageHandler<T = any, R = any> = (
  message: T,
  sender?: any, // chrome.runtime.MessageSender (avoiding chrome namespace dependency)
) => R | Promise<R>;

export type MessageHandlers = Record<string, MessageHandler>;

// ============ Content Script Plugin ============

export interface ContentScriptContext {
  /** Shadow root element */
  shadowRoot: ShadowRoot;
  /** Container element */
  container: HTMLElement;
  /** Plugin state storage */
  state: Record<string, any>;
  /** Emit custom events */
  emit: (event: string, data: any) => void;
  /** Subscribe to custom events */
  on: (event: string, handler: (data: any) => void) => () => void;
  /** Get registered plugin by name */
  getPlugin: (name: string) => ContentScriptPlugin | undefined;
}

export interface ContentScriptPlugin {
  /** Unique plugin name */
  name: string;

  /** Setup plugin when content script initializes */
  setup?: (context: ContentScriptContext) => void | Promise<void>;

  /** Cleanup when content script is destroyed */
  cleanup?: () => void | Promise<void>;

  /** Handle runtime messages */
  onMessage?: (
    message: any,
    context: ContentScriptContext,
  ) => void | Promise<void>;

  /** Handle custom events */
  onEvent?: (event: string, data: any, context: ContentScriptContext) => void;
}

// ============ App Root Extensions ============

export interface HeaderSlotProps {
  onClose?: () => void;
  [key: string]: any;
}

export interface FooterSlotProps {
  version?: string;
  [key: string]: any;
}

export interface AppRootExtensions {
  /** Custom header component */
  headerSlot?: React.ComponentType<HeaderSlotProps>;

  /** Custom footer component */
  footerSlot?: React.ComponentType<FooterSlotProps>;

  /** Additional content before chatbot */
  beforeChatbot?: ReactNode;

  /** Additional content after chatbot */
  afterChatbot?: ReactNode;
}

// ============ Theme Extensions ============

export interface OmniTheme {
  // Colors
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  highlightColor?: string;

  // Layout
  maxWidth?: string;
  borderRadius?: string;
  padding?: string;

  // Custom CSS
  customCSS?: string;
}

// ============ Lifecycle Hooks ============

export interface LifecycleHooks {
  /** Called before component mounts */
  onBeforeMount?: () => void | Promise<void>;

  /** Called after component mounts */
  onAfterMount?: () => void | Promise<void>;

  /** Called before component unmounts */
  onBeforeUnmount?: () => void | Promise<void>;

  /** Called on error */
  onError?: (error: Error) => void;
}
