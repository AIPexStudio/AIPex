"use client";

import type { ToolUIPart } from "ai";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useState } from "react";
import { ScreenshotStorage } from "../../lib/screenshot-storage";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("not-prose mb-4 w-full rounded-md border", className)}
    {...props}
  />
);

export type ToolHeaderProps = {
  /** Display label for the tool – either a raw `tool-${name}` key or a translated name */
  type: string;
  state: ToolUIPart["state"] | "executing";
  className?: string;
};

const getStatusBadge = (status: ToolUIPart["state"] | "executing") => {
  const labels = {
    "input-streaming": "Pending",
    "input-available": "Running",
    executing: "Running",
    "approval-requested": "Approval Requested",
    "approval-responded": "Approved",
    "output-available": "Completed",
    "output-error": "Error",
    "output-denied": "Denied",
  } as const;

  const icons = {
    "input-streaming": <CircleIcon className="size-4" />,
    "input-available": <ClockIcon className="size-4 animate-pulse" />,
    executing: <ClockIcon className="size-4 animate-spin" />,
    "approval-requested": <ClockIcon className="size-4 text-yellow-600" />,
    "approval-responded": <CheckCircleIcon className="size-4 text-blue-600" />,
    "output-available": <CheckCircleIcon className="size-4 text-green-600" />,
    "output-error": <XCircleIcon className="size-4 text-red-600" />,
    "output-denied": <XCircleIcon className="size-4 text-orange-600" />,
  } as const;

  return (
    <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const ToolHeader = ({
  className,
  type,
  state,
  ...props
}: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      "flex w-full items-center justify-between gap-4 p-3",
      className,
    )}
    {...props}
  >
    <div className="flex items-center gap-2">
      <WrenchIcon className="size-4 text-muted-foreground" />
      <span className="font-medium text-sm">{type}</span>
      {getStatusBadge(state)}
    </div>
    <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className,
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolUIPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-2 overflow-hidden p-4", className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <div className="rounded-md bg-muted/50">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolUIPart["output"];
  errorText: ToolUIPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === "string") {
    Output = <CodeBlock code={output} language="json" />;
  }

  return (
    <div className={cn("space-y-2 p-4", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? "Error" : "Result"}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-md text-xs [&_table]:w-full",
          errorText
            ? "bg-destructive/10 text-destructive"
            : "bg-muted/50 text-foreground",
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};

// ============ Screenshot Display ============

export type ToolScreenshotProps = ComponentProps<"div"> & {
  /** Inline base64 screenshot data URL */
  screenshot?: string;
  /** UID referencing a screenshot stored in ScreenshotStorage (IndexedDB) */
  screenshotUid?: string;
};

/**
 * ToolScreenshot – renders a screenshot captured by a tool.
 * Supports both inline base64 data and IndexedDB uid references.
 */
export const ToolScreenshot = ({
  className,
  screenshot,
  screenshotUid,
  ...props
}: ToolScreenshotProps) => {
  const [imageData, setImageData] = useState<string | null>(
    screenshot ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prefer inline screenshot
    if (screenshot) {
      setImageData(screenshot);
      return;
    }

    // Load from IndexedDB by uid
    if (screenshotUid) {
      setLoading(true);
      setError(null);
      ScreenshotStorage.getScreenshot(screenshotUid)
        .then((data) => {
          setImageData(data);
          if (!data) setError("Screenshot not found");
        })
        .catch(() => {
          setError("Failed to load screenshot");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [screenshot, screenshotUid]);

  if (!screenshot && !screenshotUid) return null;

  return (
    <div className={cn("space-y-2 p-4", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        Screenshot
      </h4>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <ClockIcon className="size-4 animate-spin" />
          <span>Loading screenshot...</span>
        </div>
      ) : error ? (
        <div className="text-destructive text-sm">{error}</div>
      ) : imageData ? (
        <img
          src={imageData}
          alt="Screenshot"
          className="cursor-pointer rounded-md max-w-full"
        />
      ) : null}
    </div>
  );
};
