import { Loader2Icon, SendIcon, SquareIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InputToolbarSlotProps } from "../../core/types";

/**
 * Default input toolbar slot component
 */
export function DefaultInputToolbar({
  status,
  onStop,
  onSubmit,
}: InputToolbarSlotProps) {
  let Icon = <SendIcon className="size-4" />;
  let label = "Send";

  if (status === "submitted") {
    Icon = <Loader2Icon className="size-4 animate-spin" />;
    label = "Sending...";
  } else if (status === "streaming") {
    Icon = <SquareIcon className="size-4" />;
    label = "Stop";
  } else if (status === "error") {
    Icon = <XIcon className="size-4" />;
    label = "Error";
  }

  const handleClick = () => {
    if (status === "streaming") {
      onStop?.();
    } else {
      onSubmit?.();
    }
  };

  return (
    <Button
      aria-label={label}
      className="gap-1.5 rounded-lg"
      size="icon"
      type={status === "streaming" ? "button" : "submit"}
      variant="default"
      onClick={status === "streaming" ? handleClick : undefined}
    >
      {Icon}
    </Button>
  );
}

/**
 * Input toolbar with text label
 */
export function InputToolbarWithLabel({
  status,
  onStop,
  onSubmit,
}: InputToolbarSlotProps) {
  let label = "Send";
  let Icon = <SendIcon className="size-4" />;

  if (status === "submitted") {
    Icon = <Loader2Icon className="size-4 animate-spin" />;
    label = "Sending...";
  } else if (status === "streaming") {
    Icon = <SquareIcon className="size-4" />;
    label = "Stop";
  } else if (status === "error") {
    Icon = <XIcon className="size-4" />;
    label = "Error";
  }

  const handleClick = () => {
    if (status === "streaming") {
      onStop?.();
    } else {
      onSubmit?.();
    }
  };

  return (
    <Button
      className="gap-1.5 rounded-lg"
      size="default"
      type={status === "streaming" ? "button" : "submit"}
      variant="default"
      onClick={status === "streaming" ? handleClick : undefined}
    >
      {Icon}
      <span>{label}</span>
    </Button>
  );
}
