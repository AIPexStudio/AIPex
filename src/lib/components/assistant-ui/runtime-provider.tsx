import { AssistantRuntimeProvider } from "@assistant-ui/react";
import type { FC, ReactNode } from "react";

interface AIPexRuntimeProviderProps {
  children: ReactNode;
}

export const AIPexRuntimeProvider: FC<AIPexRuntimeProviderProps> = ({ children }) => {
  // Temporarily render children directly, will integrate full runtime later
  return <>{children}</>;
};
