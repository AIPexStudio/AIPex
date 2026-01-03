/**
 * Intervention System Type Definitions
 *
 * Defines all types for the Human-in-the-Loop intervention system
 */

/**
 * Intervention mode
 * - disabled: No interventions allowed, AI cannot request any intervention
 * - passive: Passive intervention, AI can request intervention as needed
 */
export type InterventionMode = "disabled" | "passive";

/**
 * Intervention status
 */
export type InterventionStatus =
  | "pending" // Waiting
  | "active" // In progress
  | "completed" // Completed
  | "cancelled" // Cancelled
  | "timeout" // Timed out
  | "error"; // Error

/**
 * Intervention type
 */
export type InterventionType =
  | "monitor-operation" // Monitor user operations
  | "voice-input" // Voice input
  | "user-selection"; // User selection

/**
 * Intervention metadata
 */
export interface InterventionMetadata {
  name: string;
  type: InterventionType;
  description: string;
  enabled: boolean;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
  outputSchema: {
    type: string;
    properties: Record<string, unknown>;
  };
  examples?: Array<{
    description: string;
    input: unknown;
    output: unknown;
  }>;
}

/**
 * Intervention implementation interface
 */
export interface InterventionImplementation {
  metadata: InterventionMetadata;
  execute: (params: unknown, signal: AbortSignal) => Promise<unknown>;
}

/**
 * Intervention request parameters
 */
export interface InterventionRequest {
  id: string;
  type: InterventionType;
  params?: unknown;
  timeout?: number; // Timeout in seconds, default 300
  reason?: string; // AI explanation for why intervention is needed
  conversationId?: string; // Associated conversation ID
  timestamp: number;
}

/**
 * Intervention result
 */
export interface InterventionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  status: InterventionStatus;
  timestamp: number;
  duration?: number; // Execution duration in milliseconds
}

/**
 * Monitor operation result
 */
export interface MonitorOperationResult {
  element: {
    selector: string;
    tagName: string;
    id?: string;
    classes?: string[];
    text?: string;
    attributes?: Record<string, string>;
  };
  context: {
    url: string;
    title: string;
    timestamp: number;
    tabId: number;
  };
}

/**
 * Voice input result
 */
export interface VoiceInputResult {
  text: string;
  confidence: number;
  language: string;
  source: "elevenlabs" | "browser";
  timestamp: number;
  duration?: number; // Recording duration in milliseconds
}

/**
 * Selection option
 */
export interface SelectionOption {
  id: string;
  label: string;
  description?: string;
}

/**
 * User selection parameters
 */
export interface UserSelectionParams {
  question: string;
  options: SelectionOption[];
  mode: "single" | "multiple";
  allowOther?: boolean;
  reason?: string;
}

/**
 * User selection result
 */
export interface UserSelectionResult {
  selectedOptions: SelectionOption[];
  otherText?: string;
}

/**
 * Intervention state (internal use)
 */
export interface InterventionState {
  request: InterventionRequest;
  status: InterventionStatus;
  startTime: number;
  endTime?: number;
  result?: InterventionResult;
  tabId?: number; // Associated tab ID (for page monitoring)
  timeoutHandle?: ReturnType<typeof setTimeout>;
}

/**
 * Intervention event type
 */
export type InterventionEventType =
  | "request"
  | "start"
  | "progress"
  | "complete"
  | "cancel"
  | "timeout"
  | "error";

/**
 * Intervention event
 */
export interface InterventionEvent {
  type: InterventionEventType;
  interventionId: string;
  data?: unknown;
  timestamp: number;
}

/**
 * Global configuration
 */
export interface InterventionGlobalSettings {
  elevenLabsApiKey?: string;
  elevenLabsModelId?: string;
  defaultTimeout: number; // Default 300 seconds
  autoStopVoiceSilence: number; // Default 3 seconds
}

/**
 * Element capture configuration
 */
export interface ElementCaptureOptions {
  tabId: number;
  highlightColor?: string;
  captureScreenshot?: boolean;
}

/**
 * Element capture event
 */
export interface ElementCaptureEvent {
  timestamp: number;
  url: string;
  title: string;
  tagName: string;
  selector: string;
  id?: string;
  classes?: string[];
  text?: string;
  attributes?: Record<string, string>;
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  screenshot?: string; // base64 encoded screenshot
}
