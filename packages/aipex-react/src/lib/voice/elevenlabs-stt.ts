/**
 * ElevenLabs Speech-to-Text Integration
 * Uses ElevenLabs API for speech-to-text transcription
 */

export interface ElevenLabsSTTConfig {
  apiKey: string;
  modelId?: string;
  language?: string;
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  error?: string;
}

/**
 * Transcribe audio using ElevenLabs API
 */
export async function transcribeAudio(
  audioBlob: Blob,
  config: ElevenLabsSTTConfig,
): Promise<TranscriptionResult> {
  const { apiKey, modelId } = config;

  if (!apiKey) {
    throw new Error("ElevenLabs API key is required");
  }

  try {
    console.log(
      "[ElevenLabs STT] Starting transcription, audio size:",
      audioBlob.size,
    );

    // Prepare FormData
    const formData = new FormData();
    // Use 'file' field name, filename based on actual format
    formData.append("file", audioBlob, "audio.wav");

    // Only add modelId if provided
    if (modelId) {
      formData.append("model_id", modelId);
    }

    // Call ElevenLabs API
    const response = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      // Do not log full error response for security
      console.error("[ElevenLabs STT] API error:", response.status);

      let errorMessage = `ElevenLabs API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.message || errorMessage;
      } catch {
        // Use generic error message
      }

      return {
        text: "",
        error: errorMessage,
      };
    }

    const result = await response.json();
    // Log only success status, not the actual transcript (PII)
    console.log("[ElevenLabs STT] Transcription completed successfully");

    // ElevenLabs STT API response format:
    // { text: string, language: string, confidence: number, ... }
    const text = result.text || "";
    const confidence = result.confidence || result.language_probability || 1.0;

    return {
      text: text.trim(),
      confidence,
    };
  } catch (error) {
    console.error("[ElevenLabs STT] Transcription failed");
    return {
      text: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Transcribe with retry mechanism
 */
export async function transcribeAudioWithRetry(
  audioBlob: Blob,
  config: ElevenLabsSTTConfig,
  maxRetries: number = 2,
): Promise<TranscriptionResult> {
  let lastError: string | undefined;

  for (let i = 0; i <= maxRetries; i++) {
    if (i > 0) {
      console.log(`[ElevenLabs STT] Retry attempt ${i}/${maxRetries}`);
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * i));
    }

    const result = await transcribeAudio(audioBlob, config);

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

/**
 * Validate API key
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) {
    return false;
  }

  try {
    // Try to call API to get model list or user info
    const response = await fetch("https://api.elevenlabs.io/v1/models", {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("[ElevenLabs STT] API key validation failed");
    return false;
  }
}

/**
 * Supported languages list
 * ElevenLabs STT supports multiple languages using standard ISO 639-1 language codes
 */
export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "zh", name: "Chinese (中文)" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "pl", name: "Polish" },
  { code: "tr", name: "Turkish" },
  { code: "ru", name: "Russian" },
  { code: "nl", name: "Dutch" },
  { code: "cs", name: "Czech" },
  { code: "ar", name: "Arabic" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "hi", name: "Hindi" },
] as const;

/**
 * Available ElevenLabs STT models
 */
export const AVAILABLE_MODELS = [
  {
    id: "scribe_v1",
    name: "Scribe v1 (Default)",
    description: "High quality general transcription model",
  },
] as const;
