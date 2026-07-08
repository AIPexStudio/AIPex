import { defineGroup, addCommand } from "../lib/command-registry.js";

defineGroup("intervention", "Request human input during automation");

addCommand("intervention", {
  name: "list",
  description: "List all available human intervention types",
  toolName: "list_interventions",
  options: [
    {
      flag: "enabled-only",
      type: "boolean",
      description: "Only show enabled interventions",
    },
  ],
  examples: ["browser-cli intervention list"],
  mapArgs: (_positional, options) => ({
    ...(options["enabled-only"] != null
      ? { enabledOnly: options["enabled-only"] }
      : {}),
  }),
});

addCommand("intervention", {
  name: "info",
  description: "Get detailed info about a specific intervention type",
  toolName: "get_intervention_info",
  args: [
    {
      name: "type",
      required: true,
      description: "Intervention type (e.g. monitor-operation, voice-input)",
    },
  ],
  examples: ["browser-cli intervention info monitor-operation"],
  mapArgs: (positional) => ({ type: positional[0] }),
});

addCommand("intervention", {
  name: "request",
  description: "Request human intervention during task execution",
  toolName: "request_intervention",
  args: [
    {
      name: "type",
      required: true,
      description: "Intervention type to request",
    },
  ],
  options: [
    {
      flag: "params",
      type: "json",
      description: "Type-specific parameters (JSON)",
    },
    {
      flag: "timeout",
      type: "number",
      description: "Timeout in seconds (default: 300)",
    },
    {
      flag: "reason",
      type: "string",
      description: "Explanation for why input is needed",
    },
  ],
  examples: [
    'browser-cli intervention request voice-input --reason "Need confirmation"',
  ],
  mapArgs: (positional, options) => ({
    type: positional[0],
    ...(options.params != null ? { params: options.params } : {}),
    ...(options.timeout != null ? { timeout: options.timeout } : {}),
    ...(options.reason != null ? { reason: options.reason } : {}),
  }),
});

addCommand("intervention", {
  name: "cancel",
  description: "Cancel the currently active intervention",
  toolName: "cancel_intervention",
  options: [
    { flag: "id", type: "string", description: "Intervention ID to cancel" },
  ],
  examples: ["browser-cli intervention cancel"],
  mapArgs: (_positional, options) => ({
    ...(options.id != null ? { id: options.id } : {}),
  }),
});
