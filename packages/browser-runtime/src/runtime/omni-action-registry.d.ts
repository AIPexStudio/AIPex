export interface OmniActionContext {
  tabId?: number;
  windowId?: number;
  metadata?: Record<string, unknown>;
}
export interface OmniAction {
  id: string;
  title: string;
  description?: string;
  shortcut?: string[];
  icon?: string;
  category?: string;
  order?: number;
  handler: (ctx: OmniActionContext) => Promise<void> | void;
  isAvailable?: (ctx: OmniActionContext) => Promise<boolean> | boolean;
}
export interface OmniActionRegistry {
  register(action: OmniAction): () => void;
  list(): OmniAction[];
  findById(id: string): OmniAction | undefined;
  execute(id: string, ctx?: OmniActionContext): Promise<void>;
}
