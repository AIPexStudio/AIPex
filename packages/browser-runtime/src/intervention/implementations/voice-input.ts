/**
 * Voice Input Intervention
 *
 * Get user voice input and convert to text
 * Three-tier service selection:
 * 1. Non-BYOK users: Use server interface
 * 2. BYOK users with ElevenLabs API: Use ElevenLabs
 * 3. BYOK users without ElevenLabs API: Use browser Web Speech API
 *
 * NOTE: This implementation requires VoiceInputManager, Storage, and isByokUserSimple
 * which need to be provided by the runtime environment or injected as dependencies.
 * For now, this is a simplified implementation using browser Web Speech API.
 */

import type {
  InterventionImplementation,
  InterventionMetadata,
  VoiceInputResult,
} from "../types.js";

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

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
    "Get user voice input, supports browser speech recognition or ElevenLabs API",
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
 * Execute voice input
 * Simplified implementation using browser Web Speech API
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

  // Check microphone permission
  await checkMicrophonePermission();

  const startTime = Date.now();

  // Use browser Web Speech API
  return new Promise((resolve, reject) => {
    let resolved = false;

    // Check if Web Speech API is available
    const SpeechRecognitionConstructor =
      window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      reject(
        new Error(
          "Web Speech API is not supported in this browser. Please use Chrome or Edge.",
        ),
      );
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";
    let lastSpeechTime = Date.now();
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;

    // Set up cancel listener
    signal.addEventListener("abort", () => {
      if (!resolved) {
        console.log("[VoiceInput] Aborted");
        recognition.stop();
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }
        resolved = true;
        reject(new Error("Voice input cancelled"));
      }
    });

    recognition.onresult = (event) => {
      if (resolved) return;

      let _interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result || !result[0]) continue;
        const transcript = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += `${transcript} `;
        } else {
          _interimTranscript += transcript;
        }
      }

      // Reset silence timer
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
          recognition.stop();
        }
      }, autoStopSilence * 1000);
    };

    recognition.onend = () => {
      if (!resolved && finalTranscript.trim()) {
        resolved = true;
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }

        const result: VoiceInputResult = {
          text: finalTranscript.trim(),
          confidence: 1.0,
          language,
          source: "browser",
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        };

        resolve(result);
      } else if (!resolved) {
        resolved = true;
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }
        reject(new Error("No speech detected"));
      }
    };

    recognition.onerror = (event) => {
      if (!resolved) {
        resolved = true;
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }
        reject(new Error(`Speech recognition error: ${event.error}`));
      }
    };

    try {
      recognition.start();
      console.log("[VoiceInput] Started browser speech recognition");
    } catch (error) {
      if (!resolved) {
        resolved = true;
        reject(error);
      }
    }
  });
}

export const voiceInputIntervention: InterventionImplementation = {
  metadata,
  execute,
};
