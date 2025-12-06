import type { ContextProvider } from "@aipexstudio/aipex-core";
import type { BrowserAutomationHost } from "./browser-automation-host.js";
import type { InterventionHost } from "./intervention-host.js";
import type { OmniAction, OmniActionRegistry } from "./omni-action-registry.js";
import type { RuntimeAddon } from "./runtime-addon.js";
import type { RuntimeBroadcastMessage } from "./types.js";

const UNSUPPORTED = "Not supported in this runtime";

export class NoopBrowserAutomationHost implements BrowserAutomationHost {
  private addons = new Map<string, RuntimeAddon>();

  registerAddon(addon: RuntimeAddon): () => void {
    this.addons.set(addon.id, addon);
    void addon.initialize?.();
    return () => this.addons.delete(addon.id);
  }

  async attachDebugger(): Promise<void> {
    throw new Error(UNSUPPORTED);
  }

  async detachDebugger(): Promise<void> {
    throw new Error(UNSUPPORTED);
  }

  async startCapture(): Promise<never> {
    throw new Error(UNSUPPORTED);
  }

  async captureSnapshot(): Promise<never> {
    throw new Error(UNSUPPORTED);
  }

  async restoreCapture(): Promise<void> {
    throw new Error(UNSUPPORTED);
  }

  async broadcastToTabs<TPayload>(
    _message: RuntimeBroadcastMessage<TPayload>,
  ): Promise<void> {
    throw new Error(UNSUPPORTED);
  }
}

export class InMemoryOmniActionRegistry implements OmniActionRegistry {
  private actions = new Map<string, OmniAction>();

  register(action: OmniAction): () => void {
    if (this.actions.has(action.id)) {
      throw new Error(`Omni action ${action.id} already registered`);
    }
    this.actions.set(action.id, action);
    return () => this.actions.delete(action.id);
  }

  list(): OmniAction[] {
    return Array.from(this.actions.values()).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
  }

  findById(id: string): OmniAction | undefined {
    return this.actions.get(id);
  }

  async execute(id: string): Promise<void> {
    const action = this.actions.get(id);
    if (!action) {
      throw new Error(`Omni action ${id} not registered`);
    }
    await action.handler({ metadata: {} });
  }
}

export class NullInterventionHost implements InterventionHost {
  async list() {
    return [];
  }

  async request(): Promise<never> {
    throw new Error("Interventions are not supported in this runtime");
  }
}

export class NoopContextProvider implements ContextProvider {
  id = "noop";
  name = "Noop Provider";
  description = "Placeholder context provider";
  capabilities = {
    canList: false,
    canSearch: false,
    canWatch: false,
    types: [],
  };

  async getContext(_id: string) {
    return null;
  }

  async getContexts() {
    return [];
  }
}
