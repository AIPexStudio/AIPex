import { PlusIcon, SettingsIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "../../../i18n/context";
import { getRuntime } from "../../../lib/runtime";
import { cn } from "../../../lib/utils";
import type { HeaderProps } from "../../../types";
import { Button } from "../../ui/button";
import { useComponentsContext } from "../context";

/**
 * Default Header component
 */
export function DefaultHeader({
  title = "AIPex",
  onSettingsClick,
  onNewChat,
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

      {/* Right side - New Chat */}
      <Button variant="ghost" size="sm" onClick={onNewChat} className="gap-2">
        <PlusIcon className="size-4" />
        {t("common.newChat")}
      </Button>

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
