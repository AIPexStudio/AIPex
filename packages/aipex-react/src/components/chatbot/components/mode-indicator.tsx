/**
 * Mode Indicator Component
 *
 * Displays the current automation mode (immersive/background) with animated transitions.
 * Provides visual feedback when the system switches between modes.
 */

import { EyeIcon, MoonIcon } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";

export type AutomationModeValue = "immersive" | "background";

interface ModeIndicatorProps {
  mode: AutomationModeValue;
  isTransitioning?: boolean;
  className?: string;
}

/**
 * Mode Indicator Component
 *
 * Shows current automation mode with icon, label, and transition animations
 */
// Default translations for mode indicator
const defaultTranslations = {
  "mode.immersive": "Focus Mode",
  "mode.background": "Background Mode",
  "mode.immersiveDescription": "Visual feedback and window focus enabled",
  "mode.backgroundDescription": "Silent operation, no window focus changes",
};

export function ModeIndicator({
  mode,
  isTransitioning = false,
  className,
}: ModeIndicatorProps) {
  // Simple translation function
  const t = (key: string): string => {
    return defaultTranslations[key as keyof typeof defaultTranslations] || key;
  };

  const isImmersive = mode === "immersive";

  const modeLabel = t(isImmersive ? "mode.immersive" : "mode.background");
  const modeDescription = t(
    isImmersive ? "mode.immersiveDescription" : "mode.backgroundDescription",
  );

  const tooltipContent = (
    <div className="max-w-xs space-y-1">
      <p className="font-semibold">{modeLabel}</p>
      <p className="text-xs opacity-90">{modeDescription}</p>
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            // Base styles
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium",
            "transition-all duration-600 ease-out",
            "select-none cursor-help",
            // Mode-specific styles
            isImmersive
              ? [
                  // Immersive mode: blue gradient with glow
                  "bg-gradient-to-r from-blue-600 to-blue-500",
                  "text-white shadow-lg shadow-blue-500/40",
                  "animate-mode-pulse",
                ]
              : [
                  // Background mode: gray, subtle
                  "bg-gray-600/80 text-gray-200",
                  "opacity-70",
                ],
            // Transition animation
            isTransitioning &&
              (isImmersive
                ? "animate-transition-enter-immersive"
                : "animate-transition-enter-background"),
            className,
          )}
          role="status"
          aria-live="polite"
          aria-label={`Current mode: ${isImmersive ? "Immersive" : "Background"}`}
        >
          {/* Icon */}
          <span className="flex-shrink-0">
            {isImmersive ? (
              <EyeIcon className="size-3.5" />
            ) : (
              <MoonIcon className="size-3.5" />
            )}
          </span>

          {/* Label */}
          <span className="whitespace-nowrap">{modeLabel}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Add custom animations to global CSS
 * (This should be added to your global stylesheet or tailwind config)
 *
 * @keyframes mode-pulse {
 *   0%, 100% {
 *     box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
 *   }
 *   50% {
 *     box-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
 *   }
 * }
 *
 * @keyframes transition-enter-immersive {
 *   0% {
 *     transform: scale(0.9);
 *     opacity: 0.5;
 *   }
 *   50% {
 *     transform: scale(1.1);
 *   }
 *   100% {
 *     transform: scale(1);
 *     opacity: 1;
 *   }
 * }
 *
 * @keyframes transition-enter-background {
 *   0% {
 *     transform: scale(1.05);
 *     opacity: 1;
 *   }
 *   100% {
 *     transform: scale(1);
 *     opacity: 0.7;
 *   }
 * }
 *
 * .animate-mode-pulse {
 *   animation: mode-pulse 2s ease-in-out infinite;
 * }
 *
 * .animate-transition-enter-immersive {
 *   animation: transition-enter-immersive 0.6s ease-out;
 * }
 *
 * .animate-transition-enter-background {
 *   animation: transition-enter-background 0.4s ease-out;
 * }
 */
