/**
 * InterventionMode Context
 * Provides intervention mode state across the browser extension chat UI
 */

import type { InterventionMode } from "@aipexstudio/aipex-react/components/intervention";
import { createContext, useContext, type ReactNode } from "react";

interface InterventionModeContextValue {
  mode: InterventionMode;
  setMode: (mode: InterventionMode) => void;
}

const InterventionModeContext = createContext<InterventionModeContextValue | null>(
  null
);

export interface InterventionModeProviderProps {
  mode: InterventionMode;
  setMode: (mode: InterventionMode) => void;
  children: ReactNode;
}

export function InterventionModeProvider({
  mode,
  setMode,
  children,
}: InterventionModeProviderProps) {
  return (
    <InterventionModeContext.Provider value={{ mode, setMode }}>
      {children}
    </InterventionModeContext.Provider>
  );
}

export function useInterventionMode(): InterventionModeContextValue {
  const context = useContext(InterventionModeContext);
  if (!context) {
    throw new Error(
      "useInterventionMode must be used within InterventionModeProvider"
    );
  }
  return context;
}
