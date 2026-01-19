/**
 * Claude-style Computer Tool Implementation
 *
 * Unified tool for visual/coordinate-based browser interaction.
 * Coordinates are in screenshot pixel space and mapped to viewport CSS pixels.
 *
 * Coordinate mapping:
 * - xCss = (x / imageWidth) * viewportWidth
 * - yCss = (y / imageHeight) * viewportHeight
 */
interface ScreenshotMetadata {
    imageWidth: number;
    imageHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    timestamp: number;
    tabId: number;
}
/**
 * Cache screenshot metadata for a tab
 * Called by capture_screenshot/capture_tab_screenshot when sendToLLM=true
 * This allows the computer tool to map screenshot pixel coordinates to viewport CSS pixels
 */
export declare function cacheScreenshotMetadata(tabId: number, imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number): void;
type ComputerAction = "left_click" | "right_click" | "type" | "wait" | "scroll" | "key" | "left_click_drag" | "double_click" | "triple_click" | "scroll_to" | "hover";
export interface ComputerParams {
    action: ComputerAction;
    coordinate?: [number, number];
    text?: string;
    start_coordinate?: [number, number];
    scroll_direction?: "up" | "down" | "left" | "right";
    scroll_amount?: number;
    duration?: number;
    tabId?: number;
    uid?: string;
}
interface ComputerResult {
    success: boolean;
    message?: string;
    error?: string;
    coordinates?: {
        xCss: number;
        yCss: number;
    };
}
/**
 * Main computer action dispatcher
 */
export declare function executeComputerAction(params: ComputerParams): Promise<ComputerResult>;
/**
 * Clear screenshot cache for a tab
 */
export declare function clearScreenshotCache(tabId?: number): void;
/**
 * Get cached screenshot metadata for a tab
 */
export declare function getScreenshotMetadata(tabId: number): ScreenshotMetadata | undefined;
export {};
