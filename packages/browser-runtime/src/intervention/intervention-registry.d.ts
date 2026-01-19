/**
 * Intervention Registry
 *
 * Manages all available intervention implementations
 * Similar to skill-registry design pattern
 */
import type { InterventionImplementation, InterventionMetadata, InterventionType } from "./types.js";
export declare class InterventionRegistry {
    private static instance;
    private interventions;
    private initialized;
    private constructor();
    static getInstance(): InterventionRegistry;
    /**
     * Initialize the registry
     */
    initialize(): Promise<void>;
    /**
     * Register an intervention
     */
    register(implementation: InterventionImplementation): void;
    /**
     * Get an intervention implementation
     */
    get(type: InterventionType): InterventionImplementation | null;
    /**
     * Get all intervention metadata
     */
    getAllMetadata(enabledOnly?: boolean): InterventionMetadata[];
    /**
     * Get specific intervention metadata
     */
    getMetadata(type: InterventionType): InterventionMetadata | null;
    /**
     * Check if an intervention is available
     */
    isAvailable(type: InterventionType): boolean;
    /**
     * Execute an intervention
     */
    execute(type: InterventionType, params: unknown, signal: AbortSignal): Promise<unknown>;
    /**
     * Check if the registry is initialized
     */
    isInitialized(): boolean;
}
export declare const interventionRegistry: InterventionRegistry;
