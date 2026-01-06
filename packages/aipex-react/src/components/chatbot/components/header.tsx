import { KeyboardIcon, MicIcon, PlusIcon, SettingsIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "../../../i18n/context";
import { getRuntime } from "../../../lib/runtime";
import { cn } from "../../../lib/utils";
import type { HeaderProps } from "../../../types";
import { Button } from "../../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { useComponentsContext } from "../context";

/**
 * Default Header component
 */
export function DefaultHeader({
  title = "AIPex",
  onSettingsClick,
  onNewChat,
  inputMode,
  onToggleInputMode,
  className,
  children,
  ...props
}: HeaderProps) {
  const { t } = useTranslation();
  const { slots } = useComponentsContext();
  const runtime = getRuntime();

  const handleOpenOptions = useCallback(() => {
    if (onSettingsClick) {
      onSettingsClick();
    } else if (runtime?.openOptionsPage) {
      runtime.openOptionsPage();
    }
  }, [onSettingsClick, runtime]);

  return (
    <div
      className={cn(
        "flex items-center justify-between border-b px-4 py-2",
        className,
      )}
      {...props}
    >
      {/* Left side - Settings */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpenOptions}
        className="gap-2"
      >
        <SettingsIcon className="size-4" />
        {t("common.settings")}
      </Button>

      {/* Center - Title or custom content */}
      {slots.headerContent ? (
        slots.headerContent()
      ) : (
        <div className="text-sm font-medium">{title}</div>
      )}

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Voice/Text Mode Toggle */}
        {onToggleInputMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onToggleInputMode}>
                {inputMode === "voice" ? (
                  <KeyboardIcon className="size-4" />
                ) : (
                  <MicIcon className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {inputMode === "voice"
                ? t("chatbot.switchToText")
                : t("chatbot.switchToVoice")}
            </TooltipContent>
          </Tooltip>
        )}

        {/* New Chat */}
        <Button variant="ghost" size="sm" onClick={onNewChat} className="gap-2">
          <PlusIcon className="size-4" />
          {t("common.newChat")}
        </Button>
      </div>

      {children}
    </div>
  );
}

/**
 * Header - Renders either custom or default header
 */
export function Header(props: HeaderProps) {
  const { components } = useComponentsContext();

  const CustomComponent = components.Header;
  if (CustomComponent) {
    return <CustomComponent {...props} />;
  }

  return <DefaultHeader {...props} />;
}
