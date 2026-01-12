# @aipexstudio/aipex-core

Platform-agnostic TypeScript building blocks for creating **streaming, tool-using AI agents**.

`@aipexstudio/aipex-core` wraps `@openai/agents` and adds a few opinionated layers that are
useful for productizing agents:

- A stable **event stream** (`AgentEvent`) that UIs can consume
- Optional **conversation/session management** (persistence, listing, forking)
- Optional **conversation compression** for long-running sessions
- A **context system** for attaching external data to a turn (`ContextManager` + `ContextProvider`)
- Tool utilities, including a schema-first `ToolRegistry`

## Why a separate "core" package?

- **Platform boundary**: no Chrome APIs, no Node-only assumptions. This keeps core usable in
  browsers, servers, and extensions.
- **Streaming-first**: instead of returning a single string, the agent emits structured events
  (text deltas, tool lifecycle, metrics, errors).
- **Composable integrations**: persistence, context providers, and UI are all optional and pluggable.

## Core concepts

### Agent + event stream

`AIPex.chat()` returns an `AsyncGenerator<AgentEvent>`. Typical consumers:

- **CLI**: print `content_delta` as it streams
- **UI**: render streaming text, show tool calls, attach contexts, show metrics

Key event types include:

- `content_delta`: incremental text tokens
- `tool_call_start` / `tool_call_complete` / `tool_call_error`
- `tool_call_args_streaming_start` / `tool_call_args_streaming_complete` (best-effort, provider-dependent)
- `session_created` / `session_resumed` (when conversation management is enabled)
- `metrics_update` / `execution_complete`
- `contexts_attached` / `context_error`

### Tools

There are two complementary ways to work with tools:

1) **Direct function tools** via `tool()` (re-exported from `@openai/agents`)

- Define name/description + a Zod schema
- Provide an `execute()` implementation

2) **Registry-managed tools** via `ToolRegistry`

- Register a `UnifiedToolDefinition` (`schema` + `handler(input, ctx)`)
- Execute locally (`registry.execute(...)`)
- Convert to OpenAI-compatible function tools (`registry.toOpenAIFunctions()`)

Built-in tools shipped by core:

- `calculatorTool`: basic arithmetic
- `httpFetchTool`: simple HTTP GET fetch (returns JSON when content-type is JSON)

### Conversations, sessions, and compression

When conversation management is enabled (default), the agent creates a **session** and persists
turn items via a `SessionStorageAdapter`.

- **Disable sessions** by setting `conversation: false`
- **Persist sessions** by providing your own storage adapter
- **Fork sessions** (branch conversation history) with `ConversationManager.forkSession(...)`
- **Compress sessions** using `ConversationCompressor` to summarize older turns

### Contexts

A **context** is an additional piece of information you attach to a single turn (e.g. current page text,
a selected tab, a file, a screenshot, etc.).

- Implement a `ContextProvider` for your environment
- Register providers with a `ContextManager`
- Attach contexts to a message via `ChatOptions.contexts` (either full `Context` objects or context IDs)

### Plugins

Plugins are a lightweight way to observe and customize runtime behavior without forking the agent.
They can:

- mutate input before a turn (`beforeChat`)
- observe tool lifecycle events (`onToolEvent`)
- observe per-turn usage metrics (`onMetrics`)
- observe the final response (`afterResponse`)

## Installation

```bash
npm install @aipexstudio/aipex-core
# or
pnpm add @aipexstudio/aipex-core
```

### Optional peer dependencies (model providers)

`@aipexstudio/aipex-core` integrates well with the AI SDK ecosystem. Install the provider(s) you plan to use:

- `@ai-sdk/openai`
- `@ai-sdk/google`
- `@ai-sdk/anthropic`
- `@openrouter/ai-sdk-provider`

## Usage

### 1) Basic streaming chat

```ts
import { google } from "@ai-sdk/google";
import { AIPex, aisdk } from "@aipexstudio/aipex-core";

const agent = AIPex.create({
  instructions: "You are a helpful assistant.",
  model: aisdk(google("gemini-2.5-flash")),
});

for await (const event of agent.chat("Say hello in one sentence.")) {
  if (event.type === "content_delta") process.stdout.write(event.delta);
}
```

