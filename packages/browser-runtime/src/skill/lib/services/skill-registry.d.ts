import { type ParsedSkill, type SkillMetadata } from "../storage/skill-storage";
export interface SkillSummary {
  name: string;
  description: string;
  enabled: boolean;
}
export declare class SkillRegistry {
  private skills;
  private initialized;
  initialize(skillMetadataList: SkillMetadata[]): Promise<void>;
  parseSkillMetadata(markdown: string): Partial<SkillMetadata>;
  getSkillSummaries(): string;
  getSkillContent(skillName: string): Promise<string>;
  getSkillReference(skillName: string, refPath: string): Promise<string>;
  getSkillScript(skillName: string, scriptPath: string): Promise<string>;
  getSkillAsset(
    skillName: string,
    assetPath: string,
  ): Promise<string | ArrayBuffer | null>;
  getAllSkills(): SkillSummary[];
  getSkill(skillName: string): ParsedSkill | null;
  addSkill(skill: ParsedSkill): void;
  removeSkill(skillName: string): boolean;
  updateSkill(skillName: string, updates: Partial<ParsedSkill>): boolean;
  updateSkillStatus(skillName: string, enabled: boolean): boolean;
  isInitialized(): boolean;
}
export declare const skillRegistry: SkillRegistry;
