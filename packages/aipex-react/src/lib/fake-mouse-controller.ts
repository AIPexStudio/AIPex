/**
 * FakeMouse Controller
 * Core logic for virtual cursor automation (platform-agnostic)
 */

import type {
  FakeMouseOptions,
  FakeMousePosition,
  FakeMouseTheme,
} from "../components/fake-mouse/types";
import {
  DEFAULT_MOVE_DURATION,
  DEFAULT_SCROLL_DURATION,
  DEFAULT_THEME,
} from "../components/fake-mouse/types";

export interface FakeMouseState {
  position: FakeMousePosition;
  isVisible: boolean;
  centerMode: boolean;
  isOperating: boolean;
  tooltip: {
    text: string | null;
    visible: boolean;
    startTime: number | null;
    dismissed: boolean;
  };
}

export type FakeMouseStateListener = (state: FakeMouseState) => void;

export class FakeMouseControllerImpl {
  private state: FakeMouseState = {
    position: { x: 0, y: 0 },
    isVisible: false,
    centerMode: false,
    isOperating: false,
    tooltip: {
      text: null,
      visible: false,
      startTime: null,
      dismissed: false,
    },
  };

  private listeners: Set<FakeMouseStateListener> = new Set();
  private options: {
    defaultMoveDuration: number;
    defaultScrollDuration: number;
    theme: Required<FakeMouseTheme>;
  };
  private tooltipTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(options: FakeMouseOptions = {}) {
    const theme: Required<FakeMouseTheme> = {
      cursorColor: options.theme?.cursorColor ?? DEFAULT_THEME.cursorColor,
      cursorSize: options.theme?.cursorSize ?? DEFAULT_THEME.cursorSize,
      glowColor: options.theme?.glowColor ?? DEFAULT_THEME.glowColor,
      tooltipBackground:
        options.theme?.tooltipBackground ?? DEFAULT_THEME.tooltipBackground,
      tooltipTextColor:
        options.theme?.tooltipTextColor ?? DEFAULT_THEME.tooltipTextColor,
      tooltipBorder:
        options.theme?.tooltipBorder ?? DEFAULT_THEME.tooltipBorder,
      tooltipMaxWidth:
        options.theme?.tooltipMaxWidth ?? DEFAULT_THEME.tooltipMaxWidth,
    };

    this.options = {
      defaultMoveDuration: options.defaultMoveDuration ?? DEFAULT_MOVE_DURATION,
      defaultScrollDuration:
        options.defaultScrollDuration ?? DEFAULT_SCROLL_DURATION,
      theme,
    };
  }

  subscribe(listener: FakeMouseStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private updateState(updates: Partial<FakeMouseState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  getState(): FakeMouseState {
    return this.state;
  }

  getTheme(): Required<FakeMouseTheme> {
    return this.options.theme;
  }

  show(): void {
    this.updateState({ isVisible: true });
  }

  hide(): void {
    this.updateState({ isVisible: false });
  }

  setPosition(x: number, y: number): void {
    this.updateState({ position: { x, y } });
  }

  getPosition(): FakeMousePosition {
    return this.state.position;
  }

  async moveTo(x: number, y: number, duration?: number): Promise<void> {
    if (!this.state.isVisible) return;

    const moveDuration = duration ?? this.options.defaultMoveDuration;
    const startX = this.state.position.x;
    const startY = this.state.position.y;
    const deltaX = x - startX;
    const deltaY = y - startY;
    const startTime = performance.now();

    this.updateState({ isOperating: true });

    await new Promise<void>((resolve) => {
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / moveDuration, 1);

        const eased =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - (-2 * progress + 2) ** 2 / 2;

        const currentX = startX + deltaX * eased;
        const currentY = startY + deltaY * eased;

        this.setPosition(currentX, currentY);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });

    this.updateState({ isOperating: false });
  }

  async click(x: number, y: number): Promise<void> {
    await this.moveTo(x, y);
    await this.playClickAnimation();

    if (this.state.centerMode) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      await this.moveTo(centerX, centerY);
    }
  }

