/**
 * Automation Mode Toolbar - Focus/Background mode switcher
 *
 * Integrates with the input toolbar to allow users to switch between
 * focus mode (visual feedback, window focus) and background mode (silent operation)
 */

import {
  type AutomationMode,
  STORAGE_KEYS,
  validateAutomationMode,
} from "@aipexstudio/aipex-core";
import type { InputToolbarSlotProps } from "@aipexstudio/aipex-react";
import { Button } from "@aipexstudio/aipex-react/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@aipexstudio/aipex-react/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@aipexstudio/aipex-react/components/ui/tooltip";
import { useTranslation } from "@aipexstudio/aipex-react/i18n/context";
import { cn } from "@aipexstudio/aipex-react/lib/utils";
import { useStorage } from "@aipexstudio/browser-runtime/hooks";
import {
  EyeIcon,
  Loader2Icon,
  MoonIcon,
  SendIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import { useMemo } from "react";

/**
 * AutomationModeInputToolbar - Combines automation mode selector with submit button
 */
export function AutomationModeInputToolbar({
  status,
  onStop,
  onSubmit,
}: InputToolbarSlotProps) {
  const { t } = useTranslation();
  const [automationModeRaw, setAutomationMode, isLoadingMode] =
    useStorage<string>(STORAGE_KEYS.AUTOMATION_MODE, "focus");

  const automationMode: AutomationMode = useMemo(
    () => validateAutomationMode(automationModeRaw),
    [automationModeRaw],
  );

  // Determine submit button state
  let submitIcon = <SendIcon className="size-4" />;
  let submitLabel = "Send";

  if (status === "submitted") {
    submitIcon = <Loader2Icon className="size-4 animate-spin" />;
    submitLabel = "Sending...";
  } else if (status === "streaming") {
    submitIcon = <SquareIcon className="size-4" />;
    submitLabel = "Stop";
  } else if (status === "error") {
    submitIcon = <XIcon className="size-4" />;
    submitLabel = "Error";
  }

  const handleSubmitClick = () => {
    if (status === "streaming") {
      onStop?.();
    } else {
      onSubmit?.();
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Automation Mode Selector */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  automationMode === "focus"
                    ? "text-blue-500 hover:text-blue-600"
                    : "text-muted-foreground hover:text-foreground",
                )}
                disabled={isLoadingMode}
              >
                {automationMode === "focus" ? (
                  <EyeIcon className="size-4" />
                ) : (
                  <MoonIcon className="size-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("mode.selectMode")}</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => setAutomationMode("focus")}
            className={cn(
              "cursor-pointer",
              automationMode === "focus" && "bg-accent",
            )}
          >
            <div className="flex items-start gap-2 py-1">
              <EyeIcon className="size-4 mt-0.5 text-blue-500" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{t("mode.focus")}</span>
                  {automationMode === "focus" && (
                    <span className="text-xs text-blue-600">✓</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {t("mode.focusDescription")}
                </span>
              </div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setAutomationMode("background")}
            className={cn(
              "cursor-pointer",
              automationMode === "background" && "bg-accent",
            )}
          >
            <div className="flex items-start gap-2 py-1">
              <MoonIcon className="size-4 mt-0.5 text-gray-500" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {t("mode.background")}
                  </span>
                  {automationMode === "background" && (
                    <span className="text-xs text-blue-600">✓</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {t("mode.backgroundDescription")}
                </span>
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Submit Button */}
      <Button
        aria-label={submitLabel}
        className="gap-1.5 rounded-lg"
        size="icon"
        type={status === "streaming" ? "button" : "submit"}
        variant="default"
        onClick={status === "streaming" ? handleSubmitClick : undefined}
      >
        {submitIcon}
      </Button>
    </div>
  );
}
