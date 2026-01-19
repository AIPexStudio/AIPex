import { zenfs } from "../../../lib/vm/zenfs-manager";
import {
  type ParsedSkill,
  type SkillMetadata,
  skillStorage,
} from "../storage/skill-storage";
import {
  getSkillAssets,
  getSkillReferences,
  getSkillScripts,
} from "../utils/zip-utils";

export interface SkillSummary {
  name: string;
  description: string;
  enabled: boolean;
}

export class SkillRegistry {
  private skills: Map<string, ParsedSkill> = new Map();
  private initialized = false;

  async initialize(skillMetadataList: SkillMetadata[]): Promise<void> {
    if (this.initialized) return;

    // Load all skills (both enabled and disabled)
    for (const metadata of skillMetadataList) {
      console.log(
        `Processing skill: ${metadata.name} (enabled: ${metadata.enabled})`,
      );
      try {
        // For enabled skills, load full content; for disabled skills, just store metadata
        let skillMdContent = "";
        let scripts: string[] = [];
        let references: string[] = [];
        let assets: string[] = [];

        if (metadata.enabled) {
          // Load actual SKILL.md content from storage
          console.log(`Loading SKILL.md for skill: ${metadata.id}`);
          skillMdContent =
            ((await skillStorage.getSkillFile(
              metadata.id,
              "SKILL.md",
            )) as string) || "";
          console.log(`SKILL.md content length: ${skillMdContent.length}`);

          // Get file lists from ZenFS
          const skillPath = zenfs.getSkillPath(metadata.id);
          scripts = await getSkillScripts(skillPath);
          references = await getSkillReferences(skillPath);
          assets = await getSkillAssets(skillPath);
        }

        const parsedSkill: ParsedSkill = {
          metadata,
          skillMdContent,
          scripts,
          references,
          assets,
        };

        this.skills.set(metadata.name, parsedSkill);
        console.log(
          `✅ Successfully loaded skill: ${metadata.name} (enabled: ${metadata.enabled})`,
        );
      } catch (error) {
        console.error(`❌ Failed to load skill ${metadata.name}:`, error);
        console.error("Error details:", {
          skillId: metadata.id,
          skillName: metadata.name,
          enabled: metadata.enabled,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.initialized = true;
  }

  parseSkillMetadata(markdown: string): Partial<SkillMetadata> {
    const frontmatterMatch = markdown.match(/^---\n(.*?)\n---/s);
    if (!frontmatterMatch) {
      throw new Error("No YAML frontmatter found in SKILL.md");
    }

    const frontmatter = frontmatterMatch[1];
    if (!frontmatter) {
      throw new Error("Empty YAML frontmatter in SKILL.md");
    }
    const nameMatch = frontmatter.match(/name:\s*(.+)/);
    const descMatch = frontmatter.match(/description:\s*(.+)/);
    const versionMatch = frontmatter.match(/version:\s*(.+)/);

    return {
      name: nameMatch?.[1]?.trim() || "unknown-skill",
      description: descMatch?.[1]?.trim() || "No description provided",
      version: versionMatch?.[1]?.trim() || "1.0.0",
    };
  }

  getSkillSummaries(): string {
    if (!this.initialized) {
      return "";
    }

    const summaries: string[] = [];

    for (const [name, skill] of this.skills) {
      summaries.push(`- **${name}**: ${skill.metadata.description}`);
    }

    return summaries.length > 0
      ? `Available Skills:\n${summaries.join("\n")}`
      : "No skills available";
  }

  async getSkillContent(skillName: string): Promise<string> {
    if (!this.initialized) {
      throw new Error("SkillRegistry not initialized");
    }

    const skill = this.skills.get(skillName);
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    return skill.skillMdContent;
  }

  async getSkillReference(skillName: string, refPath: string): Promise<string> {
    if (!this.initialized) {
      throw new Error("SkillRegistry not initialized");
    }

    const skill = this.skills.get(skillName);
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    // Check if reference exists
    if (!skill.references.includes(refPath)) {
      throw new Error(`Reference not found: ${refPath}`);
    }

    // Load actual reference content from storage
    const content = (await skillStorage.getSkillFile(
      skill.metadata.id,
      refPath,
    )) as string;
    if (!content) {
      throw new Error(`Reference content not found: ${refPath}`);
    }
    return content;
  }

  async getSkillScript(skillName: string, scriptPath: string): Promise<string> {
    if (!this.initialized) {
      throw new Error("SkillRegistry not initialized");
    }

    const skill = this.skills.get(skillName);
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    // Check if script exists
    if (!skill.scripts.includes(scriptPath)) {
      throw new Error(`Script not found: ${scriptPath}`);
    }

    // Load actual script content from storage
    const content = (await skillStorage.getSkillFile(
      skill.metadata.id,
      scriptPath,
    )) as string;
    if (!content) {
      throw new Error(`Script content not found: ${scriptPath}`);
    }
    return content;
  }

  async getSkillAsset(
    skillName: string,
    assetPath: string,
  ): Promise<string | ArrayBuffer | null> {
    if (!this.initialized) {
      return null;
    }

    const skill = this.skills.get(skillName);
    if (!skill) {
      return null;
    }

    // Check if asset exists
    if (!skill.assets.includes(assetPath)) {
      return null;
    }

    // Load actual asset content from storage
    const content = await skillStorage.getSkillFile(
      skill.metadata.id,
      assetPath,
    );
    return content;
  }

  getAllSkills(): SkillSummary[] {
    if (!this.initialized) {
      return [];
    }

    return Array.from(this.skills.values()).map((skill) => ({
      name: skill.metadata.name,
      description: skill.metadata.description,
      enabled: skill.metadata.enabled,
    }));
  }

  getSkill(skillName: string): ParsedSkill | null {
    if (!this.initialized) {
      return null;
    }

    return this.skills.get(skillName) || null;
  }

  addSkill(skill: ParsedSkill): void {
    this.skills.set(skill.metadata.name, skill);
  }

  removeSkill(skillName: string): boolean {
    return this.skills.delete(skillName);
  }

  updateSkill(skillName: string, updates: Partial<ParsedSkill>): boolean {
    const existing = this.skills.get(skillName);
    if (!existing) {
      return false;
    }

    const updated = { ...existing, ...updates };
    this.skills.set(skillName, updated);
    return true;
  }

  updateSkillStatus(skillName: string, enabled: boolean): boolean {
    const existing = this.skills.get(skillName);
    if (!existing) {
      return false;
    }

    existing.metadata.enabled = enabled;
    return true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const skillRegistry = new SkillRegistry();
