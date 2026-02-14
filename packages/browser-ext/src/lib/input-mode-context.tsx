/**
 * InputModeContext
 * Shared context for voice/text input mode toggle, persisted in chrome.storage.local.
 */

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type InputMode = "voice" | "text";

interface InputModeContextValue {
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
}

const InputModeContext = createContext<InputModeContextValue>({
  inputMode: "text",
  setInputMode: () => {},
});

const STORAGE_KEY = "aipex-input-mode";

export function InputModeProvider({ children }: { children: React.ReactNode }) {
  const [inputMode, setInputModeState] = useState<InputMode>("text");

  // Load persisted value on mount
  useEffect(() => {
    chrome.storage.local
      .get(STORAGE_KEY)
      .then((result) => {
        const stored = result[STORAGE_KEY];
        if (stored === "voice" || stored === "text") {
          setInputModeState(stored);
        }
      })
      .catch(() => {
        // storage may not be available yet
      });
  }, []);

  // Listen for external changes (e.g. another instance)
  useEffect(() => {
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === "local" && changes[STORAGE_KEY]) {
        const newValue = changes[STORAGE_KEY].newValue;
        if (newValue === "voice" || newValue === "text") {
          setInputModeState(newValue);
        }
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const setInputMode = useCallback((mode: InputMode) => {
    setInputModeState(mode);
    chrome.storage.local.set({ [STORAGE_KEY]: mode }).catch(() => {});
  }, []);

  return (
    <InputModeContext.Provider value={{ inputMode, setInputMode }}>
      {children}
    </InputModeContext.Provider>
  );
}

export function useInputMode() {
  return useContext(InputModeContext);
}
