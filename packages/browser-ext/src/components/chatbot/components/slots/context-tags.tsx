import {
  BookmarkIcon,
  CameraIcon,
  ClipboardIcon,
  FileIcon,
  FileTextIcon,
  GlobeIcon,
  XIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "~/lib/utils";
import type { ContextItem, ContextTagsSlotProps } from "../../core/types";

/**
 * Get icon for context type
 */
function getContextIcon(type: string): ReactNode {
  const iconProps = { className: "size-3" };
  switch (type) {
    case "page":
      return <GlobeIcon {...iconProps} />;
    case "tab":
      return <FileIcon {...iconProps} />;
    case "bookmark":
      return <BookmarkIcon {...iconProps} />;
    case "clipboard":
      return <ClipboardIcon {...iconProps} />;
    case "screenshot":
      return <CameraIcon {...iconProps} />;
    default:
      return <FileTextIcon {...iconProps} />;
  }
}

/**
 * Single context tag component
 */
export function ContextTag({
  context,
  onRemove,
  className,
}: {
  context: ContextItem;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group inline-flex items-center gap-1.5 px-2 py-1 text-sm rounded-md",
        "bg-muted/50 hover:bg-muted transition-colors",
        "border border-border",
        className,
      )}
    >
      <span className="text-muted-foreground">
        {context.icon || getContextIcon(context.type)}
      </span>
      <span className="max-w-[200px] truncate">{context.label}</span>
      {onRemove && (
        <Button
          aria-label="Remove context"
          className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
          size="icon"
          type="button"
          variant="ghost"
        >
          <XIcon className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

/**
 * Default context tags slot component
 */
export function DefaultContextTags({
  contexts,
  onRemove,
}: ContextTagsSlotProps) {
  if (contexts.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 p-3 pb-0">
      {contexts.map((context) => (
        <ContextTag
          key={context.id}
          context={context}
          onRemove={onRemove ? () => onRemove(context.id) : undefined}
        />
      ))}
    </div>
  );
}

/**
 * Compact context tags (shows count instead of all tags)
 */
export function CompactContextTags({
  contexts,
  onRemove,
}: ContextTagsSlotProps) {
  if (contexts.length === 0) {
    return null;
  }

  if (contexts.length === 1) {
    return (
      <div className="flex flex-wrap gap-2 p-3 pb-0">
        <ContextTag
          context={contexts[0]}
          onRemove={onRemove ? () => onRemove(contexts[0].id) : undefined}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 pb-0">
      <ContextTag context={contexts[0]} />
      <span className="text-xs text-muted-foreground">
        +{contexts.length - 1} more
      </span>
    </div>
  );
}
