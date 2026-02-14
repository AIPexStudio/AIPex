/**
 * SkillClient Adapter Implementation
 *
 * Adapts browser-runtime skillManager to the SkillClient interface
 * used by browser-ext UI components.
 */

import {
  SkillConflictError,
  skillManager,
  zenfs,
} from "@aipexstudio/browser-runtime";
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

  async getSkillContent(skillName: string): Promise<string> {
    return await skillManager.getSkillContent(skillName);
  }

  async getSkillScript(skillName: string, scriptPath: string): Promise<string> {
    return await skillManager.getSkillScript(skillName, scriptPath);
  }

  async getSkillReference(skillName: string, refPath: string): Promise<string> {
    return await skillManager.getSkillReference(skillName, refPath);
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    // Validate path: must start with /skills/, no path traversal
    if (!filePath.startsWith("/skills/")) {
      throw new Error("File path must be under /skills/");
    }
    const decoded = decodeURIComponent(filePath);
    if (decoded.includes("..")) {
      throw new Error("Path traversal (..) is not allowed");
    }
    await zenfs.writeFile(filePath, content);
  }

  async refreshSkillMetadata(skillId: string): Promise<void> {
    await skillManager.refreshSkillMetadata(skillId);
  }
}

// Export singleton instance
export const skillClientAdapter = new SkillClientAdapter();
