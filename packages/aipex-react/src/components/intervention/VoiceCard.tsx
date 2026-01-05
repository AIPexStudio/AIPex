/**
 * Voice Input Card
 *
 * Clean and colorful voice input card
 */

import { MicIcon, StopCircleIcon } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "../../i18n/hooks.js";
import type { TranslationKey } from "../../i18n/types.js";
import { Button } from "../ui/button.js";
import type { InterventionStatus } from "./InterventionCard.js";
import { InterventionCard } from "./InterventionCard.js";

interface VoiceCardProps {
  status: InterventionStatus;
  reason?: string;
  timeout?: number;
  interimText?: string;
  finalText?: string;
  recordingDuration?: number;
  silenceCountdown?: number;
  onStop?: () => void;
  onCancel?: () => void;
}

// Simple voice ripple animation
const VoiceWaveAnimation: React.FC = () => {
  const waves = [0, 1, 2, 3, 4];
  return (
    <>
      <style>
        {`
          @keyframes voiceWave {
            0%, 100% {
              transform: scaleY(0.3);
            }
            50% {
              transform: scaleY(1);
            }
          }
        `}
      </style>
      <div className="flex items-center justify-center gap-1.5 h-20">
        {waves.map((i) => (
          <div
            key={`wave-${i}`}
            className="w-1.5 bg-gradient-to-t from-blue-400 to-indigo-500 rounded-full"
            style={{
              height: "100%",
              animation: `voiceWave 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`,
              transformOrigin: "bottom",
            }}
          />
        ))}
      </div>
    </>
  );
};

export const VoiceCard: React.FC<VoiceCardProps> = ({
  status,
  reason,
  timeout,
  interimText,
  finalText,
  recordingDuration = 0,
  silenceCountdown,
  onStop,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [duration, setDuration] = useState(recordingDuration);
  const isActive = status === "active" || status === "pending";
  const isRecording = status === "active";

  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <InterventionCard
      status={status}
      title={t("interventions.voice.title" as TranslationKey)}
      reason={reason}
      timeout={timeout}
      onCancel={onCancel}
    >
      {isActive && (
        <div className="space-y-4">
          {/* Voice ripple animation */}
          {isRecording && (
            <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl p-4">
              <VoiceWaveAnimation />
              {/* Microphone icon center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center ring-4 ring-blue-100 dark:ring-blue-900/50">
                  <MicIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          )}

          {/* Real-time recognition text */}
          {interimText && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 ring-1 ring-blue-200 dark:ring-blue-800">
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mb-2 font-medium">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                {t("interventions.voice.recognizing" as TranslationKey)}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
                {interimText}
              </div>
            </div>
          )}

          {/* Recording information */}
          <div className="flex items-center justify-between text-sm bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2.5">
              {isRecording && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
              )}
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {formatDuration(duration)}
              </span>
            </div>

            {/* Silence countdown */}
            {silenceCountdown !== undefined && silenceCountdown > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" />
                {t("interventions.voice.silence" as TranslationKey)}{" "}
                {silenceCountdown}s
              </div>
            )}
          </div>

          {/* Manual stop button */}
          {isRecording && onStop && (
            <Button
              type="button"
              onClick={onStop}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-medium shadow-sm h-11 rounded-xl"
            >
              <StopCircleIcon className="w-4 h-4 mr-2" />
              {t("interventions.voice.stopRecording" as TranslationKey)}
            </Button>
          )}

          {/* Hint information */}
          <div className="text-xs text-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg py-2.5">
            {isRecording
              ? `💬 ${t("interventions.voice.speakPrompt" as TranslationKey)}`
              : `⏳ ${t("interventions.voice.initializingMic" as TranslationKey)}`}
          </div>
        </div>
      )}

      {status === "completed" && finalText && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {t("interventions.voice.completed" as TranslationKey)}
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {finalText}
            </div>
          </div>
        </div>
      )}

      {status === "cancelled" && (
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
          {t("interventions.voice.cancelled" as TranslationKey)}
        </div>
      )}

      {status === "timeout" && (
        <div className="text-sm text-orange-600 dark:text-orange-400 text-center py-4">
          {t("interventions.voice.timeout" as TranslationKey)}
        </div>
      )}

      {status === "error" && (
        <div className="text-sm text-rose-600 dark:text-rose-400 text-center py-4">
          {t("interventions.voice.error" as TranslationKey)}
        </div>
      )}
    </InterventionCard>
  );
};
