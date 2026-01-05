/**
 * Monitor Operation Card
 *
 * Clean and colorful operation monitoring card
 */

import { MousePointerClickIcon } from "lucide-react";
import type React from "react";
import { useTranslation } from "../../i18n/hooks.js";
import type { TranslationKey } from "../../i18n/types.js";
import type { InterventionStatus } from "./InterventionCard.js";
import { InterventionCard } from "./InterventionCard.js";

interface MonitorCardProps {
  status: InterventionStatus;
  reason?: string;
  timeout?: number;
  onCancel?: () => void;
}

export const MonitorCard: React.FC<MonitorCardProps> = ({
  status,
  reason,
  timeout,
  onCancel,
}) => {
  const { t } = useTranslation();
  const isActive = status === "active" || status === "pending";

  return (
    <InterventionCard
      status={status}
      title={t("interventions.monitor.title" as TranslationKey)}
      reason={reason}
      timeout={timeout}
      onCancel={onCancel}
    >
      {isActive && (
        <div className="space-y-4">
          {/* Click indicator animation */}
          <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-xl p-8 overflow-hidden">
            {/* Pulse rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <span
                  className="absolute inline-flex h-20 w-20 rounded-full bg-purple-400 opacity-20 animate-ping"
                  style={{ animationDuration: "2s" }}
                />
                <span
                  className="absolute inline-flex h-16 w-16 top-2 left-2 rounded-full bg-purple-400 opacity-30 animate-ping"
                  style={{ animationDuration: "1.5s" }}
                />
              </div>
            </div>

            {/* Center icon */}
            <div className="relative flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center ring-4 ring-purple-100 dark:ring-purple-900/50">
                <MousePointerClickIcon className="w-7 h-7 text-purple-600 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Hint information */}
          <div className="space-y-3">
            <div className="text-sm text-center font-medium text-gray-900 dark:text-gray-100 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-4 py-3">
              👆 {t("interventions.monitor.clickPrompt" as TranslationKey)}
            </div>

            <div className="text-xs text-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg py-2.5">
              {t("interventions.monitor.captureInfo" as TranslationKey)}
            </div>
          </div>
        </div>
      )}

      {status === "completed" && (
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
            {t("interventions.monitor.captured" as TranslationKey)}
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {t("interventions.monitor.capturedSuccess" as TranslationKey)}
            </div>
          </div>
        </div>
      )}

      {status === "cancelled" && (
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
          {t("interventions.monitor.cancelled" as TranslationKey)}
        </div>
      )}

      {status === "timeout" && (
        <div className="text-sm text-orange-600 dark:text-orange-400 text-center py-4">
          {t("interventions.monitor.timeout" as TranslationKey)}
        </div>
      )}

      {status === "error" && (
        <div className="text-sm text-rose-600 dark:text-rose-400 text-center py-4">
          {t("interventions.monitor.error" as TranslationKey)}
        </div>
      )}
    </InterventionCard>
  );
};
