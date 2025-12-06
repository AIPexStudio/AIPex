/**
 * FakeMouse Component
 * Virtual cursor component with smooth animations using framer-motion
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  FakeMouseControllerImpl,
  type FakeMouseState,
} from "../../lib/fake-mouse-controller";
import type { FakeMouseProps } from "./types";

export function FakeMouse({ options, onReady }: FakeMouseProps) {
  const [controller] = useState(() => new FakeMouseControllerImpl(options));
  const [state, setState] = useState<FakeMouseState>(controller.getState());
  const theme = controller.getTheme();

  useEffect(() => {
    const unsubscribe = controller.subscribe(setState);
    return () => {
      unsubscribe();
      controller.destroy();
    };
  }, [controller]);

  useEffect(() => {
    if (onReady) {
      onReady({
        show: () => controller.show(),
        hide: () => controller.hide(),
        moveTo: (x, y, duration) => controller.moveTo(x, y, duration),
        click: (x, y) => controller.click(x, y),
        moveToElement: (element, offsetX, offsetY) =>
          controller.moveToElement(element, offsetX, offsetY),
        clickElement: (element) => controller.clickElement(element),
        scrollToElement: (element) => controller.scrollToElement(element),
        drag: (fromX, fromY, toX, toY, duration) =>
          controller.drag(fromX, fromY, toX, toY, duration),
        scrollTo: (targetY, duration) => controller.scrollTo(targetY, duration),
        setPosition: (x, y) => controller.setPosition(x, y),
        getPosition: () => controller.getPosition(),
        enableCenterMode: () => controller.enableCenterMode(),
        disableCenterMode: () => controller.disableCenterMode(),
        moveToCenter: () => controller.moveToCenter(),
        playClickAnimation: () => controller.playClickAnimation(),
        showTooltip: (text) => controller.showTooltip(text),
        hideTooltip: () => controller.hideTooltip(),
        updateTooltip: (text) => controller.updateTooltip(text),
        isVisible: state.isVisible,
        position: state.position,
      });
    }
  }, [controller, onReady, state.isVisible, state.position]);

  if (!state.isVisible) return null;

  return createPortal(
    <>
      {/* Cursor */}
      <motion.div
        style={{
          position: "fixed",
          left: state.position.x,
          top: state.position.y,
          width: theme.cursorSize,
          height: theme.cursorSize,
          pointerEvents: "none",
          zIndex: 2147483647,
          transform: "translate(-50%, -50%)",
          filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))",
        }}
        animate={
          state.centerMode && !state.isOperating
            ? {
                y: [0, -10, 0],
                transition: {
                  duration: 1.8,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                },
              }
            : undefined
        }
      >
        {/* Click animation */}
        <AnimatePresence>
          {state.isOperating && (
            <motion.div
              key="click-scale"
              initial={{
                scale: 1,
                filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))",
              }}
              animate={{
                scale: [1, 0.85, 1.15, 1],
                filter: [
                  "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))",
                  `drop-shadow(0 2px 8px ${theme.glowColor}80) brightness(1.3)`,
                  `drop-shadow(0 0 16px ${theme.glowColor}E6) brightness(1.5)`,
                  "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))",
                ],
              }}
              exit={{ scale: 1 }}
              transition={{ duration: 0.35, times: [0, 0.29, 0.71, 1] }}
              style={{
                position: "absolute",
                inset: 0,
              }}
            >
              <CursorSVG
                color={theme.cursorColor}
                glowColor={theme.glowColor}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {!state.isOperating && (
          <CursorSVG color={theme.cursorColor} glowColor={theme.glowColor} />
        )}
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {state.tooltip.visible && state.tooltip.text && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 0.8, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              left: state.position.x + 30,
              top: state.position.y + 10,
              padding: "12px 16px",
              background: theme.tooltipBackground,
              color: theme.tooltipTextColor,
              fontSize: "13px",
              lineHeight: 1.6,
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
              borderRadius: "8px",
              pointerEvents: "none",
              zIndex: 2147483646,
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              maxWidth: theme.tooltipMaxWidth,
              maxHeight: 300,
              overflowY: "auto",
              boxShadow:
                "0 8px 24px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(12px)",
              border: `1px solid ${theme.tooltipBorder}`,
            }}
          >
            {state.tooltip.text}
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}

function CursorSVG({ color, glowColor }: { color: string; glowColor: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Virtual cursor"
    >
      <title>Virtual cursor</title>
      <defs>
        <linearGradient
          id="cursor-gradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.8 }} />
        </linearGradient>
        <radialGradient id="pulse-gradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: glowColor, stopOpacity: 1 }} />
          <stop
            offset="100%"
            style={{ stopColor: glowColor, stopOpacity: 0 }}
          />
        </radialGradient>
      </defs>

      {/* Outer glow ring */}
      <motion.circle
        cx="24"
        cy="24"
        fill="url(#pulse-gradient)"
        animate={{
          r: [18, 24, 18],
          opacity: [0.4, 0, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      {/* Middle glow ring */}
      <motion.circle
        cx="24"
        cy="24"
        fill={glowColor}
        animate={{
          r: [12, 18, 12],
          opacity: [0.5, 0.1, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      {/* Outer white border for visibility */}
      <path
        d="M10 6 L38 24 L24 26 L18 42 L10 6 Z"
        fill="white"
        stroke="white"
        strokeWidth="1"
      />

      {/* Main arrow with gradient */}
      <path
        d="M12 8 L36 24 L24 25.5 L19 40 L12 8 Z"
        fill="url(#cursor-gradient)"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Inner highlight for 3D effect */}
      <path
        d="M14 10 L30 22 L24 23 L20 34 L14 10 Z"
        fill="rgba(147, 197, 253, 0.5)"
        stroke="none"
      />
    </svg>
  );
}
