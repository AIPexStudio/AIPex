/**
 * AI Provider Factory
 * Creates AI SDK provider instances based on configuration.
 *
 * Supports two modes:
 * 1. BYOK (Bring Your Own Key) – user provides their own API key and model.
 * 2. Proxy mode – uses https://www.claudechrome.com/api/ai/chat with
 *    cookie-based auth (better-auth / session cookies).
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AIProviderKey, AppSettings } from "@aipexstudio/aipex-core";
import { WEBSITE_URL } from "../config/website";

export interface ProviderConfig {
  provider: AIProviderKey;
  apiKey: string;
  baseURL?: string;
}

/** Default model used when the user has not configured BYOK. */
export const PROXY_DEFAULT_MODEL = "deepseek/deepseek-chat-v3.1";

/** Proxy API endpoint for non-BYOK users. */
export const PROXY_API_URL = `${WEBSITE_URL}/api/ai`;

/**
 * Check whether an IPv4 address string falls within a private/reserved range.
 * Returns true if the address is private, loopback, or link-local.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;

  const octets = parts.map(Number);
  if (octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) return false;

  const [a, b] = octets;

  // 127.0.0.0/8 — loopback
  if (a === 127) return true;
  // 10.0.0.0/8 — private
  if (a === 10) return true;
  // 172.16.0.0/12 — private
  if (a === 172 && b! >= 16 && b! <= 31) return true;
  // 192.168.0.0/16 — private
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 — link-local (includes cloud metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8 — "this" network
  if (a === 0) return true;

  return false;
}

/**
 * Extract an IPv4 address from an IPv4-mapped IPv6 address.
 * Handles both dotted-decimal (::ffff:1.2.3.4) and hex (::ffff:0102:0304)
 * forms, since URL parsers normalise to the hex representation.
 * Returns the IPv4 string or null if not an IPv4-mapped address.
 */
function extractIPv4FromMappedIPv6(raw: string): string | null {
  // Dotted-decimal form: ::ffff:1.2.3.4
  const dotMatch = raw.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (dotMatch) return dotMatch[1]!;

  // Hex form: ::ffff:XXXX:XXXX (URL parser normalised)
  const hexMatch = raw.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hexMatch) {
    const hi = Number.parseInt(hexMatch[1]!, 16);
    const lo = Number.parseInt(hexMatch[2]!, 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }

  return null;
}

/**
 * Check whether a bracketed IPv6 hostname represents a private/reserved address.
 * Handles ::1 (loopback), ::ffff:x.x.x.x (IPv4-mapped), fe80::/10, fc00::/7.
 */
function isPrivateIPv6(hostname: string): boolean {
  const raw = hostname.replace(/^\[|\]$/g, "").toLowerCase();

  // ::1 — loopback
  if (raw === "::1") return true;
  // :: — unspecified
  if (raw === "::") return true;

  // IPv4-mapped IPv6 addresses
  const v4 = extractIPv4FromMappedIPv6(raw);
  if (v4) return isPrivateIPv4(v4);

  // fe80::/10 — link-local
  if (raw.startsWith("fe80:") || raw === "fe80") return true;
  // fc00::/7 — unique local (ULA)
  if (raw.startsWith("fc") || raw.startsWith("fd")) return true;

  return false;
}

/**
 * Validate that a user-provided host URL is safe to use.
 * Rejects private/internal addresses to mitigate SSRF risks.
 */
