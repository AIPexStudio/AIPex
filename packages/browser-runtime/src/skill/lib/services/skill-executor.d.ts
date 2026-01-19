type ToolDefinition = {
    name: string;
    description: string;
    inputSchema: any;
    handler: (args: any) => Promise<any>;
};
export declare class SkillExecutor {
    private registeredTools;
    private initialized;
    initialize(): Promise<void>;
    executeScript(skillName: string, scriptPath: string, args?: any): Promise<any>;
    getRegisteredTools(): ToolDefinition[];
    getTool(name: string): ToolDefinition | undefined;
    executeTool(name: string, args: any): Promise<any>;
    destroy(): Promise<void>;
    /**
     * Execute code in QuickJS VM
     */
    private executeInVM;
}
export declare const skillExecutor: SkillExecutor;
export {};
