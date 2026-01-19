import type { ContextProvider } from "@aipexstudio/aipex-core";
import type { BrowserAutomationHost } from "./browser-automation-host.js";
import type { InterventionHost } from "./intervention-host.js";
import type { OmniAction, OmniActionRegistry } from "./omni-action-registry.js";
import type { RuntimeAddon } from "./runtime-addon.js";
import type { RuntimeBroadcastMessage } from "./types.js";
export declare class NoopBrowserAutomationHost implements BrowserAutomationHost {
    private addons;
    registerAddon(addon: RuntimeAddon): () => void;
    attachDebugger(): Promise<void>;
    detachDebugger(): Promise<void>;
    startCapture(): Promise<never>;
    captureSnapshot(): Promise<never>;
    restoreCapture(): Promise<void>;
    broadcastToTabs<TPayload>(_message: RuntimeBroadcastMessage<TPayload>): Promise<void>;
}
export declare class InMemoryOmniActionRegistry implements OmniActionRegistry {
    private actions;
    register(action: OmniAction): () => void;
    list(): OmniAction[];
    findById(id: string): OmniAction | undefined;
    execute(id: string): Promise<void>;
}
export declare class NullInterventionHost implements InterventionHost {
    list(): Promise<never[]>;
    request(): Promise<never>;
}
export declare class NoopContextProvider implements ContextProvider {
    id: string;
    name: string;
    description: string;
    capabilities: {
        canList: boolean;
        canSearch: boolean;
        canWatch: boolean;
        types: never[];
    };
    getContext(_id: string): Promise<null>;
    getContexts(): Promise<never[]>;
}
