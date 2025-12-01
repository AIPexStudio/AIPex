import { PlusIcon, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "~/lib/utils";
import type { HeaderProps } from "~/types";
import { useComponentsContext } from "../core/context";

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
  const { slots } = useComponentsContext();

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
        onClick={onSettingsClick}
        className="gap-2"
      >
        <SettingsIcon className="size-4" />
        Settings
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
        New Chat
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
