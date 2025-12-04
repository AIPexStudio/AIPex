/**
 * useFakeMouse Hook
 * React hook for imperative control of the FakeMouse component
 */

import { useEffect, useRef, useState } from "react";
import type {
  FakeMouseController,
  FakeMouseOptions,
} from "../components/fake-mouse/types";
import { FakeMouseControllerImpl } from "../lib/fake-mouse-controller";

export function useFakeMouse(options?: FakeMouseOptions): FakeMouseController {
  const controllerRef = useRef<FakeMouseControllerImpl | null>(null);
  const [, forceUpdate] = useState({});

  if (!controllerRef.current) {
    controllerRef.current = new FakeMouseControllerImpl(options);
  }

  useEffect(() => {
    const controller = controllerRef.current!;
    const unsubscribe = controller.subscribe(() => {
      forceUpdate({});
    });

    return () => {
      unsubscribe();
      controller.destroy();
    };
  }, []);

  const controller = controllerRef.current;
  const state = controller.getState();

  return {
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
  };
}
