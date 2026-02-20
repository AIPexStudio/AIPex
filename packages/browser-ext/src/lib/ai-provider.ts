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
 * Validate that a user-provided host URL is safe to use.
 * Rejects private/internal addresses to mitigate SSRF risks.
 */
function validateHostUrl(url: string | undefined): string | undefined {
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

  // Block common internal/private hostnames
  const hostname = parsed.hostname.toLowerCase();
  const blocked = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "[::1]",
    "metadata.google.internal",
    "169.254.169.254",
  ];

  // In production, block private addresses
  if (import.meta.env.PROD && blocked.includes(hostname)) {
    throw new Error(`aiHost points to a restricted address: ${hostname}`);
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
 * Create an AI SDK provider for proxy mode (non-BYOK).
 *
 * Uses the claudechrome.com proxy endpoint which accepts OpenAI-compatible
 * requests and authenticates via session cookies.
 */
export function createProxyProvider(): OpenAIProvider["chat"] {
  // The proxy endpoint is OpenAI-compatible.
  // We pass an empty API key because auth is handled by cookies injected in
  // a custom fetch wrapper.
  const openai = createOpenAI({
    apiKey: "proxy-no-key",
    baseURL: PROXY_API_URL,
    // Custom fetch that injects cookie headers for authentication
    fetch: async (input, init) => {
      const cookieHeader = await getProxyCookieHeader();
      const headers = new Headers(init?.headers);
      if (cookieHeader) {
        headers.set("Cookie", cookieHeader);
      }
      // Remove the Authorization header – proxy uses cookies, not API keys
      headers.delete("Authorization");
      return globalThis.fetch(input, { ...init, headers });
    },
  });

  // Return the chat sub-provider to force Chat Completions API (/completions)
  // instead of the default Responses API (/responses) used by AI SDK v5+
  return openai.chat;
}