  async moveToElement(
    element: Element,
    offsetX: number = 0,
    offsetY: number = 0,
  ): Promise<void> {
    const rect = element.getBoundingClientRect();
    const elementCenterX = rect.left + rect.width / 2 + offsetX;
    const elementCenterY = rect.top + rect.height / 2 + offsetY;

    const cursorTipOffsetX = 14;
    const cursorTipOffsetY = 18;

    await this.moveTo(
      elementCenterX + cursorTipOffsetX,
      elementCenterY + cursorTipOffsetY,
    );
  }

  async clickElement(element: Element): Promise<void> {
    await this.moveToElement(element);
    await this.click(this.state.position.x, this.state.position.y);
  }

  async scrollToElement(element: Element): Promise<void> {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.moveToElement(element);
  }

  async drag(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    duration?: number,
  ): Promise<void> {
    await this.moveTo(fromX, fromY);
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.updateState({ isOperating: true });
    await this.moveTo(toX, toY, duration);
    await new Promise((resolve) => setTimeout(resolve, 150));
    this.updateState({ isOperating: false });
  }

  async scrollTo(targetY: number, duration?: number): Promise<void> {
    const scrollDuration = duration ?? this.options.defaultScrollDuration;
    const startY = window.scrollY;
    const deltaY = targetY - startY;
    const startTime = performance.now();

    return new Promise((resolve) => {
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / scrollDuration, 1);

        const eased =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - (-2 * progress + 2) ** 2 / 2;

        window.scrollTo(0, startY + deltaY * eased);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  moveToCenter(): void {
    if (this.state.centerMode) return;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    this.setPosition(centerX, centerY);
  }

  enableCenterMode(): void {
    this.show();
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    this.setPosition(centerX, centerY);
    this.updateState({ centerMode: true });
  }

  disableCenterMode(): void {
    this.updateState({ centerMode: false });
    this.hideTooltip();
    this.hide();
  }

  async playClickAnimation(): Promise<void> {
    this.updateState({ isOperating: true });
    await new Promise((resolve) => setTimeout(resolve, 350));
    this.updateState({ isOperating: false });
  }

  private getFirstTwoSentences(text: string): string {
    if (!text || text.trim().length === 0) return text;

    const sentencePattern = /([。！？；.!?;]\s*|\n+)/g;
    const matches = [...text.matchAll(sentencePattern)];

    if (matches.length < 2) return text;

    const secondSentenceEnd = matches[1].index! + matches[1][0].length;
    return text.substring(0, secondSentenceEnd).trim();
  }

  showTooltip(text: string): void {
    if (this.tooltipTimeoutId) {
      clearTimeout(this.tooltipTimeoutId);
      this.tooltipTimeoutId = null;
    }

    const truncatedText = this.getFirstTwoSentences(text);

    this.updateState({
      tooltip: {
        text: truncatedText,
        visible: true,
        startTime: Date.now(),
        dismissed: false,
      },
    });

    this.tooltipTimeoutId = setTimeout(() => {
      this.hideTooltip();
      this.tooltipTimeoutId = null;
    }, 5000);
  }

  hideTooltip(): void {
    if (this.tooltipTimeoutId) {
      clearTimeout(this.tooltipTimeoutId);
      this.tooltipTimeoutId = null;
    }

    this.updateState({
      tooltip: {
        text: null,
        visible: false,
        startTime: null,
        dismissed: true,
      },
    });
  }

  updateTooltip(text: string): void {
    if (this.state.tooltip.dismissed) return;

    if (this.state.tooltip.startTime !== null) {
      const elapsed = Date.now() - this.state.tooltip.startTime;
      const remainingTime = 5000 - elapsed;

      if (remainingTime <= 0) {
        this.hideTooltip();
        return;
      }

      if (this.tooltipTimeoutId) {
        clearTimeout(this.tooltipTimeoutId);
        this.tooltipTimeoutId = null;
      }

      const truncatedText = this.getFirstTwoSentences(text);

      this.updateState({
        tooltip: {
          ...this.state.tooltip,
          text: truncatedText,
        },
      });

      this.tooltipTimeoutId = setTimeout(() => {
        this.hideTooltip();
        this.tooltipTimeoutId = null;
      }, remainingTime);
    } else if (!this.state.tooltip.dismissed) {
      this.showTooltip(text);
    }
  }

  destroy(): void {
    if (this.tooltipTimeoutId) {
      clearTimeout(this.tooltipTimeoutId);
    }
    this.listeners.clear();
  }
}
