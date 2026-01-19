import { autoMigrate } from "../../../lib/vm/migration";
import { quickjs } from "../../../lib/vm/quickjs-manager";
import { createSkillAPIBridge } from "../../../lib/vm/skill-api";
import { zenfs } from "../../../lib/vm/zenfs-manager";

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
};

export class SkillExecutor {
  private registeredTools: Map<string, ToolDefinition> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log(
        "🚀 [SkillExecutor] Initializing skill executor with QuickJS + ZenFS...",
      );

      // Initialize ZenFS
      await zenfs.initialize();
      console.log("✅ [SkillExecutor] ZenFS initialized");

      // Initialize QuickJS
      await quickjs.initialize();
      console.log("✅ [SkillExecutor] QuickJS initialized");

      // Auto-migrate from old SimpleFileSystem if needed
      await autoMigrate();
      console.log("✅ [SkillExecutor] Migration check completed");

      this.initialized = true;
      console.log("✅ [SkillExecutor] Skill executor initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize skill executor:", error);
      throw new Error(
        `Failed to initialize skill executor: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async executeScript(
    skillName: string,
    scriptPath: string,
    args: any = {},
  ): Promise<any> {
    try {
      // Ensure initialized
      if (!this.initialized) {
        await this.initialize();
      }

      console.log(
        `🚀 [SkillExecutor] Executing script: ${skillName}/${scriptPath}`,
      );

      // Get skill metadata to find skill ID
      const { skillStorage } = await import("../storage/skill-storage");
      const skills = await skillStorage.listSkills();
      const skill = skills.find((s) => s.name === skillName);

      if (!skill) {
        throw new Error(`Skill not found: ${skillName}`);
      }

      // Read script content from ZenFS
      const skillPath = zenfs.getSkillPath(skill.id);
      const fullScriptPath = `${skillPath}/${scriptPath}`;

      const scriptContent = (await zenfs.readFile(
        fullScriptPath,
        "utf8",
      )) as string;

      // Execute in QuickJS VM with script path for module resolution
      return await this.executeInVM(
        skill.id,
        fullScriptPath,
        scriptContent,
        args,
      );
    } catch (error) {
      console.error("Failed to execute script:", error);
      throw error;
    }
  }

  // loadSkillFiles method removed - files are now directly stored in ZenFS during upload

  // registerTool(toolDef: ToolDefinition): void {
  //   console.log('Tool registration request:', toolDef.name)

  //   // Validate toolDef
  //   if (!toolDef || !toolDef.name) {
  //     console.error('Invalid tool definition received:', toolDef)
  //     return
  //   }

  //   // 注册到技能执行器的工具列表
  //   this.registeredTools.set(toolDef.name, toolDef)

  //   // 同时注册到客户端全局工具注册表
  //   toolRegistry.registerSkillTool({
  //     name: toolDef.name,
  //     description: toolDef.description,
  //     category: 'Skills',
  //     inputSchema: toolDef.inputSchema
  //   })

  //   // 同时注册到MCP工具注册表
  //   try {
  //     mcpToolRegistry.registerDynamicTool({
  //       name: toolDef.name,
  //       description: toolDef.description,
  //       annotations: {
  //         category: ToolCategories.SKILLS,
  //         readOnlyHint: false
  //       },
  //       schema: this.convertInputSchemaToZod(toolDef.inputSchema),
  //       handler: async (request, response, _context) => {
  //         try {
  //           const result = await toolDef.handler(request.params)
  //           response.appendResponseLine(`Tool executed successfully.\n\nResult:\n${JSON.stringify(result, null, 2)}`)
  //         } catch (error) {
  //           response.appendResponseLine(`Error executing tool: ${error instanceof Error ? error.message : String(error)}`)
  //         }
  //       }
  //     })
  //     console.log(`✅ Tool '${toolDef.name}' registered to both client and MCP registries`)
  //   } catch (error) {
  //     console.error(`❌ Failed to register tool '${toolDef.name}' to MCP registry:`, error)
  //   }
  // }

  getRegisteredTools(): ToolDefinition[] {
    return Array.from(this.registeredTools.values());
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.registeredTools.get(name);
  }

  async executeTool(name: string, args: any): Promise<any> {
    const tool = this.registeredTools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    return await tool.handler(args);
  }

  async destroy(): Promise<void> {
    // Clean up resources
    this.registeredTools.clear();
    this.initialized = false;

    console.log("🔒 [SkillExecutor] Skill executor destroyed");
  }

  /**
   * Execute code in QuickJS VM
   */
  private async executeInVM(
    skillId: string,
    _scriptPath: string,
    code: string,
    args: any = {},
  ): Promise<any> {
    console.log(
      `[SkillExecutor] Executing code in QuickJS VM for skill: ${skillId}`,
    );

    // Create API bridge for this skill
    const apiBridge = createSkillAPIBridge({
      skillId,
      onToolRegister: async (_toolDef) => {
        // Convert tool definition and register it
        // this.registerTool({
        //   name: toolDef.name,
        //   description: toolDef.description,
        //   inputSchema: toolDef.parameters || {},
        //   handler: async (args) => {
        //     // Re-execute the tool handler code in VM
        //     if (toolDef.handler) {
        //       return await this.executeInVM(skillId, scriptPath, toolDef.handler, args)
        //     }
        //     throw new Error(`Tool handler not defined for: ${toolDef.name}`)
        //   }
        // })
      },
    });

    // Execute in QuickJS with script path for module resolution
    const result = await quickjs.execute(
      code,
      {
        skillId,
        workingDir: zenfs.getSkillPath(skillId),
        args,
      },
      apiBridge,
    );

    return result;
  }
}

// Export singleton instance
export const skillExecutor = new SkillExecutor();
