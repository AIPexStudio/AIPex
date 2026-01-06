import { useCallback, useMemo } from "react";
import { VoiceInput } from "../../voice/VoiceInput";
import { useChatContext } from "../context";

export interface VoiceInputWrapperProps {
  onSwitchToText: () => void;
  voiceKey?: number;
}

/**
 * VoiceInputWrapper - Bridges the pure UI VoiceInput component with chatbot logic
 *
 * This wrapper:
 * - Connects VoiceInput to the chat context (sendMessage, status)
 * - Maps chat status to voice state for particle animation
 * - Handles transcript submission
 * - Provides switch to text mode callback
 */
export function VoiceInputWrapper({
  onSwitchToText,
  voiceKey,
}: VoiceInputWrapperProps) {
  const chatCtx = useChatContext();

  if (!chatCtx) {
    throw new Error("VoiceInputWrapper must be used within ChatContext");
  }

  const { sendMessage, status } = chatCtx;

  // Handle transcript submission
  const handleSubmit = useCallback(
    (text: string) => {
      if (text.trim()) {
        void sendMessage(text);
      }
    },
    [sendMessage],
  );

  // Map chat status to voice state
  // When AI is processing/streaming, we want to show idle/processing state
  const voiceState = useMemo(() => {
    if (status === "streaming" || status === "submitted") {
      return "processing";
    }
    return "listening";
  }, [status]);

  // Determine if voice input should be paused
  // Pause when AI is actively processing to prevent interrupting the flow
  const isPaused = status === "streaming" || status === "submitted";

  return (
    <div className="flex-1 overflow-hidden relative">
      <VoiceInput
        key={voiceKey}
        state={voiceState}
        frequency={isPaused ? 0 : 50} // Reduce frequency when paused
        transcript=""
        isFinal={false}
        onClose={onSwitchToText}
        onSubmit={handleSubmit}
        className="h-full"
      />
    </div>
  );
}
