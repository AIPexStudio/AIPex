/**
 * User Selection Intervention
 *
 * Let users choose one or more answers from multiple options
 */
import type { InterventionImplementation, UserSelectionResult } from "../types.js";
/**
 * Selection Manager
 * Manages selection requests and callbacks
 * Simplified design: one selection request at a time
 */
declare class SelectionManager {
    private static instance;
    private currentRequest;
    static getInstance(): SelectionManager;
    /**
     * Create a new selection request
     */
    createRequest(): Promise<UserSelectionResult>;
    /**
     * Complete selection (called by UI component)
     */
    completeSelection(result: UserSelectionResult): void;
    /**
     * Cancel selection (called by UI component or timeout)
     */
    cancelSelection(error: Error): void;
    /**
     * Cleanup request
     */
    cleanup(): void;
}
export declare const selectionManager: SelectionManager;
export declare const userSelectionIntervention: InterventionImplementation;
export {};
