import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";
import { skillManager } from "../skill/lib/services/skill-manager";
import { getSkillInfo as getSkillInfoImpl } from "../skill/mcp-servers/skills";

export const loadSkillTool = tool({
  name: "load_skill",
  description:
    "Load the main content (SKILL.md) of a skill. Use this to understand what a skill does, its capabilities, available scripts, and how to use it.",
  parameters: z.object({
    name: z.string().describe("The name of the skill to load"),
  }),
  execute: async ({ name }) => {
    try {
      await skillManager.initialize();
      const content = await skillManager.getSkillContent(name);
      return { success: true, content };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

export const executeSkillScriptTool = tool({
  name: "execute_skill_script",
  description:
    "Execute a script that belongs to a skill. Scripts are located in the scripts/ directory of the skill package and can perform various operations.",
  parameters: z.object({
    skillName: z.string().describe("The name of the skill"),
    scriptPath: z
      .string()
      .describe(
        'The path to the script file (e.g., "scripts/init_skill.js"), MUST start with "scripts/"',
      ),
    args: z
      .unknown()
      .nullable()
      .optional()
      .describe("Arguments to pass to the script"),
  }),
  execute: async ({ skillName, scriptPath, args }) => {
    try {
      await skillManager.initialize();
      const normalizedPath = scriptPath.startsWith("scripts/")
        ? scriptPath
        : `scripts/${scriptPath}`;
      const result = await skillManager.executeSkillScript(
        skillName,
        normalizedPath,
        args,
      );
      return { success: true, result };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

export const readSkillReferenceTool = tool({
  name: "read_skill_reference",
  description:
    "Read a reference document from a skill. Reference files are located in the references/ directory and contain additional documentation, guides, or examples.",
  parameters: z.object({
    skillName: z.string().describe("The name of the skill"),
    refPath: z
      .string()
      .describe(
        'The path to the reference file (e.g., "references/guide.md"), MUST start with "references/"',
      ),
  }),
  execute: async ({ skillName, refPath }) => {
    try {
      await skillManager.initialize();
      const normalizedPath = refPath.startsWith("references/")
        ? refPath
        : `references/${refPath}`;
      const content = await skillManager.getSkillReference(
        skillName,
        normalizedPath,
      );
      return {
        success: true,
        content: `# Reference: ${normalizedPath}\n\n${content}`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

export const getSkillAssetTool = tool({
  name: "get_skill_asset",
  description:
    "Get an asset file from a skill. Assets are located in the assets/ directory and can be images, data files, or other resources.",
  parameters: z.object({
    skillName: z.string().describe("The name of the skill"),
    assetPath: z
      .string()
      .describe(
        'The path to the asset file (e.g., "assets/icon.png"), MUST start with "assets/"',
      ),
  }),
  execute: async ({ skillName, assetPath }) => {
    try {
      await skillManager.initialize();
      const normalizedPath = assetPath.startsWith("assets/")
        ? assetPath
        : `assets/${assetPath}`;
      const asset = await skillManager.getSkillAsset(skillName, normalizedPath);
      if (!asset) {
        return {
          success: false,
          error: `Asset '${normalizedPath}' not found in skill '${skillName}'`,
        };
      }
      if (asset instanceof ArrayBuffer) {
        const base64 = btoa(String.fromCharCode(...new Uint8Array(asset)));
        return {
          success: true,
          content: `Asset loaded successfully (binary data, ${asset.byteLength} bytes).\n\nBase64: ${base64.substring(0, 100)}...`,
          isBinary: true,
          byteLength: asset.byteLength,
          base64,
        };
      }
      return {
        success: true,
        content: `Asset loaded successfully.\n\n${asset}`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

export const listSkillsTool = tool({
  name: "list_skills",
  description:
    "List all available skills in the system. Shows enabled skills by default, or all skills if specified.",
  parameters: z.object({
    enabledOnly: z
      .boolean()
      .nullable()
      .optional()
      .describe("If true, only show enabled skills. Default: false"),
  }),
  execute: async ({ enabledOnly }) => {
    try {
      await skillManager.initialize();
      const skills = skillManager.getAllSkills();
      const filtered = enabledOnly ? skills.filter((s) => s.enabled) : skills;
      return {
        success: true,
        skills: filtered.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          version: s.version,
          enabled: s.enabled,
        })),
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

export const getSkillInfoTool = tool({
  name: "get_skill_info",
  description:
    "Get detailed information about a specific skill, including its scripts, references, assets, and metadata.",
  parameters: z.object({
    skillName: z.string().describe("The name of the skill"),
  }),
  execute: async ({ skillName }) => {
    try {
      await skillManager.initialize();
      const skillInfo = await getSkillInfoImpl(skillName);
      if (skillInfo.success) {
        return { success: true, skill: skillInfo.skill };
      }
      return {
        success: false,
        error: skillInfo.error || `Failed to get skill info for '${skillName}'`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

export const skillTools = [
  loadSkillTool,
  executeSkillScriptTool,
  readSkillReferenceTool,
  getSkillAssetTool,
  listSkillsTool,
  getSkillInfoTool,
] as const;
