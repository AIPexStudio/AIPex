import {
  CameraIcon,
  FileTextIcon,
  LayersIcon,
  ScanSearchIcon,
  SearchIcon,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "../../../i18n/context";
import { cn } from "../../../lib/utils";
import type { WelcomeScreenProps, WelcomeSuggestion } from "../../../types";
import { Suggestion, Suggestions } from "../../ai-elements/suggestion";
import { useComponentsContext } from "../context";

/**
 * Build i18n-driven default suggestions matching legacy AIPex layout.
 */
function useDefaultSuggestions(): WelcomeSuggestion[] {
  const { t } = useTranslation();

  return useMemo(
    () => [
      {
        icon: FileTextIcon,
        text: t("welcome.analyzePage"),
        iconColor: "text-green-600",
        bgColor: "bg-green-100",
      },
      {
        icon: LayersIcon,
        text: t("welcome.organizeTabs"),
        iconColor: "text-blue-600",
        bgColor: "bg-blue-100",
      },
      {
        icon: SearchIcon,
        text: t("welcome.research"),
        iconColor: "text-purple-600",
        bgColor: "bg-purple-100",
      },
      {
        icon: CameraIcon,
        text: t("welcome.screenRecording"),
        iconColor: "text-orange-600",
        bgColor: "bg-orange-100",
      },
      {
        icon: ScanSearchIcon,
        text: t("welcome.uxAuditGoal"),
        iconColor: "text-cyan-600",
        bgColor: "bg-cyan-100",
      },
    ],
    [t],
  );
}

/**
 * Default WelcomeScreen component
 */
export function DefaultWelcomeScreen({
  onSuggestionClick,
  suggestions,
  className,
  ...props
}: WelcomeScreenProps) {
  const { t } = useTranslation();
  const defaultSuggestions = useDefaultSuggestions();
  const effectiveSuggestions = suggestions ?? defaultSuggestions;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center h-full p-4 sm:p-8",
        className,
      )}
      {...props}
    >
      <div className="text-center mb-6 sm:mb-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t("welcome.title")}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("welcome.subtitle")}
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <Suggestions className="grid gap-3 sm:gap-4 sm:grid-cols-2 w-full">
          {effectiveSuggestions.map((suggestion) => {
            const Icon = suggestion.icon;
            return (
              <Suggestion
                key={suggestion.text}
                suggestion={suggestion.text}
                onClick={onSuggestionClick}
                variant="outline"
                size="lg"
                className={cn(
                  "w-full h-auto justify-start items-center p-4 sm:p-5 rounded-xl border transition-all duration-200",
                  "hover:shadow-md bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm",
                  "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600",
                )}
              >
                <div className="flex items-center gap-3 w-full">
                  {Icon && (
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        suggestion.bgColor || "bg-gray-100",
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5",
                          suggestion.iconColor || "text-gray-600",
                        )}
                      />
                    </div>
                  )}
                  <div className="text-xs text-left text-gray-700 dark:text-gray-300 flex-1 line-clamp-2 break-words whitespace-normal">
                    {suggestion.text}
                  </div>
                </div>
              </Suggestion>
            );
          })}
        </Suggestions>
      </div>
    </div>
  );
}

/**
 * WelcomeScreen - Renders either custom or default welcome screen
 */
export function WelcomeScreen(props: WelcomeScreenProps) {
  const { components, slots } = useComponentsContext();

  // Check for slot override first
  if (slots.emptyState) {
    return <>{slots.emptyState(props)}</>;
  }

  // Check for component override
  const CustomComponent = components.WelcomeScreen;
  if (CustomComponent) {
    return <CustomComponent {...props} />;
  }

  // Use default
  return <DefaultWelcomeScreen {...props} />;
}