### 2) Using built-in tools (`calculatorTool`, `httpFetchTool`)

```ts
import { google } from "@ai-sdk/google";
import { AIPex, aisdk, calculatorTool, httpFetchTool } from "@aipexstudio/aipex-core";

const agent = AIPex.create({
  instructions: "Use tools when appropriate.",
  model: aisdk(google("gemini-2.5-flash")),
  tools: [calculatorTool, httpFetchTool],
});

for await (const event of agent.chat("What is 15 * 234?")) {
  if (event.type === "content_delta") process.stdout.write(event.delta);
  if (event.type === "tool_call_start") {
    console.log("\n[tool_call_start]", event.toolName, event.params);
  }
  if (event.type === "tool_call_complete") {
    console.log("\n[tool_call_complete]", event.toolName, event.result);
  }
}
```

### 3) Define a custom tool (schema-first with Zod)

```ts
import { z } from "zod/v3";
import { tool } from "@aipexstudio/aipex-core";

export const weatherTool = tool({
  name: "get_weather",
  description: "Get the weather for a city (demo tool).",
  parameters: z.object({
    city: z.string().describe("The city name"),
  }),
  execute: async ({ city }) => {
    return `The weather in ${city} is sunny and 72°F`;
  },
});
```

### 4) Sessions: continue a conversation with `sessionId`

By default, each `chat()` call starts a new session. To continue a conversation, pass the `sessionId`
returned in the `session_created` event:

```ts
import { google } from "@ai-sdk/google";
import { AIPex, aisdk } from "@aipexstudio/aipex-core";

const agent = AIPex.create({
  instructions: "You remember things within a session.",
  model: aisdk(google("gemini-2.5-flash")),
});

let sessionId: string | undefined;

for await (const event of agent.chat("My name is Alice.")) {
  if (event.type === "session_created") sessionId = event.sessionId;
}

if (sessionId) {
  for await (const event of agent.chat("What is my name?", { sessionId })) {
    if (event.type === "content_delta") process.stdout.write(event.delta);
  }
}
```

### 5) Conversation compression (summarize older turns)

```ts
import { google } from "@ai-sdk/google";
import { AIPex, aisdk } from "@aipexstudio/aipex-core";

const model = aisdk(google("gemini-2.5-flash"));

const agent = AIPex.create({
  instructions: "You are a helpful assistant.",
  model,
  compression: {
    model,
    summarizeAfterItems: 20,
    keepRecentItems: 10,
    maxSummaryLength: 500,
  },
});
```

### 6) Attaching contexts to a turn

```ts
import { google } from "@ai-sdk/google";
import { AIPex, aisdk, ContextManager, type Context } from "@aipexstudio/aipex-core";

const contextManager = new ContextManager();

const agent = AIPex.create({
  instructions: "Use attached contexts when answering.",
  model: aisdk(google("gemini-2.5-flash")),
  contextManager,
});

const pageContext: Context = {
  id: "page:example",
  type: "page",
  providerId: "manual",
  label: "Example page",
  value: "This page describes the AIPex Core API.",
  timestamp: Date.now(),
};

for await (const event of agent.chat("Summarize the page.", { contexts: [pageContext] })) {
  if (event.type === "content_delta") process.stdout.write(event.delta);
}
```

### 7) Plugins

```ts
import { google } from "@ai-sdk/google";
import { AIPex, aisdk, type AgentPlugin } from "@aipexstudio/aipex-core";

const loggerPlugin: AgentPlugin = {
  id: "logger",
  hooks: {
    beforeChat: (payload) => {
      console.log("[beforeChat]", payload.input);
      return payload;
    },
    onToolEvent: ({ event }) => {
      if (event.type === "tool_call_start") {
        console.log("[tool]", event.toolName, event.params);
      }
    },
  },
};

const agent = AIPex.create({
  instructions: "You are a helpful assistant.",
  model: aisdk(google("gemini-2.5-flash")),
  plugins: [loggerPlugin],
});
```

### 8) ToolRegistry (register and execute tools dynamically)

