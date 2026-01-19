export declare function loadSkill(skillName: string): Promise<{
  success: boolean;
  content?: string;
  error?: string;
  message?: string;
}>;
export declare function executeSkillScript(
  skillName: string,
  scriptPath: string,
  args?: any,
): Promise<{
  success: boolean;
  result?: any;
  error?: string;
  message?: string;
}>;
export declare function readSkillReference(
  skillName: string,
  refPath: string,
): Promise<{
  success: boolean;
  content?: string;
  error?: string;
  message?: string;
}>;
export declare function getSkillAsset(
  skillName: string,
  assetPath: string,
): Promise<{
  success: boolean;
  asset?: string | number[];
  type?: string;
  error?: string;
  message?: string;
}>;
export declare function listSkills(enabledOnly?: boolean): Promise<{
  success: boolean;
  skills?: Array<{
    id: string;
    name: string;
    description: string;
    version: string;
    enabled: boolean;
    uploadedAt: number;
  }>;
  count?: number;
  error?: string;
  message?: string;
}>;
export declare function getSkillInfo(skillName: string): Promise<{
  success: boolean;
  skill?: {
    id: string;
    name: string;
    description: string;
    version: string;
    enabled: boolean;
    uploadedAt: number;
    scripts: string[];
    references: string[];
    assets: string[];
  };
  error?: string;
  message?: string;
}>;
export declare function executeSkillTool(
  toolName: string,
  args: any,
): Promise<{
  success: boolean;
  result?: any;
  error?: string;
  message?: string;
}>;
export declare function getSkillTools(skillName?: string): Promise<{
  success: boolean;
  tools?: Array<{
    name: string;
    description: string;
    inputSchema: any;
  }>;
  count?: number;
  error?: string;
  message?: string;
}>;
