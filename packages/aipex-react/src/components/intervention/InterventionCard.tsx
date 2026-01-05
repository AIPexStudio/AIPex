/**
 * Intervention Card
 *
 * Modern intervention card container
 */

import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  XIcon,
} from "lucide-react";
import type React from "react";
import { useTranslation } from "../../i18n/hooks.js";
import type { TranslationKey } from "../../i18n/types.js";
import { Button } from "../ui/button.js";

export type InterventionStatus =
  | "pending"
  | "active"
  | "completed"
  | "cancelled"
  | "timeout"
  | "error";

interface InterventionCardProps {
  status: InterventionStatus;
  title: string;
  reason?: string;
  timeout?: number;
  onCancel?: () => void;
  children?: React.ReactNode;
}

const STATUS_BASE_CONFIG = {
  pending: {
    icon: ClockIcon,
    accentColor: "bg-amber-400",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
  },
  active: {
    icon: ClockIcon,
    accentColor: "bg-blue-400",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
  },
  completed: {
    icon: CheckCircleIcon,
    accentColor: "bg-emerald-400",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
  },
  cancelled: {
    icon: XIcon,
    accentColor: "bg-gray-400",
    iconBg: "bg-gray-50",
    iconColor: "text-gray-600",
    badgeBg: "bg-gray-100",
    badgeText: "text-gray-700",
  },
  timeout: {
    icon: AlertCircleIcon,
    accentColor: "bg-orange-400",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-700",
  },
  error: {
    icon: AlertCircleIcon,
    accentColor: "bg-rose-400",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-700",
  },
};

export const InterventionCard: React.FC<InterventionCardProps> = ({
  status,
  title,
  reason,
  timeout,
  onCancel,
  children,
}) => {
  const { t } = useTranslation();
  const config = STATUS_BASE_CONFIG[status];
  const Icon = config.icon;
  const isActive = status === "active" || status === "pending";

  const getStatusLabel = () => {
    return t(`interventions.status.${status}` as TranslationKey);
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-800
        shadow-sm hover:shadow-md transition-all duration-200
        ${isActive ? "animate-in slide-in-from-bottom-4" : ""}
      `}
    >
      {/* Colorful accent bar */}
      <div className={`h-1 ${config.accentColor}`} />

      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className={`p-2 rounded-xl ${config.iconBg}`}>
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {title}
                </h3>
                <span
                  className={`
                  text-xs font-medium px-2.5 py-1 rounded-full
                  ${config.badgeBg} ${config.badgeText}
                `}
                >
                  {getStatusLabel()}
                </span>
              </div>
              {reason && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                  {reason}
                </p>
              )}
            </div>
          </div>
          {isActive && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="ml-2 h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4 bg-gray-50/50 dark:bg-gray-900/50">
        {children}
      </div>

      {/* Footer - Timeout indicator */}
      {isActive && timeout && (
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <ClockIcon className="w-3.5 h-3.5" />
            <span>
              {t("interventions.common.timeoutLabel" as TranslationKey)}:{" "}
              {timeout}{" "}
              {t("interventions.common.timeoutUnit" as TranslationKey)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
