/**
 * Breathing Border Overlay Component
 * 全屏梦幻呼吸灯边框效果，在AI对话进行时显示
 */

import type React from "react";

interface BreathingBorderOverlayProps {
  isVisible: boolean;
}

export const BreathingBorderOverlay: React.FC<BreathingBorderOverlayProps> = ({
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <>
      {/* 全屏发光容器 - 从外向里的呼吸效果 */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 999998,
          pointerEvents: "none",
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.5s ease-in-out",
          animation: "breatheInwardGlow 2.5s ease-in-out infinite",
          boxShadow: `
            inset 0 0 15px 3px rgba(37, 99, 235, 0.5),
            inset 0 0 25px 5px rgba(59, 130, 246, 0.4),
            inset 0 0 35px 7px rgba(96, 165, 250, 0.3),
            inset 0 0 45px 9px rgba(147, 197, 253, 0.2)
          `,
        }}
      />

      {/* CSS 动画 */}
      <style>{`
        @keyframes breatheInwardGlow {
          0%, 100% {
            box-shadow: 
              inset 0 0 12px 3px rgba(37, 99, 235, 0.35),
              inset 0 0 20px 5px rgba(59, 130, 246, 0.28),
              inset 0 0 28px 6px rgba(96, 165, 250, 0.22),
              inset 0 0 35px 8px rgba(147, 197, 253, 0.15);
          }
          50% {
            box-shadow: 
              inset 0 0 20px 5px rgba(37, 99, 235, 0.7),
              inset 0 0 30px 7px rgba(59, 130, 246, 0.6),
              inset 0 0 40px 9px rgba(96, 165, 250, 0.5),
              inset 0 0 50px 11px rgba(147, 197, 253, 0.35);
          }
        }
      `}</style>
    </>
  );
};
