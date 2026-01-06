/**
 * Voice Input Intervention
 *
 * Get user voice input and convert to text
 * Multi-source implementation supporting:
 * 1. Browser Web Speech API (real-time)
 * 2. VAD + Server/ElevenLabs STT (record & transcribe)
 */

import { STORAGE_KEYS } from "@aipexstudio/aipex-core";
import { isByokUserSimple } from "../../config/byok-detection.js";
import { chromeStorageAdapter } from "../../storage/storage-adapter.js";
import type { VoiceInputMetadata } from "../../voice/voice-input-manager.js";
import { VoiceInputManager } from "../../voice/voice-input-manager.js";
import type {
  InterventionImplementation,
  InterventionMetadata,
  VoiceInputResult,
} from "../types.js";

/**
 * Check and request microphone permission
 */
async function checkMicrophonePermission(): Promise<void> {
  try {
    // 1. Query permission status first
    const permissionStatus = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    console.log(
      "[VoiceInput] Microphone permission status:",
      permissionStatus.state,
    );

    // 2. If permission is denied, provide friendly hint
    if (permissionStatus.state === "denied") {
      throw new Error(
        "🎤 Microphone permission denied.\n\n" +
          "To enable microphone access:\n" +
          "1. Open Chrome settings: chrome://settings/content/microphone\n" +
          "2. Find this extension in the 'Block' list\n" +
          "3. Move it to the 'Allow' list\n" +
          "4. Refresh and try again",
      );
    }

    // 3. Test actual access (this will trigger permission prompt if needed)
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) {
      track.stop();
    }
    console.log("[VoiceInput] Microphone access granted");
  } catch (error) {
    const errorName = error instanceof DOMException ? error.name : "";
    const errorMsg = error instanceof Error ? error.message : String(error);

    console.error(
      "[VoiceInput] Microphone permission error:",
      errorName,
      errorMsg,
    );

    // If it's already our custom error, rethrow it
    if (errorMsg.includes("🎤")) {
      throw error;
    }

    // Provide detailed error messages based on error type
    if (
      errorName === "NotAllowedError" ||
      errorMsg.toLowerCase().includes("permission") ||
      errorMsg.toLowerCase().includes("denied")
    ) {
      throw new Error(
        "🎤 Microphone access denied.\n\n" +
          "Please allow microphone access:\n" +
          "1. Look for the camera/microphone icon in the address bar\n" +
          "2. Click it and select 'Always allow'\n" +
          "3. Or go to chrome://settings/content/microphone\n" +
          "4. Add this extension to the 'Allow' list",
      );
    }
    if (errorName === "NotFoundError") {
      throw new Error(
        "🎤 No microphone found.\n\n" +
          "Please check:\n" +
          "1. Your microphone is connected\n" +
          "2. Your system recognizes the microphone\n" +
          "3. Other apps can use the microphone\n" +
          "4. System permissions allow Chrome to access the microphone",
      );
    }
    throw new Error(`🎤 Microphone error: ${errorMsg}`);
  }
}

const metadata: InterventionMetadata = {
  name: "Voice Input",
  type: "voice-input",
  description:
    "Get user voice input, supports browser speech recognition, VAD, and external STT services",
  enabled: true,
  inputSchema: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description: "Explain why user voice input is needed",
      },
      language: {
        type: "string",
        description: "Language code (e.g. zh-CN, en-US)",
        default: "zh-CN",
      },
      autoStopSilence: {
        type: "number",
        description: "Auto-stop after seconds of silence (default 5 seconds)",
        default: 5,
      },
      useVAD: {
        type: "boolean",
        description: "Use VAD for voice activity detection",
        default: false,
      },
      useServer: {
        type: "boolean",
        description: "Use server STT (for VAD mode)",
        default: false,
      },
      useElevenLabs: {
        type: "boolean",
        description: "Use ElevenLabs STT (for VAD mode)",
        default: false,
      },
    },
    required: [],
  },
  outputSchema: {
    type: "object",
    properties: {
      text: { type: "string", description: "Recognized text" },
      confidence: { type: "number", description: "Confidence level" },
      language: { type: "string", description: "Language" },
      source: {
        type: "string",
        enum: ["server", "elevenlabs", "browser"],
        description: "Recognition source",
      },
      timestamp: { type: "number", description: "Timestamp" },
      duration: {
        type: "number",
        description: "Recording duration (milliseconds)",
      },
    },
  },
  examples: [
    {
      description: "AI needs user to dictate additional information",
      input: {
        reason: "Please tell me what you want to search for",
        language: "zh-CN",
      },
      output: {
        text: "Help me search for nearby coffee shops",
        confidence: 0.95,
        language: "zh-CN",
        source: "browser",
        timestamp: 1234567890,
        duration: 3000,
      },
    },
  ],
};

/**
 * Execute voice input using VoiceInputManager
 */
