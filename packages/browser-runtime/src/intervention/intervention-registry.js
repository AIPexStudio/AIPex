/**
 * Intervention Registry
 *
 * Manages all available intervention implementations
 * Similar to skill-registry design pattern
 */
export class InterventionRegistry {
  static instance;
  interventions = new Map();
  initialized = false;
  static getInstance() {
    if (!InterventionRegistry.instance) {
      InterventionRegistry.instance = new InterventionRegistry();
    }
    return InterventionRegistry.instance;
  }
  /**
   * Initialize the registry
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    console.log("🔧 [InterventionRegistry] Initializing...");
    // Dynamically import intervention implementations
    try {
      const { monitorOperationIntervention } = await import(
        "./implementations/monitor-operation.js"
      );
      this.register(monitorOperationIntervention);
      console.log("✅ [InterventionRegistry] Registered monitor-operation");
      const { voiceInputIntervention } = await import(
        "./implementations/voice-input.js"
      );
      this.register(voiceInputIntervention);
      console.log("✅ [InterventionRegistry] Registered voice-input");
      const { userSelectionIntervention } = await import(
        "./implementations/user-selection.js"
      );
      this.register(userSelectionIntervention);
      console.log("✅ [InterventionRegistry] Registered user-selection");
      this.initialized = true;
      console.log("✅ [InterventionRegistry] Initialized successfully");
    } catch (error) {
      console.error("❌ [InterventionRegistry] Failed to initialize:", error);
      throw error;
    }
  }
  /**
   * Register an intervention
   */
  register(implementation) {
    const { metadata } = implementation;
    if (this.interventions.has(metadata.type)) {
      console.warn(
        `[InterventionRegistry] Intervention '${metadata.type}' already registered, overwriting`,
      );
    }
    this.interventions.set(metadata.type, implementation);
    console.log(
      `[InterventionRegistry] Registered intervention: ${metadata.name}`,
    );
  }
  /**
   * Get an intervention implementation
   */
  get(type) {
    return this.interventions.get(type) || null;
  }
  /**
   * Get all intervention metadata
   */
  getAllMetadata(enabledOnly = false) {
    const metadataList = Array.from(this.interventions.values()).map(
      (impl) => impl.metadata,
    );
    return enabledOnly ? metadataList.filter((m) => m.enabled) : metadataList;
  }
  /**
   * Get specific intervention metadata
   */
  getMetadata(type) {
    const impl = this.interventions.get(type);
    return impl ? impl.metadata : null;
  }
  /**
   * Check if an intervention is available
   */
  isAvailable(type) {
    const impl = this.interventions.get(type);
    return impl ? impl.metadata.enabled : false;
  }
  /**
   * Execute an intervention
   */
  async execute(type, params, signal) {
    const impl = this.interventions.get(type);
    if (!impl) {
      throw new Error(`Intervention '${type}' not found`);
    }
    if (!impl.metadata.enabled) {
      throw new Error(`Intervention '${type}' is disabled`);
    }
    console.log(`[InterventionRegistry] Executing intervention: ${type}`);
    return impl.execute(params, signal);
  }
  /**
   * Check if the registry is initialized
   */
  isInitialized() {
    return this.initialized;
  }
}
// Export singleton instance
export const interventionRegistry = InterventionRegistry.getInstance();
