/**
 * BrowserMessageList
 * Wraps the default MessageList and hides it when inputMode is "voice",
 * matching aipex's behaviour where messages are hidden in voice mode.
 */

import { DefaultMessageList } from "@aipexstudio/aipex-react/components/chatbot/components";
import type { MessageListProps } from "@aipexstudio/aipex-react/types";
import { useInputMode } from "./input-mode-context";

export function BrowserMessageList(
  props: MessageListProps & { onSuggestionClick?: (text: string) => void },
) {
  const { inputMode } = useInputMode();

  // In voice mode, hide the message list (matching aipex full-screen voice behaviour)
  if (inputMode === "voice") {
    return null;
  }

  return <DefaultMessageList {...props} />;
}
