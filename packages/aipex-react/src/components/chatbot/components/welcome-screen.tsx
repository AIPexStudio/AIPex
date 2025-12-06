import {
  DollarSignIcon,
  FileTextIcon,
  LayersIcon,
  SearchIcon,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import type { WelcomeScreenProps, WelcomeSuggestion } from "../../../types";
import { Suggestion, Suggestions } from "../../ai-elements/suggestion";
import { useComponentsContext } from "../context";

/**
 * Default suggestions for the welcome screen
 */
const DEFAULT_SUGGESTIONS: WelcomeSuggestion[] = [
  {
    icon: LayersIcon,
    text: "Help me organize my browser tabs by topic",
    iconColor: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    icon: FileTextIcon,
    text: "Summarize this page for me",
    iconColor: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    icon: SearchIcon,
    text: "Research a topic across multiple tabs",
    iconColor: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    icon: DollarSignIcon,
    text: "Compare prices across shopping tabs",
    iconColor: "text-orange-600",
    bgColor: "bg-orange-100",
  },
];

/**
 * Default WelcomeScreen component
 */
export function DefaultWelcomeScreen({
  onSuggestionClick,
  suggestions = DEFAULT_SUGGESTIONS,
  className,
  ...props
}: WelcomeScreenProps) {
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
          Welcome to AIPex
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your AI-powered browser assistant
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <Suggestions className="grid gap-3 sm:gap-4 sm:grid-cols-2 w-full">
          {suggestions.map((suggestion) => {
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