export function validateHostUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid aiHost URL: ${url}`);
  }

  // Only allow http/https schemes
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(
      `Unsupported protocol in aiHost: ${parsed.protocol} (only http/https allowed)`,
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block well-known private/internal hostnames
  const blockedHostnames = ["localhost", "metadata.google.internal"];
  if (blockedHostnames.includes(hostname)) {
    throw new Error(`aiHost points to a restricted address: ${hostname}`);
  }

  // Block private/reserved IPv4 addresses
  if (isPrivateIPv4(hostname)) {
    throw new Error(`aiHost points to a restricted address: ${hostname}`);
  }

  // Block private/reserved IPv6 addresses (brackets from URL parser)
  if (hostname.startsWith("[") || hostname === "::1") {
    if (isPrivateIPv6(hostname)) {
      throw new Error(`aiHost points to a restricted address: ${hostname}`);
    }
  }

  return parsed.origin + parsed.pathname.replace(/\/+$/, "");
}

/**
 * Check whether the current settings represent a BYOK configuration.
 */
export function isByokConfigured(settings: AppSettings): boolean {
  const byokEnabled = Boolean(settings.byokEnabled);
  if (!byokEnabled) return false;

  const hasToken = Boolean(settings.aiToken?.trim());
  const hasModel = Boolean(settings.aiModel?.trim());
  return hasToken && hasModel;
}

/**
 * Retrieve authentication cookies from claudechrome.com for the proxy API.
 * Returns a Cookie header string, or empty string if unavailable.
 */
export async function getProxyCookieHeader(): Promise<string> {
  try {
    const cookies = await chrome.cookies.getAll({ url: WEBSITE_URL });
    const relevant = cookies.filter(
      (c) => c.name.includes("better-auth") || c.name.includes("session"),
    );
    return relevant.map((c) => `${c.name}=${c.value}`).join("; ");
  } catch {
    return "";
  }
}

/**
 * Create an AI SDK provider for BYOK mode.
 */
export function createAIProvider(settings: AppSettings) {
  const provider = settings.aiProvider ?? "openai";
  const apiKey = settings.aiToken ?? "";
  const baseURL = validateHostUrl(settings.aiHost || undefined);

  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey, baseURL });
    case "google":
      return createGoogleGenerativeAI({ apiKey, baseURL });
    case "openai":
      return createOpenAI({ apiKey, baseURL });
    default:
      // For custom providers, baseURL is required
      if (!baseURL) {
        throw new Error(
          `Custom provider "${provider}" requires aiHost to be specified`,
        );
      }
      return createOpenAICompatible({ apiKey, baseURL, name: provider });
  }
}

/**
 * Stateful SSE stream transform that fixes parameterless tool calls from
 * providers like Anthropic via OpenRouter/proxy.
 *
 * Some providers stream tool_calls with `"arguments":""` for every chunk when
 * the tool has no parameters. The AI SDK uses `isParsableJson` to decide when
 * a tool call is complete, and `""` never passes that check, so the tool call
 * is silently dropped.
 *
 * A naive text-replacement of `""` → `"{}"` on every chunk would break tools
 * that DO have arguments (the first empty chunk would be treated as complete
 * `{}`, and all subsequent real-argument chunks would be discarded).
 *
 * This transform tracks tool call state across the stream:
 * - Passes all SSE lines through **unchanged** during streaming
 * - When `finish_reason: "tool_calls"` arrives, injects a synthetic SSE chunk
 *   with `"arguments":"{}"` for every tool call whose accumulated arguments
 *   are still empty — right before the finish chunk
 */
export function createEmptyToolArgsFinalizer(
  original: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  // Track accumulated arguments per tool call index
  const toolCallArgs = new Map<
    number,
    { id: string; name: string; args: string }
  >();
  // Capture the chunk id so synthetic events look like they belong to the same response
  let streamId: string | undefined;

  function processLine(
    line: string,
    controller: ReadableStreamDefaultController<Uint8Array>,
  ) {
    if (!line.startsWith("data: ") || line === "data: [DONE]") {
      controller.enqueue(encoder.encode(`${line}\n`));
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(line.slice(6));
    } catch {
      controller.enqueue(encoder.encode(`${line}\n`));
      return;
    }

    if (!streamId && parsed.id) {
      streamId = parsed.id;
    }

    const choice = parsed.choices?.[0];

    // Track tool call arguments
    const toolCalls = choice?.delta?.tool_calls;
    if (Array.isArray(toolCalls)) {
      for (const tc of toolCalls) {
        const idx = tc.index;
        if (typeof idx !== "number") continue;

        const existing = toolCallArgs.get(idx);
        if (!existing) {
          toolCallArgs.set(idx, {
            id: tc.id ?? "",
            name: tc.function?.name ?? "",
            args: tc.function?.arguments ?? "",
          });
        } else {
          if (tc.function?.arguments != null) {
            existing.args += tc.function.arguments;
          }
        }
      }
    }

    // When finish_reason is tool_calls, inject synthetic chunks for empty args
    if (choice?.finish_reason === "tool_calls") {
      for (const [idx, tc] of toolCallArgs) {
        if (tc.args === "") {
          const synthetic = {
            id: streamId ?? parsed.id ?? "",
            object: "chat.completion.chunk",
            created: parsed.created ?? 0,
            model: parsed.model ?? "",
            choices: [
              {
                index: 0,
                delta: {
                  tool_calls: [
                    {
                      index: idx,
                      function: { arguments: "{}" },
                    },
                  ],
                },
                finish_reason: null,
              },
            ],
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(synthetic)}\n\n`),
          );
        }
      }
    }

    controller.enqueue(encoder.encode(`${line}\n`));
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = original.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (buffer.length > 0) {
              processLine(buffer, controller);
            }
            controller.close();
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop()!;
          for (const line of lines) {
            processLine(line, controller);
          }
        }
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

/**
 * Create an AI SDK provider for proxy mode (non-BYOK).
 *
 * Uses the claudechrome.com proxy endpoint which accepts OpenAI-compatible
 * requests and authenticates via session cookies.
 */
export function createProxyProvider(): OpenAIProvider["chat"] {
  const openai = createOpenAI({
    apiKey: "proxy-no-key",
    baseURL: PROXY_API_URL,
    fetch: async (input, init) => {
      const cookieHeader = await getProxyCookieHeader();
      const headers = new Headers(init?.headers);
      if (cookieHeader) {
        headers.set("Cookie", cookieHeader);
      }
      headers.delete("Authorization");
      const response = await globalThis.fetch(input, { ...init, headers });

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream") && response.body) {
        const patched = createEmptyToolArgsFinalizer(response.body);
        return new Response(patched, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }

      return response;
    },
  });

  return openai.chat;
}