```ts
import { z } from "zod/v3";
import { ToolRegistry } from "@aipexstudio/aipex-core";

const registry = new ToolRegistry();

registry.register({
  name: "echo_tool",
  description: "Echo text back",
  schema: z.object({ text: z.string() }),
  handler: ({ text }) => `echo:${text}`,
});

const result = await registry.execute("echo_tool", { text: "hello" }, { sessionId: "s1" });
console.log(result); // "echo:hello"
```

## API reference

### `AIPex`

- `AIPex.create(options: AIPexOptions): AIPex`
- `agent.chat(input: string, options?: ChatOptions): AsyncGenerator<AgentEvent>`
- `agent.getConversationManager(): ConversationManager | undefined`
- `agent.getContextManager(): ContextManager | undefined`

### `ChatOptions`

- `sessionId?: string` - resume an existing session
- `contexts?: Context[] | string[]` - attach contexts for this turn (IDs require `contextManager`)

### `AgentEvent` (stream contract)

```ts
export type AgentEvent =
  | { type: "session_created"; sessionId: string }
  | { type: "session_resumed"; sessionId: string; itemCount: number }
  | { type: "content_delta"; delta: string }
  | { type: "tool_call_args_streaming_start"; toolName: string }
  | { type: "tool_call_args_streaming_complete"; toolName: string; params: unknown }
  | { type: "tool_call_start"; toolName: string; params: unknown }
  | { type: "tool_call_complete"; toolName: string; result: unknown }
  | { type: "tool_call_error"; toolName: string; error: Error }
  | { type: "contexts_attached"; contexts: Context[] }
  | { type: "contexts_loaded"; providerId: string; count: number }
  | { type: "context_error"; providerId: string; error: Error }
  | { type: "metrics_update"; metrics: AgentMetrics }
  | { type: "error"; error: AgentError }
  | { type: "execution_complete"; finalOutput: string; metrics: AgentMetrics };
```

### `AIPexOptions`

Key fields:

- `instructions: string`
- `model: AiSdkModel`
- `tools?: FunctionTool[]`
- `maxTurns?: number`
- `conversation?: false` (disable session management)
- `storage?: SessionStorageAdapter`
- `compression?: { model: AiSdkModel; summarizeAfterItems?; keepRecentItems?; maxSummaryLength? }`
- `conversationManager?: ConversationManager` (advanced override)
- `contextManager?: ContextManager`
- `plugins?: AgentPlugin[]`

### Conversations

- `ConversationManager`: `createSession`, `getSession`, `saveSession`, `deleteSession`, `listSessions`,
  `forkSession`, `compressSession`, `getSessionTree`
- `Session`: implements the OpenAI Agents `Session` interface and adds helpers like
  `getItemCount`, `getSummary`, `fork`, `addMetrics`, `getSessionMetrics`
- `SessionStorage`: adapts a `KeyValueStorage<SerializedSession>` to a `SessionStorageAdapter`
- `ConversationCompressor`: summarizes older turns and keeps the most recent items

### Contexts

- `ContextManager`: register/unregister providers, list/query contexts, fetch by ID, watch providers
- `ContextProvider`: interface for pluggable context sources
- `Context`: `{ id, type, providerId, label, value, metadata?, timestamp? }`

### Tools

- `tool(...)`: re-export from `@openai/agents` to define `FunctionTool`s with a Zod `parameters` schema
- `ToolRegistry`: registry for schema-first tools + execution + conversion to function tools
- Built-ins: `calculatorTool`, `httpFetchTool`

### Storage

- `KeyValueStorage<T>`: `save`, `load`, `delete`, `listAll`, `query`, `watch`
- `InMemoryStorage<T>`: reference implementation of `KeyValueStorage`

## Development (monorepo)

From the repository root:

```bash
pnpm --filter @aipexstudio/aipex-core build
pnpm --filter @aipexstudio/aipex-core typecheck
pnpm --filter @aipexstudio/aipex-core test
```

Run the included examples:

```bash
pnpm --filter @aipexstudio/aipex-core example:basic
pnpm --filter @aipexstudio/aipex-core example:fork
pnpm --filter @aipexstudio/aipex-core example:metrics
```

## License

MIT


