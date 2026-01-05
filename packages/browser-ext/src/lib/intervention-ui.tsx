/**
 * Intervention UI - Platform-specific integration for browser extension
 *
 * This component bridges the intervention system from @browser-runtime
 * with the UI components from @aipex-react, respecting package architecture.
 */

import {
  type InterventionMode,
  InterventionModeToggle,
  MonitorCard,
  SelectionCard,
  type SelectionOption,
  type UserSelectionResult,
  VoiceCard,
} from "@aipexstudio/aipex-react/components/intervention";
import {
  type InterventionEvent,
  type InterventionState,
  interventionManager,
  selectionManager,
} from "@aipexstudio/browser-runtime";
import { useEffect, useState } from "react";

interface InterventionUIProps {
  mode: InterventionMode;
  onModeChange: (mode: InterventionMode) => void;
}

export function InterventionUI({ mode }: InterventionUIProps) {
  const [currentIntervention, setCurrentIntervention] =
    useState<InterventionState | null>(null);

  useEffect(() => {
    const initializeIntervention = async () => {
      try {
        await interventionManager.initialize();
        interventionManager.setConversationMode(mode);
        console.log("✅ Intervention manager initialized with mode:", mode);
      } catch (error) {
        console.error("❌ Failed to initialize intervention manager:", error);
      }
    };

    void initializeIntervention();

    const updateInterventionState = () => {
      setCurrentIntervention(interventionManager.getCurrentIntervention());
    };

    const handleInterventionStart = (event: InterventionEvent) => {
      if (
        event.data &&
        typeof event.data === "object" &&
        "state" in event.data
      ) {
        setCurrentIntervention(event.data.state as InterventionState);
      } else {
        updateInterventionState();
      }
    };

    const handleInterventionComplete = () => {
      updateInterventionState();
      setTimeout(() => setCurrentIntervention(null), 3000);
    };

    const handleInterventionCancel = () => {
      setCurrentIntervention(null);
    };

    const handleInterventionTimeout = () => {
      updateInterventionState();
      setTimeout(() => setCurrentIntervention(null), 3000);
    };

    const handleInterventionError = () => {
      const current = interventionManager.getCurrentIntervention();
      if (current) {
        setCurrentIntervention(current);
        setTimeout(() => setCurrentIntervention(null), 3000);
      } else {
        setCurrentIntervention(null);
      }
    };

    interventionManager.addEventListener("start", handleInterventionStart);
    interventionManager.addEventListener(
      "complete",
      handleInterventionComplete,
    );
    interventionManager.addEventListener("cancel", handleInterventionCancel);
    interventionManager.addEventListener("timeout", handleInterventionTimeout);
    interventionManager.addEventListener("error", handleInterventionError);

    return () => {
      interventionManager.removeEventListener("start", handleInterventionStart);
      interventionManager.removeEventListener(
        "complete",
        handleInterventionComplete,
      );
      interventionManager.removeEventListener(
        "cancel",
        handleInterventionCancel,
      );
      interventionManager.removeEventListener(
        "timeout",
        handleInterventionTimeout,
      );
      interventionManager.removeEventListener("error", handleInterventionError);
    };
  }, [mode]);

  useEffect(() => {
    if (mode) {
      interventionManager.setConversationMode(mode);
      console.log("🔄 Intervention mode updated:", mode);
    }
  }, [mode]);

  if (!currentIntervention) {
    return null;
  }

  return (
    <div className="px-4 py-3">
      {currentIntervention.request.type === "voice-input" ? (
        <VoiceCard
          status={currentIntervention.status}
          reason={currentIntervention.request.reason}
          timeout={currentIntervention.request.timeout}
          onCancel={() =>
            interventionManager.cancelIntervention(
              currentIntervention.request.id,
            )
          }
        />
      ) : currentIntervention.request.type === "monitor-operation" ? (
        <MonitorCard
          status={currentIntervention.status}
          reason={currentIntervention.request.reason}
          timeout={currentIntervention.request.timeout}
          onCancel={() =>
            interventionManager.cancelIntervention(
              currentIntervention.request.id,
            )
          }
        />
      ) : currentIntervention.request.type === "user-selection" ? (
        <SelectionCard
          status={currentIntervention.status}
          question={
            (currentIntervention.request.params as { question?: string })
              ?.question || ""
          }
          options={
            ((currentIntervention.request.params as { options?: unknown[] })
              ?.options || []) as SelectionOption[]
          }
          mode={
            (
              currentIntervention.request.params as {
                mode?: "single" | "multiple";
              }
            )?.mode || "single"
          }
          allowOther={
            (currentIntervention.request.params as { allowOther?: boolean })
              ?.allowOther || false
          }
          reason={currentIntervention.request.reason}
          timeout={currentIntervention.request.timeout}
          selectedResult={
            currentIntervention.result?.data as UserSelectionResult | undefined
          }
          onConfirm={(result) => {
            console.log("[InterventionUI] Selection confirmed:", result);
            selectionManager.completeSelection(result);
          }}
          onCancel={() =>
            interventionManager.cancelIntervention(
              currentIntervention.request.id,
            )
          }
        />
      ) : null}
    </div>
  );
}

export function InterventionModeToggleHeader({
  mode,
  onModeChange,
}: InterventionUIProps) {
  const handleModeChange = (newMode: InterventionMode) => {
    interventionManager.setConversationMode(newMode);
    onModeChange(newMode);
  };

  return <InterventionModeToggle mode={mode} onChange={handleModeChange} />;
}
