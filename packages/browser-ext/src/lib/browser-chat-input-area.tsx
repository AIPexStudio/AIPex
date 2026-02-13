/**
 * BrowserChatInputArea
 * Renders VoiceInput when inputMode is "voice", otherwise the default text InputArea.
 */

import {
  DefaultInputArea,
  type ExtendedInputAreaProps,
} from "@aipexstudio/aipex-react/components/chatbot/components";
import { VoiceInput } from "@aipexstudio/aipex-react/components/voice";
import type { InputAreaProps } from "@aipexstudio/aipex-react/types";
import { useCallback } from "react";
import { useInputMode } from "./input-mode-context";

export function BrowserChatInputArea(props: InputAreaProps) {
  const { inputMode, setInputMode } = useInputMode();

  const handleTranscript = useCallback(
    (text: string) => {
      // Send the transcribed text as a message
      props.onSubmit(text);
    },
    [props.onSubmit],
  );

  const handleSwitchToText = useCallback(() => {
    setInputMode("text");
  }, [setInputMode]);

  if (inputMode === "voice") {
    const isStreaming =
      props.status === "streaming" || props.status === "submitted";

    return (
      <div className="flex-1 overflow-hidden">
        <VoiceInput
          onTranscript={handleTranscript}
          isPaused={isStreaming}
          onSwitchToText={handleSwitchToText}
        />
      </div>
    );
  }

  // Text mode: render the default input area, forwarding all props
  return <DefaultInputArea {...(props as ExtendedInputAreaProps)} />;
}
