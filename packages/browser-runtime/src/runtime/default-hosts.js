const UNSUPPORTED = "Not supported in this runtime";
export class NoopBrowserAutomationHost {
    addons = new Map();
    registerAddon(addon) {
        this.addons.set(addon.id, addon);
        void addon.initialize?.();
        return () => this.addons.delete(addon.id);
    }
    async attachDebugger() {
        throw new Error(UNSUPPORTED);
    }
    async detachDebugger() {
        throw new Error(UNSUPPORTED);
    }
    async startCapture() {
        throw new Error(UNSUPPORTED);
    }
    async captureSnapshot() {
        throw new Error(UNSUPPORTED);
    }
    async restoreCapture() {
        throw new Error(UNSUPPORTED);
    }
    async broadcastToTabs(_message) {
        throw new Error(UNSUPPORTED);
    }
}
export class InMemoryOmniActionRegistry {
    actions = new Map();
    register(action) {
        if (this.actions.has(action.id)) {
            throw new Error(`Omni action ${action.id} already registered`);
        }
        this.actions.set(action.id, action);
        return () => this.actions.delete(action.id);
    }
    list() {
        return Array.from(this.actions.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    findById(id) {
        return this.actions.get(id);
    }
    async execute(id) {
        const action = this.actions.get(id);
        if (!action) {
            throw new Error(`Omni action ${id} not registered`);
        }
        await action.handler({ metadata: {} });
    }
}
export class NullInterventionHost {
    async list() {
        return [];
    }
    async request() {
        throw new Error("Interventions are not supported in this runtime");
    }
}
export class NoopContextProvider {
    id = "noop";
    name = "Noop Provider";
    description = "Placeholder context provider";
    capabilities = {
        canList: false,
        canSearch: false,
        canWatch: false,
        types: [],
    };
    async getContext(_id) {
        return null;
    }
    async getContexts() {
        return [];
    }
}
