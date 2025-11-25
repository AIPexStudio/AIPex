import {
  CheckCircleIcon,
  Loader2Icon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import { Response } from "@/components/ai-elements/response";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "~/lib/utils";
import type { ToolDisplaySlotProps, UIToolPart } from "../../core/types";

/**
 * Format tool output for display
 */
function formatToolOutput(output: unknown): string {
  return `
\`\`\`${typeof output === "string" ? "text" : "json"}
${typeof output === "string" ? output : JSON.stringify(output, null, 2)}
\`\`\`
`;
}

/**
 * Map UI tool state to tool component state
 */
function mapToolState(
  state: UIToolPart["state"],
):
  | "input-streaming"
  | "input-available"
  | "executing"
  | "output-available"
  | "output-error" {
  switch (state) {
    case "pending":
      return "input-available";
    case "executing":
      return "executing";
    case "completed":
      return "output-available";
    case "error":
      return "output-error";
    default:
      return "input-available";
  }
}

/**
 * Default tool display slot component
 */
export function DefaultToolDisplay({ tool }: ToolDisplaySlotProps) {
  return (
    <Tool defaultOpen={false}>
      <ToolHeader
        type={`tool-${tool.toolName}`}
        state={mapToolState(tool.state)}
      />
      <ToolContent>
        <ToolInput input={tool.input} />
        <ToolOutput
          output={
            tool.output ? (
              <Response>{formatToolOutput(tool.output)}</Response>
            ) : undefined
          }
          errorText={tool.errorText}
        />
      </ToolContent>
    </Tool>
  );
}

/**
 * Compact tool display (single line)
 */
export function CompactToolDisplay({ tool }: ToolDisplaySlotProps) {
  const getStatusIcon = () => {
    switch (tool.state) {
      case "pending":
        return <WrenchIcon className="size-4 text-muted-foreground" />;
      case "executing":
        return <Loader2Icon className="size-4 animate-spin text-blue-500" />;
      case "completed":
        return <CheckCircleIcon className="size-4 text-green-500" />;
      case "error":
        return <XCircleIcon className="size-4 text-red-500" />;
    }
  };

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 transition-colors">
        {getStatusIcon()}
        <span className="text-sm font-medium">{tool.toolName}</span>
        {tool.duration && (
          <span className="text-xs text-muted-foreground ml-auto">
            {tool.duration}ms
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 pt-2">
        <div className="text-xs space-y-2">
          <div>
            <span className="text-muted-foreground">Input:</span>
            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
              {JSON.stringify(tool.input, null, 2)}
            </pre>
          </div>
          {tool.output !== undefined && tool.output !== null && (
            <div>
              <span className="text-muted-foreground">Output:</span>
              <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                {typeof tool.output === "string"
                  ? tool.output
                  : JSON.stringify(tool.output, null, 2)}
              </pre>
            </div>
          )}
          {tool.errorText && (
            <div className="text-red-500">
              <span>Error:</span>
              <pre className="mt-1 p-2 bg-red-50 dark:bg-red-950 rounded text-xs">
                {tool.errorText}
              </pre>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Minimal tool display (just status indicator)
 */
export function MinimalToolDisplay({ tool }: ToolDisplaySlotProps) {
  const getStatusColor = () => {
    switch (tool.state) {
      case "pending":
        return "bg-gray-200 dark:bg-gray-700";
      case "executing":
        return "bg-blue-200 dark:bg-blue-800";
      case "completed":
        return "bg-green-200 dark:bg-green-800";
      case "error":
        return "bg-red-200 dark:bg-red-800";
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full bg-muted">
      <div className={cn("w-2 h-2 rounded-full", getStatusColor())} />
      <span>{tool.toolName}</span>
      {tool.state === "executing" && (
        <Loader2Icon className="size-3 animate-spin" />
      )}
    </div>
  );
}
