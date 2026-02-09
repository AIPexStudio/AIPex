/**
 * Server-side Speech-to-Text Integration
 * Uses claudechrome.com server API for speech-to-text transcription
 */

import type { TranscriptionResult } from "./elevenlabs-stt";

export type ServerSTTConfig = {};

interface ServerSTTResponse {
  success: boolean;
  transcript: string;
  duration: number;
  cost: number;
  language: string;
  speakers: unknown[];
  timestamp: string;
}

/**
 * Transcribe audio using server API
 */
export async function transcribeAudioWithServer(
  audioBlob: Blob,
): Promise<TranscriptionResult> {
  try {
    console.log(
      "[Server STT] Starting transcription, audio size:",
      audioBlob.size,
    );

    // Get authentication cookies
    let cookieHeader = "";
    try {
      const cookies = await chrome.cookies.getAll({
        url: "https://www.claudechrome.com",
      });

      const relevantCookies = cookies.filter(
        (cookie) =>
          cookie.name.includes("better-auth") ||
          cookie.name.includes("session"),
      );

      // Only store cookie names for logging, not values (security)
      const cookieNames = relevantCookies.map((c) => c.name);
      console.log(
        "[Server STT] Found cookies:",
        cookieNames.length > 0 ? "yes" : "no",
      );

      cookieHeader = relevantCookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");
    } catch (_error) {
      console.warn("[Server STT] Failed to get cookies");
    }

    // Prepare FormData
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.wav");

    // Call server API
    const headers: Record<string, string> = {};
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }

    const response = await fetch(
      "https://www.claudechrome.com/api/speech-to-text",
      {
        method: "POST",
        headers,
        body: formData,
      },
    );

    if (!response.ok) {
      // Do not log detailed error response for security
      console.error("[Server STT] API error:", response.status);

      let errorMessage = `Server STT error: ${response.status}`;
      try {
        const errorText = await response.text();
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        // Use generic error message
      }

      return {
        text: "",
        error: errorMessage,
      };
    }

    const result: ServerSTTResponse = await response.json();
    // Log only success status, not the actual transcript (PII)
    console.log(
      "[Server STT] Transcription completed, success:",
      result.success,
    );

    if (!result.success) {
      return {
        text: "",
        error: "Server STT failed",
      };
    }

    const text = result.transcript || "";
    // Server may not return confidence, use default
    const confidence = 1.0;

    return {
      text: text.trim(),
      confidence,
    };
  } catch (error) {
    console.error("[Server STT] Transcription failed");
    return {
      text: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Transcribe with retry mechanism
 */
export async function transcribeAudioWithServerRetry(
  audioBlob: Blob,
  maxRetries: number = 2,
): Promise<TranscriptionResult> {
  let lastError: string | undefined;

  for (let i = 0; i <= maxRetries; i++) {
    if (i > 0) {
      console.log(`[Server STT] Retry attempt ${i}/${maxRetries}`);
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * i));
    }

    const result = await transcribeAudioWithServer(audioBlob);

    if (!result.error && result.text) {
      return result;
    }

    lastError = result.error;
  }

  return {
    text: "",
    error: lastError || "Transcription failed after retries",
  };
}
