/**
 * FakeMouse Types
 * Type definitions for the virtual cursor automation component
 */

export interface FakeMousePosition {
  x: number;
  y: number;
}

export interface FakeMouseTheme {
  cursorColor?: string;
  cursorSize?: number;
  glowColor?: string;
  tooltipBackground?: string;
  tooltipTextColor?: string;
  tooltipBorder?: string;
  tooltipMaxWidth?: number;
}

export interface FakeMouseOptions {
  defaultMoveDuration?: number;
  defaultScrollDuration?: number;
  theme?: FakeMouseTheme;
}

export interface FakeMouseController {
  show: () => void;
  hide: () => void;
  moveTo: (x: number, y: number, duration?: number) => Promise<void>;
  click: (x: number, y: number) => Promise<void>;
  moveToElement: (
    element: Element,
    offsetX?: number,
    offsetY?: number,
  ) => Promise<void>;
  clickElement: (element: Element) => Promise<void>;
  scrollToElement: (element: Element) => Promise<void>;
  drag: (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    duration?: number,
  ) => Promise<void>;
  scrollTo: (targetY: number, duration?: number) => Promise<void>;
  setPosition: (x: number, y: number) => void;
  getPosition: () => FakeMousePosition;
  enableCenterMode: () => void;
  disableCenterMode: () => void;
  moveToCenter: () => void;
  playClickAnimation: () => Promise<void>;
  showTooltip: (text: string) => void;
  hideTooltip: () => void;
  updateTooltip: (text: string) => void;
  isVisible: boolean;
  position: FakeMousePosition;
}

export interface FakeMouseProps {
  options?: FakeMouseOptions;
  onReady?: (controller: FakeMouseController) => void;
}

export type AnimationSpeed = "slow" | "normal" | "fast";

export const DEFAULT_MOVE_DURATION = 800;
export const DEFAULT_SCROLL_DURATION = 800;

export const DEFAULT_THEME: Required<FakeMouseTheme> = {
  cursorColor: "#3B82F6",
  cursorSize: 48,
  glowColor: "#3B82F6",
  tooltipBackground: "rgba(0, 0, 0, 0.8)",
  tooltipTextColor: "white",
  tooltipBorder: "rgba(255, 255, 255, 0.1)",
  tooltipMaxWidth: 400,
};
