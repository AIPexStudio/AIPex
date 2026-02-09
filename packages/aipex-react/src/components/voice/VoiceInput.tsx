/**
 * Voice Input Component
 * Integrates VAD, audio recording and STT for voice input
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "../../lib/utils";
import { ParticleSystem } from "./particle-system";
import { VADDetector } from "../../lib/voice/vad-detector";
import { AudioRecorder } from "../../lib/voice/audio-recorder";
import { transcribeAudioWithRetry } from "../../lib/voice/elevenlabs-stt";
import { transcribeAudioWithServerRetry } from "../../lib/voice/server-stt";
import { isByokUserSimple } from "../../lib/voice/ai-config";
import { useChromeStorage } from "../../lib/voice/chrome-storage";
import { Button } from "../ui/button";
import { useTranslation } from "../../i18n/hooks";

export interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  className?: string;
  isPaused?: boolean; // External control for pause
  onSwitchToText: () => void;
}

type VoiceStatus = "idle" | "listening" | "speaking" | "processing" | "error";

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  onError,
  className,
  isPaused = false,
  onSwitchToText,
}) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [statusText, setStatusText] = useState("");
  const [isPermissionError, setIsPermissionError] = useState(false);

  const vadRef = useRef<VADDetector | null>(null);
  const isInitializingRef = useRef(false);
  const prevPausedRef = useRef(isPaused);
  const hasInitializedRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  // Particle system refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);

  // Get ElevenLabs config from storage
  const [elevenlabsApiKey, , isLoadingApiKey] = useChromeStorage<string>(
    "elevenlabsApiKey",
    "",
  );
  const [elevenlabsModelId] = useChromeStorage<string>("elevenlabsModelId", "");

  // BYOK state
  const [isByokUser, setIsByokUser] = useState<boolean | null>(null);

  // Initialize Particle System
  useEffect(() => {
    if (canvasRef.current && !particleSystemRef.current) {
      particleSystemRef.current = new ParticleSystem(canvasRef.current);
    }

    return () => {
      if (particleSystemRef.current) {
        particleSystemRef.current.destroy();
        particleSystemRef.current = null;
      }
    };
  }, []);

  // Update Particle System State
  useEffect(() => {
    if (!particleSystemRef.current) return;

    if (isPaused) {
      particleSystemRef.current.setState("idle");
      return;
    }

    switch (status) {
      case "idle":
      case "error":
        particleSystemRef.current.setState("idle");
        break;
      case "listening":
        particleSystemRef.current.setState("listening");
        break;
      case "speaking":
        particleSystemRef.current.setState("speaking");
        break;
      case "processing":
        particleSystemRef.current.setState("processing");
        break;
    }
  }, [status, isPaused]);

  // Sync refs
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Check BYOK status
  useEffect(() => {
    isByokUserSimple().then(setIsByokUser);
  }, []);

  const isPausedRef = useRef(isPaused);

  // Update isPausedRef whenever isPaused changes
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Initialize VAD
  const initializeVAD = useCallback(async () => {
    if (isInitializingRef.current || vadRef.current?.isActive()) {
      console.log(
        "[VoiceInput] Skipping initialization - already initializing or active",
      );
      return;
    }

    isInitializingRef.current = true;

    try {
      setStatus("idle");
      setStatusText(t("interventions.voice.initializingMic") || "Initializing...");

      const vad = new VADDetector({
        onSpeechStart: () => {
          // Check if paused using ref to get latest value
          if (isPausedRef.current) {
            console.log("[VoiceInput] Speech started but ignored (paused)");
            return;
          }

          console.log("[VoiceInput] Speech started");
          setStatus("speaking");
          setStatusText(t("interventions.voice.recognizing") || "Recognizing...");
        },
        onSpeechEnd: async (audio: Float32Array) => {
          // Check if paused using ref to get latest value
          if (isPausedRef.current) {
            console.log("[VoiceInput] Speech ended but ignored (paused)");
            return;
          }

          console.log("[VoiceInput] Speech ended");
          setStatus("processing");
          setStatusText(t("common.processing") || "Processing...");

          try {
            // Convert audio format
            const audioBlob = AudioRecorder.float32ArrayToWav(audio, 16000);

            let result;

            // Determine which STT service to use
            if (isByokUser === false) {
              // Non-BYOK user: use server API
              console.log("[VoiceInput] Using server STT (non-BYOK user)");
              result = await transcribeAudioWithServerRetry(audioBlob);
            } else if (isByokUser === true && elevenlabsApiKey) {
              // BYOK user with ElevenLabs API: use ElevenLabs
              console.log(
                "[VoiceInput] Using ElevenLabs STT (BYOK user with API key)",
              );
              result = await transcribeAudioWithRetry(audioBlob, {
                apiKey: elevenlabsApiKey,
                modelId: elevenlabsModelId,
              });
            } else {
              // BYOK user without ElevenLabs API: should use Web Speech API
              // But current VoiceInput uses VAD, does not support Web Speech
              // This case should be handled by intervention
              throw new Error(
                "Please configure ElevenLabs API Key in settings or use browser speech recognition",
              );
            }

            if (result.error) {
              throw new Error(result.error);
            }

            if (result.text) {
              // Log success but not the actual transcript (privacy)
              console.log("[VoiceInput] Transcription successful");

              // Pause VAD while waiting for AI processing
              if (vadRef.current) {
                console.log(
                  "[VoiceInput] Pausing VAD after sending transcript",
                );
                vadRef.current.pause();
              }

              setStatus("listening");
              setStatusText("Waiting for AI response...");

              // Send transcript using ref
              onTranscriptRef.current(result.text);
            } else {
              console.warn("[VoiceInput] Empty transcription");
              setStatus("listening");
              setStatusText("No speech detected, please try again");
            }
          } catch (error) {
            console.error("[VoiceInput] Transcription error");
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            setStatus("error");
            setStatusText(errorMsg);
            onErrorRef.current?.(errorMsg);

            // Resume listening after 3 seconds
            setTimeout(() => {
              setStatus("listening");
              setStatusText(t("interventions.voice.speakPrompt") || "Start speaking...");
            }, 3000);
          }
        },
        onVADMisfire: () => {
          console.log("[VoiceInput] VAD misfire");
          setStatus("listening");
          setStatusText(t("interventions.voice.speakPrompt") || "Continue speaking...");
        },
        onVolumeChange: (vol: number) => {
          if (particleSystemRef.current && !isPaused) {
            particleSystemRef.current.updateFrequency(vol);
          }
        },
      });

      await vad.start();
      vadRef.current = vad;

      setStatus("listening");
      setStatusText(t("interventions.voice.speakPrompt") || "Start speaking...");
    } catch (error) {
      console.error("[VoiceInput] Failed to initialize VAD");

      // Check if microphone permission was denied
      const isPermissionDenied =
        error instanceof Error &&
        (error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError" ||
          error.message.includes("Permission denied") ||
          error.message.includes("permission"));

      if (isPermissionDenied) {
        console.log(
          "[VoiceInput] Microphone permission denied, redirecting to guide...",
        );
        setIsPermissionError(true);
        // Open voice guide page
        window.open("https://www.claudechrome.com/voice/guide", "_blank");
      } else {
        setIsPermissionError(false);
      }

      const errorMsg =
        error instanceof Error
          ? error.message
          : "Unable to access microphone";
      setStatus("error");
      setStatusText(errorMsg);
      onErrorRef.current?.(errorMsg);
    } finally {
      isInitializingRef.current = false;
    }
  }, [isByokUser, elevenlabsApiKey, elevenlabsModelId, t, isPaused]);

  // Initialize on component mount
  useEffect(() => {
    // Ensure only initialized once
    if (hasInitializedRef.current) {
      console.log("[VoiceInput] Already initialized, skipping");
      return;
    }

    // Wait for BYOK status to load
    if (isByokUser === null) {
      setStatus("idle");
      setStatusText("Loading...");
      return;
    }

    // Wait for storage to load
    if (isLoadingApiKey) {
      setStatus("idle");
      setStatusText("Loading...");
      return;
    }

    // BYOK user needs to check for ElevenLabs API key
    if (isByokUser && !elevenlabsApiKey) {
      setStatus("error");
      setStatusText("Please configure ElevenLabs API Key in settings");
      return;
    }

    console.log("[VoiceInput] Initializing VAD on mount");
    hasInitializedRef.current = true;
    initializeVAD();
  }, [isByokUser, elevenlabsApiKey, isLoadingApiKey, initializeVAD]);

  // Cleanup on component unmount - separate effect to ensure it always runs
  useEffect(() => {
    return () => {
      // Immediately sync cleanup on unmount
      console.log(
        "[VoiceInput] Component unmounting - stopping VAD immediately",
      );

      if (vadRef.current) {
        // Stop immediately, don't wait for Promise
        vadRef.current.stop().catch((err) => {
          console.error("[VoiceInput] Failed to stop VAD during unmount");
        });
        vadRef.current = null;
      }

      // Reset all flags
      isInitializingRef.current = false;
      hasInitializedRef.current = false;

      console.log("[VoiceInput] Cleanup complete");
    };
  }, []); // Empty dependency ensures only runs on unmount

  // Monitor external pause state changes
  useEffect(() => {
    if (prevPausedRef.current !== isPaused) {
      console.log("[VoiceInput] Pause state changed:", isPaused);

      if (isPaused) {
        // Pause VAD but don't release resources
        if (vadRef.current) {
          console.log("[VoiceInput] Pausing VAD due to external pause");
          vadRef.current.pause();
          setStatusText("AI is processing...");
        }
      } else {
        // Resume VAD
        if (vadRef.current) {
          console.log("[VoiceInput] Resuming VAD after external pause");
          vadRef.current.resume();
          setStatus("listening");
          setStatusText(t("interventions.voice.speakPrompt") || "Start speaking...");
        }
      }

      prevPausedRef.current = isPaused;
    }
  }, [isPaused, t]);

  // Handle resize with ResizeObserver
  useEffect(() => {
    if (!canvasRef.current || !particleSystemRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === canvasRef.current) {
          particleSystemRef.current?.handleResize();
        }
      }
    });

    resizeObserver.observe(canvasRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-full h-full bg-background overflow-hidden",
        className,
      )}
    >
      {/* Particle Ball - Full Screen Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-0"
        style={{
          display: "block",
          touchAction: "none",
        }}
      />

      {/* Content layer - Overlay Content - Positioned at bottom */}
      <div className="relative z-10 flex flex-col items-center justify-end w-full h-full pointer-events-none pb-12">
        {/* Status text - Gray and at bottom */}
        <div className="text-center space-y-2">
          <p
            className={cn(
              "text-lg font-medium transition-colors duration-300 text-muted-foreground/60",
              status === "error" && "text-red-500/60",
            )}
          >
            {statusText}
          </p>

          {/* Hint text */}
          {!isPaused && status === "listening" && (
            <p className="text-sm text-muted-foreground/40">
              Start speaking, VAD will auto-detect your voice
            </p>
          )}

          {isPaused && (
            <p className="text-sm text-muted-foreground">
              AI is processing, voice detection paused
            </p>
          )}

          {/* Permission error prompt */}
          {status === "error" && isPermissionError && (
            <div className="pointer-events-auto pt-2 space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  window.open(
                    "https://www.claudechrome.com/voice/guide",
                    "_blank",
                  );
                }}
              >
                View Guide
              </Button>
            </div>
          )}

          {/* API Key error prompt */}
          {status === "error" && !isPermissionError && !elevenlabsApiKey && (
            <div className="pointer-events-auto pt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  chrome.runtime.openOptionsPage();
                }}
              >
                Go to Settings
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