async function execute(
  params: unknown,
  signal: AbortSignal,
): Promise<VoiceInputResult> {
  console.log("[VoiceInput] Starting execution with params:", params);

  const paramsObj =
    typeof params === "object" && params !== null
      ? params
      : ({} as Record<string, unknown>);
  const language =
    "language" in paramsObj && typeof paramsObj.language === "string"
      ? paramsObj.language
      : "zh-CN";
  const autoStopSilence =
    "autoStopSilence" in paramsObj &&
    typeof paramsObj.autoStopSilence === "number"
      ? paramsObj.autoStopSilence
      : 5;
  // Get BYOK status and settings
  const isByokUser = await isByokUserSimple();
  const settings = (await chromeStorageAdapter.load(STORAGE_KEYS.SETTINGS)) as
    | Record<string, unknown>
    | undefined;
  const elevenLabsApiKey = settings?.elevenLabsApiKey as string | undefined;
  const elevenLabsModelId = settings?.elevenLabsModelId as string | undefined;

  // Determine which STT service to use based on BYOK status and available keys
  let useVAD = false;
  let useServer = false;
  let useElevenLabs = false;

  // Allow params to override if explicitly set
  if ("useVAD" in paramsObj && typeof paramsObj.useVAD === "boolean") {
    useVAD = paramsObj.useVAD;
  }
  if ("useServer" in paramsObj && typeof paramsObj.useServer === "boolean") {
    useServer = paramsObj.useServer;
  }
  if (
    "useElevenLabs" in paramsObj &&
    typeof paramsObj.useElevenLabs === "boolean"
  ) {
    useElevenLabs = paramsObj.useElevenLabs;
  }

  // If not explicitly set in params, determine based on BYOK status
  if (
    !("useServer" in paramsObj) &&
    !("useElevenLabs" in paramsObj) &&
    !("useVAD" in paramsObj)
  ) {
    if (!isByokUser) {
      // Non-BYOK: use server STT with VAD
      useVAD = true;
      useServer = true;
      console.log("[VoiceInput] Using server STT (non-BYOK user)");
    } else if (elevenLabsApiKey) {
      // BYOK with ElevenLabs: use ElevenLabs STT with VAD
      useVAD = true;
      useElevenLabs = true;
      console.log("[VoiceInput] Using ElevenLabs STT (BYOK user with API key)");
    } else {
      // BYOK without ElevenLabs: use browser Web Speech API
      useVAD = false;
      useServer = false;
      useElevenLabs = false;
      console.log(
        "[VoiceInput] Using Web Speech API (BYOK user without API key)",
      );
    }
  }

  // Check microphone permission
  await checkMicrophonePermission();

  // Create VoiceInputManager with ElevenLabs config if applicable
  const voiceManager = new VoiceInputManager(
    useElevenLabs && elevenLabsApiKey
      ? { apiKey: elevenLabsApiKey, modelId: elevenLabsModelId }
      : undefined,
  );

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    let resolved = false;
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastSpeechTime = Date.now();

    // Set up cancel listener
    signal.addEventListener("abort", () => {
      if (!resolved) {
        console.log("[VoiceInput] Aborted");
        voiceManager.stopListening();
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }
        resolved = true;
        reject(new Error("Voice input cancelled"));
      }
    });

    // Set up result callback
    voiceManager.onResult((voiceMetadata: VoiceInputMetadata) => {
      if (resolved) return;

      console.log("[VoiceInput] Voice result:", voiceMetadata);

      // If it's an interim result from browser API, reset silence timer
      if (!voiceMetadata.isFinal && voiceMetadata.source === "browser") {
        lastSpeechTime = Date.now();
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }
        silenceTimer = setTimeout(() => {
          if (
            !resolved &&
            Date.now() - lastSpeechTime >= autoStopSilence * 1000
          ) {
            console.log("[VoiceInput] Auto-stopping due to silence");
            voiceManager.stopListening();
          }
        }, autoStopSilence * 1000);
        return;
      }

      // Final result
      if (voiceMetadata.isFinal) {
        resolved = true;

        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }

        const duration = Date.now() - startTime;

        const result: VoiceInputResult = {
          text: voiceMetadata.text,
          confidence: voiceMetadata.confidence,
          language: voiceMetadata.language,
          source: voiceMetadata.source || "browser",
          timestamp: voiceMetadata.timestamp,
          duration,
        };

        resolve(result);
      }
    });

    // Set up error callback
    voiceManager.onError((error: Error) => {
      if (!resolved) {
        resolved = true;
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }
        console.error("[VoiceInput] Error:", error);
        reject(error);
      }
    });

    // Start listening
    try {
      voiceManager.startListening({
        language,
        continuous: true,
        interimResults: true,
        useVAD,
        useServer,
        useElevenLabs,
      });

      // Set up initial silence timer for browser API
      if (!useVAD) {
        silenceTimer = setTimeout(() => {
          if (
            !resolved &&
            Date.now() - lastSpeechTime >= autoStopSilence * 1000
          ) {
            console.log("[VoiceInput] Auto-stopping due to silence");
            voiceManager.stopListening();
          }
        }, autoStopSilence * 1000);
      }

      console.log("[VoiceInput] Started voice input");
    } catch (error) {
      if (!resolved) {
        resolved = true;
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }
        reject(error);
      }
    }
  });
}

export const voiceInputIntervention: InterventionImplementation = {
  metadata,
  execute,
};
