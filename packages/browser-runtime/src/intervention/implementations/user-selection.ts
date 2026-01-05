/**
 * User Selection Intervention
 *
 * Let users choose one or more answers from multiple options
 */

import type {
  InterventionImplementation,
  InterventionMetadata,
  UserSelectionParams,
  UserSelectionResult,
} from "../types.js";

/**
 * Selection Manager
 * Manages selection requests and callbacks
 * Simplified design: one selection request at a time
 */
class SelectionManager {
  private static instance: SelectionManager;
  private currentRequest: {
    resolve: (result: UserSelectionResult) => void;
    reject: (error: Error) => void;
  } | null = null;

  static getInstance(): SelectionManager {
    if (!SelectionManager.instance) {
      SelectionManager.instance = new SelectionManager();
    }
    return SelectionManager.instance;
  }

  /**
   * Create a new selection request
   */
  createRequest(): Promise<UserSelectionResult> {
    return new Promise((resolve, reject) => {
      this.currentRequest = { resolve, reject };
    });
  }

  /**
   * Complete selection (called by UI component)
   */
  completeSelection(result: UserSelectionResult): void {
    if (this.currentRequest) {
      console.log(
        "[SelectionManager] Completing selection with result:",
        result,
      );
      this.currentRequest.resolve(result);
      this.currentRequest = null;
    } else {
      console.warn("[SelectionManager] No pending request to complete");
    }
  }

  /**
   * Cancel selection (called by UI component or timeout)
   */
  cancelSelection(error: Error): void {
    if (this.currentRequest) {
      console.log("[SelectionManager] Cancelling selection:", error.message);
      this.currentRequest.reject(error);
      this.currentRequest = null;
    }
  }

  /**
   * Cleanup request
   */
  cleanup(): void {
    this.currentRequest = null;
  }
}

export const selectionManager = SelectionManager.getInstance();

const metadata: InterventionMetadata = {
  name: "User Selection",
  type: "user-selection",
  description:
    "Show questions and options to users, let them choose one or more answers",
  enabled: true,
  inputSchema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "Question to ask the user",
      },
      options: {
        type: "array",
        description: "List of options",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Option ID" },
            label: { type: "string", description: "Option label" },
            description: {
              type: "string",
              description: "Option description (optional)",
            },
          },
          required: ["id", "label"],
        },
      },
      mode: {
        type: "string",
        enum: ["single", "multiple"],
        description: "Selection mode: single or multiple",
      },
      allowOther: {
        type: "boolean",
        description: "Whether to allow user to input 'other' option",
        default: false,
      },
      reason: {
        type: "string",
        description: "Explain why user selection is needed",
      },
    },
    required: ["question", "options", "mode"],
  },
  outputSchema: {
    type: "object",
    properties: {
      selectedOptions: {
        type: "array",
        description: "User selected options",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string" },
            description: { type: "string" },
          },
        },
      },
      otherText: {
        type: "string",
        description: "If user selected 'other', this is the input text",
      },
    },
  },
  examples: [
    {
      description: "AI needs user to select one option from multiple",
      input: {
        question: "Which operation do you want to perform?",
        options: [
          { id: "save", label: "Save", description: "Save current changes" },
          {
            id: "discard",
            label: "Discard",
            description: "Discard all changes",
          },
          {
            id: "continue",
            label: "Continue editing",
            description: "Continue editing without saving",
          },
        ],
        mode: "single",
        reason: "Need to confirm how to handle unsaved changes",
      },
      output: {
        selectedOptions: [
          { id: "save", label: "Save", description: "Save current changes" },
        ],
      },
    },
    {
      description: "AI needs user to select multiple options",
      input: {
        question: "Which data do you want to export?",
        options: [
          { id: "contacts", label: "Contacts" },
          { id: "messages", label: "Message history" },
          { id: "files", label: "Files" },
        ],
        mode: "multiple",
        allowOther: true,
        reason: "Need to determine which data types to export",
      },
      output: {
        selectedOptions: [
          { id: "contacts", label: "Contacts" },
          { id: "messages", label: "Message history" },
        ],
      },
    },
  ],
};

/**
 * Execute user selection
 */
async function execute(
  params: unknown,
  signal: AbortSignal,
): Promise<UserSelectionResult> {
  console.log("[UserSelection] Starting execution with params:", params);

  // Validate params
  if (typeof params !== "object" || params === null) {
    throw new Error("Invalid parameters: params must be an object");
  }

  const paramsObj = params as Record<string, unknown>;

  if (
    !("question" in paramsObj) ||
    !("options" in paramsObj) ||
    !Array.isArray(paramsObj.options) ||
    paramsObj.options.length === 0
  ) {
    throw new Error("Invalid parameters: question and options are required");
  }

  if (
    !("mode" in paramsObj) ||
    (paramsObj.mode !== "single" && paramsObj.mode !== "multiple")
  ) {
    throw new Error('Invalid mode: must be "single" or "multiple"');
  }

  // Compatibility handling: if options is string array, convert to object array
  const normalizedOptions = (paramsObj.options as unknown[]).map(
    (opt: unknown, index: number) => {
      if (typeof opt === "string") {
        // Convert string to object
        return {
          id: `option-${index}`,
          label: opt,
        };
      }
      if (opt && typeof opt === "object" && "label" in opt) {
        // Already object format, ensure it has id
        const optObj = opt as {
          id?: string;
          label: string;
          description?: string;
        };
        return {
          id: optObj.id || `option-${index}`,
          label: optObj.label,
          description: optObj.description,
        };
      }
      // Invalid format
      console.warn(
        "[UserSelection] Invalid option format at index",
        index,
        opt,
      );
      return {
        id: `option-${index}`,
        label: String(opt),
      };
    },
  );

  // Create normalized params object
  const normalizedParams: UserSelectionParams = {
    question: String(paramsObj.question),
    options: normalizedOptions,
    mode: paramsObj.mode as "single" | "multiple",
    allowOther: Boolean(paramsObj.allowOther),
    reason:
      "reason" in paramsObj && typeof paramsObj.reason === "string"
        ? paramsObj.reason
        : undefined,
  };

  console.log("[UserSelection] Normalized params:", normalizedParams);

  return new Promise((resolve, reject) => {
    let resolved = false;

    // Set up cancel listener
    signal.addEventListener("abort", () => {
      if (!resolved) {
        console.log("[UserSelection] Aborted");
        selectionManager.cleanup();
        resolved = true;
        reject(new Error("Selection cancelled"));
      }
    });

    // Create selection request
    selectionManager
      .createRequest()
      .then((result) => {
        if (!resolved) {
          resolved = true;
          console.log("[UserSelection] Selection completed:", result);
          resolve(result);
        }
      })
      .catch((error) => {
        if (!resolved) {
          resolved = true;
          console.error("[UserSelection] Selection error:", error);
          reject(error);
        }
      });
  });
}

export const userSelectionIntervention: InterventionImplementation = {
  metadata,
  execute,
};
