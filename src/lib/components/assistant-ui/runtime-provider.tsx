import { AssistantRuntimeProvider } from "@assistant-ui/react";
import type { FC, ReactNode } from "react";

interface AIPexRuntimeProviderProps {
  children: ReactNode;
}

export const AIPexRuntimeProvider: FC<AIPexRuntimeProviderProps> = ({ children }) => {
  // 暂时直接渲染children，稍后我们会集成完整的runtime
  return <>{children}</>;
};
