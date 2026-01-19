/**
 * SkillClient Adapter Implementation
 *
 * Adapts browser-runtime skillManager to the SkillClient interface
 * used by browser-ext UI components.
 */

import { SkillConflictError, skillManager } from "@aipexstudio/browser-runtime";
import type {
  SkillClient,
  SkillDetail,
  SkillMetadata,
  SkillUploadResult,
} from "../components/skill/types";

export class SkillClientAdapter implements SkillClient {
  async initialize(): Promise<void> {
    await skillManager.initialize();
  }

  isInitialized(): boolean {
    return skillManager.isInitialized();
  }

  listSkills(): SkillMetadata[] {
    return skillManager.getAllSkills();
  }

  async uploadSkill(
    file: File,
    replace: boolean = false,
  ): Promise<SkillUploadResult> {
    try {
      const skill = await skillManager.uploadSkill(file, replace);
      return { ok: true, skill };
    } catch (error) {
      if (error instanceof SkillConflictError) {
        // Extract skill name from error message
        const match = error.message.match(/"(.+?)"/);
        const skillName = match?.[1] || "unknown";
        return { ok: false, type: "conflict", skillName };
      }
      return {
        ok: false,
        type: "error",
        message: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  async enableSkill(skillId: string): Promise<void> {
    await skillManager.enableSkill(skillId);
  }

  async disableSkill(skillId: string): Promise<void> {
    await skillManager.disableSkill(skillId);
  }

  async deleteSkill(skillId: string): Promise<void> {
    await skillManager.deleteSkill(skillId);
  }

  async getSkill(skillNameOrId: string): Promise<SkillDetail | null> {
    try {
      const parsedSkill = await skillManager.getSkill(skillNameOrId);
      if (!parsedSkill) return null;

      return {
        metadata: parsedSkill.metadata,
        skillMdContent: parsedSkill.skillMdContent,
        scripts: parsedSkill.scripts,
        references: parsedSkill.references,
        assets: parsedSkill.assets,
      };
    } catch (error) {
      console.error(`Failed to get skill ${skillNameOrId}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const skillClientAdapter = new SkillClientAdapter();
