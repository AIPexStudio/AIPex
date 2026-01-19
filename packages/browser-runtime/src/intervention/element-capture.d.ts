/**
 * Element Capture Service
 *
 * Common element capture logic extracted from use-case
 * Provides reusable API for:
 * - Listening for user clicks on elements
 * - Collecting element metadata
 * - Generating selectors
 * - Screenshot functionality
 */
import type { ElementCaptureEvent, ElementCaptureOptions } from "./types.js";
type CaptureCallback = (event: ElementCaptureEvent) => void;
export declare class ElementCaptureService {
    private static instance;
    private isCapturing;
    private currentTabId;
    private captureCallback;
    private messageListener;
    private lastCaptureTimestamp;
    private constructor();
    static getInstance(): ElementCaptureService;
    /**
     * Start capturing elements
     */
    startCapture(options: ElementCaptureOptions, callback: CaptureCallback): Promise<void>;
    /**
     * Stop capturing elements
     */
    stopCapture(): Promise<void>;
    /**
     * Set up message listener
     */
    private setupMessageListener;
    /**
     * Handle capture event
     */
    private handleCaptureEvent;
    /**
     * Capture screenshot functionality (with highlight)
     */
    captureScreenshot(_selector: string, _options?: {
        cropToElement?: boolean;
        padding?: number;
    }): Promise<string | null>;
    /**
     * Cleanup resources
     */
    private cleanup;
    /**
     * Check if capture is active
     */
    isActive(): boolean;
    /**
     * Get current capturing tab ID
     */
    getCurrentTabId(): number | null;
}
export declare const elementCaptureService: ElementCaptureService;
export {};
