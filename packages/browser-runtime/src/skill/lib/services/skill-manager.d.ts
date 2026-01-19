import type { ParsedSkill, SkillMetadata } from "../../skill/types.js";
export interface SkillManagerConfig {
    autoLoadEnabledSkills?: boolean;
    maxConcurrentExecutions?: number;
    scriptTimeout?: number;
}
export type SkillEventType = "skill_loaded" | "skill_unloaded" | "skill_enabled" | "skill_disabled";
type SkillSubscriber = (data: any) => void;
export declare class SkillManager {
    private config;
    private loadedSkills;
    private initialized;
    private subscribers;
    constructor(config?: SkillManagerConfig);
    subscribe(event: SkillEventType, callback: SkillSubscriber): () => void;
    unsubscribe(event: SkillEventType, callback: SkillSubscriber): void;
    private _emit;
    initialize(): Promise<void>;
    uploadSkill(zipFile: File, replace?: boolean): Promise<SkillMetadata>;
    loadSkill(skillId: string): Promise<void>;
    unloadSkill(skillId: string): Promise<void>;
    executeSkillScript(skillName: string, scriptPath: string, args?: any): Promise<any>;
    getSkillContent(skillName: string): Promise<string>;
    getSkill(skillName: string): Promise<ParsedSkill | null>;
    getSkillReference(skillName: string, refPath: string): Promise<string>;
    getSkillScript(skillName: string, scriptPath: string): Promise<string>;
    getSkillAsset(skillName: string, assetPath: string): Promise<string | ArrayBuffer | null>;
    getSkillSummaries(): string;
    getAllSkills(): SkillMetadata[];
    enableSkill(skillId: string): Promise<void>;
    disableSkill(skillId: string): Promise<void>;
    deleteSkill(skillId: string): Promise<void>;
    getRegisteredTools(): any[];
    executeTool(toolName: string, args: any): Promise<any>;
    isInitialized(): boolean;
    getLoadedSkills(): string[];
    private ensureInitialized;
    private loadBuiltinSkillCreator;
    private loadEnabledSkills;
    /**
     * Load built-in UX Audit Walkthrough skill (disabled by default)
     */
    private loadBuiltinUxAuditWalkthrough;
    /**
     * Load built-in WCAG 2.2 Accessibility Audit skill (enabled by default)
     */
    private loadBuiltinWcag22A11yAudit;
}
export declare const skillManager: SkillManager;
export {};
