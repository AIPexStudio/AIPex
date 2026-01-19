import { zenfs } from "../../../lib/vm/zenfs-manager";
import licenseText from "../../built-in/skill-creator-browser/LICENSE.txt?raw";
// Import built-in skill content files
import skillCreatorMarkdown from "../../built-in/skill-creator-browser/SKILL.md?raw";
import deleteFileScript from "../../built-in/skill-creator-browser/scripts/delete_file.js?raw";
import initSkillScript from "../../built-in/skill-creator-browser/scripts/init_skill.js?raw";
import packageSkillScript from "../../built-in/skill-creator-browser/scripts/package_skill.js?raw";
import validateSkillScript from "../../built-in/skill-creator-browser/scripts/quick_validate.js?raw";
import writeFileScript from "../../built-in/skill-creator-browser/scripts/write_file.js?raw";
// Import UX Audit Walkthrough skill
import uxAuditWalkthroughMarkdown from "../../built-in/ux-audit-walkthrough/SKILL.md?raw";
// Import WCAG 2.2 Accessibility Audit skill
import wcag22A11yAuditMarkdown from "../../built-in/wcag22-a11y-audit/SKILL.md?raw";
import { skillStorage } from "../storage/skill-storage";
import { skillExecutor } from "./skill-executor";
import { skillRegistry } from "./skill-registry";
export class SkillManager {
    config;
    loadedSkills = new Set();
    initialized = false;
    subscribers = new Map();
    constructor(config = {}) {
        this.config = {
            autoLoadEnabledSkills: true,
            maxConcurrentExecutions: 5,
            scriptTimeout: 30000,
            ...config,
        };
    }
    // --- Event System ---
    subscribe(event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, new Set());
        }
        const eventSubscribers = this.subscribers.get(event);
        if (eventSubscribers) {
            eventSubscribers.add(callback);
        }
        // Return an unsubscribe function
        return () => this.unsubscribe(event, callback);
    }
    unsubscribe(event, callback) {
        const eventSubscribers = this.subscribers.get(event);
        if (eventSubscribers) {
            eventSubscribers.delete(callback);
        }
    }
    _emit(event, data) {
        const eventSubscribers = this.subscribers.get(event);
        if (eventSubscribers) {
            eventSubscribers.forEach((callback) => {
                try {
                    callback(data);
                }
                catch (e) {
                    console.error(`[SkillManager] Error in subscriber for event "${event}":`, e);
                }
            });
        }
    }
    async initialize() {
        if (this.initialized)
            return;
        try {
            console.log("🔄 Initializing SkillManager...");
            // Initialize all components
            console.log("📦 Initializing skillStorage...");
            await skillStorage.initialize();
            console.log("⚙️ Initializing skillExecutor...");
            await skillExecutor.initialize();
            // Load all skills from storage
            console.log("📋 Loading skills from storage...");
            const allSkills = await skillStorage.listSkills();
            console.log(`Found ${allSkills.length} skills in storage`);
            // Auto-load skill-creator-browser if not already loaded
            console.log("🔧 Loading built-in skill-creator...");
            await this.loadBuiltinSkillCreator();
            // Auto-load ux-audit-walkthrough (disabled by default)
            console.log("🔧 Loading built-in ux-audit-walkthrough...");
            await this.loadBuiltinUxAuditWalkthrough();
            // Auto-load wcag22-a11y-audit
            console.log("🔧 Loading built-in wcag22-a11y-audit...");
            await this.loadBuiltinWcag22A11yAudit();
            // Reload skills from storage after creating built-in skills
            console.log("📋 Reloading skills from storage...");
            const updatedSkills = await skillStorage.listSkills();
            console.log(`Found ${updatedSkills.length} skills in storage after built-in creation`);
            // Initialize registry with skill metadata
            console.log("📝 Initializing skillRegistry...");
            await skillRegistry.initialize(updatedSkills);
            // Ensure built-in skill is in registry if it was just created
            console.log("🔍 Verifying built-in skill in registry...");
            const registrySkills = skillRegistry.getAllSkills();
            console.log(`Registry has ${registrySkills.length} skills:`, registrySkills.map((s) => s.name));
            // Auto-load enabled skills if configured
            if (this.config.autoLoadEnabledSkills) {
                console.log("🚀 Auto-loading enabled skills...");
                await this.loadEnabledSkills(updatedSkills);
            }
            this.initialized = true;
            console.log("✅ SkillManager initialized successfully");
            // Emit initialization complete event
            this._emit("skill_loaded", {
                type: "initialization_complete",
                skills: updatedSkills,
            });
        }
        catch (error) {
            console.error("❌ Failed to initialize SkillManager:", error);
            throw error;
        }
    }
    async uploadSkill(zipFile, replace = false) {
        await this.ensureInitialized();
        try {
            // Save skill to storage (this now extracts to ZenFS directly)
            const skillMetadata = await skillStorage.saveSkill(zipFile, replace);
            // Parse and add to registry
            const parsedSkill = await skillStorage.loadSkill(skillMetadata.id);
            skillRegistry.addSkill(parsedSkill);
            // Add to loaded skills if enabled (files are already in ZenFS)
            if (skillMetadata.enabled) {
                this.loadedSkills.add(skillMetadata.name);
            }
            console.log(`Skill uploaded successfully: ${skillMetadata.name}`);
            // Emit skill uploaded event
            this._emit("skill_loaded", {
                type: "skill_uploaded",
                skillId: skillMetadata.id,
                skillName: skillMetadata.name,
                skillMetadata,
            });
            return skillMetadata;
        }
        catch (error) {
            console.error("Failed to upload skill:", error);
            throw error; // Re-throw original error to preserve SkillConflictError type
        }
    }
    async loadSkill(skillId) {
        try {
            console.log(`📥 Loading skill with ID: ${skillId}`);
            const parsedSkill = await skillStorage.loadSkill(skillId);
            if (!parsedSkill || !parsedSkill.metadata) {
                throw new Error(`Invalid skill data for ${skillId}`);
            }
            // Files are already in ZenFS, just add to loaded skills
            this.loadedSkills.add(parsedSkill.metadata.name);
            console.log(`✅ Skill loaded: ${parsedSkill.metadata.name}`);
            // Emit skill loaded event
            this._emit("skill_loaded", {
                type: "skill_loaded",
                skillId,
                skillName: parsedSkill.metadata.name,
                skillMetadata: parsedSkill.metadata,
            });
        }
        catch (error) {
            console.error(`❌ Failed to load skill ${skillId}:`, error);
            throw error;
        }
    }
    async unloadSkill(skillId) {
        if (!this.initialized) {
            console.log("⚠️ SkillManager not initialized, skipping unloadSkill");
            return;
        }
        try {
            const skillMetadata = await skillStorage.getSkillMetadata(skillId);
            if (!skillMetadata) {
                throw new Error(`Skill not found: ${skillId}`);
            }
            // Remove from loaded skills
            this.loadedSkills.delete(skillMetadata.name);
            // Remove from registry
            skillRegistry.removeSkill(skillMetadata.name);
            console.log(`✅ Skill unloaded: ${skillMetadata.name}`);
            // Emit skill unloaded event
            this._emit("skill_unloaded", {
                type: "skill_unloaded",
                skillId,
                skillName: skillMetadata.name,
                skillMetadata,
            });
        }
        catch (error) {
            console.error(`❌ Failed to unload skill ${skillId}:`, error);
            throw error;
        }
    }
    async executeSkillScript(skillName, scriptPath, args = {}) {
        if (!this.initialized) {
            throw new Error("SkillManager not initialized");
        }
        if (!this.loadedSkills.has(skillName)) {
            throw new Error(`Skill not loaded: ${skillName}`);
        }
        try {
            const result = await skillExecutor.executeScript(skillName, scriptPath, args);
            console.log(`✅ Script executed successfully: ${skillName}/${scriptPath}`);
            return result;
        }
        catch (error) {
            console.error(`❌ Failed to execute script ${skillName}/${scriptPath}:`, error);
            throw error;
        }
    }
    async getSkillContent(skillName) {
        if (!this.initialized) {
            throw new Error("SkillManager not initialized");
        }
        return await skillRegistry.getSkillContent(skillName);
    }
    async getSkill(skillName) {
        if (!this.initialized) {
            throw new Error("SkillManager not initialized");
        }
        return skillRegistry.getSkill(skillName);
    }
    async getSkillReference(skillName, refPath) {
        if (!this.initialized) {
            throw new Error("SkillManager not initialized");
        }
        return await skillRegistry.getSkillReference(skillName, refPath);
    }
    async getSkillScript(skillName, scriptPath) {
        if (!this.initialized) {
            throw new Error("SkillManager not initialized");
        }
        return await skillRegistry.getSkillScript(skillName, scriptPath);
    }
    async getSkillAsset(skillName, assetPath) {
        if (!this.initialized) {
            throw new Error("SkillManager not initialized");
        }
        return await skillRegistry.getSkillAsset(skillName, assetPath);
    }
    getSkillSummaries() {
        return skillRegistry.getSkillSummaries();
    }
    getAllSkills() {
        return skillRegistry.getAllSkills().map((summary) => {
            // Find the actual skill metadata to get the correct ID
            const skill = skillRegistry.getSkill(summary.name);
            return {
                id: skill?.metadata.id || `skill_${summary.name}`,
                name: summary.name,
                description: summary.description,
                version: skill?.metadata.version || "1.0.0",
                uploadedAt: skill?.metadata.uploadedAt || Date.now(),
                enabled: summary.enabled,
            };
        });
    }
    async enableSkill(skillId) {
        if (!this.initialized) {
            throw new Error("SkillManager not initialized");
        }
        try {
            // Get skill metadata to find the skill name
            const skillMetadata = await skillStorage.getSkillMetadata(skillId);
            if (!skillMetadata) {
                throw new Error(`Skill not found: ${skillId}`);
            }
            // Update in storage
            await skillStorage.updateSkill(skillId, { enabled: true });
            // Update registry status
            skillRegistry.updateSkillStatus(skillMetadata.name, true);
            // Load skill if not already loaded
            if (!this.loadedSkills.has(skillMetadata.name)) {
                await this.loadSkill(skillId);
            }
            console.log(`✅ Skill enabled: ${skillMetadata.name}`);
            // Emit skill enabled event
            this._emit("skill_enabled", {
                type: "skill_enabled",
                skillId,
                skillName: skillMetadata.name,
                skillMetadata,
            });
        }
        catch (error) {
            console.error(`❌ Failed to enable skill ${skillId}:`, error);
            throw error;
        }
    }
    async disableSkill(skillId) {
        if (!this.initialized) {
            throw new Error("SkillManager not initialized");
        }
        try {
            // Get skill metadata to find the skill name
            const skillMetadata = await skillStorage.getSkillMetadata(skillId);
            if (!skillMetadata) {
                throw new Error(`Skill not found: ${skillId}`);
            }
            // Prevent disabling built-in skills
            if (skillMetadata.id === "skill-creator") {
                throw new Error("Cannot disable built-in skill-creator. This skill is required for the system to function.");
            }
            // Update in storage
            await skillStorage.updateSkill(skillId, { enabled: false });
            // Update registry status without unloading
            skillRegistry.updateSkillStatus(skillMetadata.name, false);
            console.log(`✅ Skill disabled: ${skillMetadata.name}`);
            // Emit skill disabled event
            this._emit("skill_disabled", {
                type: "skill_disabled",
                skillId,
                skillName: skillMetadata.name,
                skillMetadata,
            });
        }
        catch (error) {
            console.error(`❌ Failed to disable skill ${skillId}:`, error);
            throw error;
        }
    }
    async deleteSkill(skillId) {
        if (!this.initialized) {
            throw new Error("SkillManager not initialized");
        }
        try {
            // Get skill metadata to find the skill name
            const skillMetadata = await skillStorage.getSkillMetadata(skillId);
            if (!skillMetadata) {
                throw new Error(`Skill not found: ${skillId}`);
            }
            // Prevent deleting built-in skills
            if (skillMetadata.id === "skill-creator") {
                throw new Error("Cannot delete built-in skill-creator. This skill is required for the system to function.");
            }
            // Unload skill if loaded
            if (this.loadedSkills.has(skillMetadata.name)) {
                await this.unloadSkill(skillId);
            }
            // Delete from storage
            await skillStorage.deleteSkill(skillId);
            console.log(`✅ Skill deleted: ${skillMetadata.name}`);
        }
        catch (error) {
            console.error(`❌ Failed to delete skill ${skillId}:`, error);
            throw error;
        }
    }
    getRegisteredTools() {
        return skillExecutor.getRegisteredTools();
    }
    async executeTool(toolName, args) {
        return await skillExecutor.executeTool(toolName, args);
    }
    isInitialized() {
        return this.initialized;
    }
    getLoadedSkills() {
        return Array.from(this.loadedSkills);
    }
    // Helper methods
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }
    async loadBuiltinSkillCreator() {
        try {
            console.log("📦 Creating built-in skill-creator...");
            const skillName = "skill-creator";
            const skillPath = zenfs.getSkillPath(skillName);
            // Check if skill-creator already exists
            const exists = await zenfs.exists(skillPath);
            if (exists) {
                console.log("✅ Built-in skill-creator already exists");
                return;
            }
            // Create skill directory
            await zenfs.mkdir(skillPath, { recursive: true });
            // Write all skill files to ZenFS
            const files = [
                { path: "SKILL.md", content: skillCreatorMarkdown },
                { path: "scripts/init_skill.js", content: initSkillScript },
                { path: "scripts/package_skill.js", content: packageSkillScript },
                { path: "scripts/quick_validate.js", content: validateSkillScript },
                { path: "scripts/write_file.js", content: writeFileScript },
                { path: "scripts/delete_file.js", content: deleteFileScript },
                { path: "LICENSE.txt", content: licenseText },
            ];
            // Create subdirectories
            await zenfs.mkdir(`${skillPath}/scripts`, { recursive: true });
            // Write each file
            for (const file of files) {
                const fullPath = `${skillPath}/${file.path}`;
                await zenfs.writeFile(fullPath, file.content);
            }
            console.log(`✅ Skill-creator files written to ZenFS: ${skillPath}`);
            // Create lightweight metadata
            const skillCreatorMetadata = {
                id: skillName,
                name: skillName,
                description: "Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends AIPex's capabilities with specialized knowledge, workflows, or tool integrations.",
                version: "1.0.0",
                uploadedAt: Date.now(),
                enabled: true,
            };
            // Save metadata to IndexedDB
            console.log("💾 Saving skill-creator metadata to IndexedDB...");
            await skillStorage.saveSkillMetadata(skillCreatorMetadata);
            console.log("✅ Skill-creator metadata saved to IndexedDB");
            console.log("✅ Built-in skill-creator loaded successfully");
        }
        catch (error) {
            console.error("❌ Failed to load built-in skill-creator:", error);
        }
    }
    async loadEnabledSkills(skills) {
        const enabledSkills = skills.filter((skill) => skill.enabled);
        console.log(`🔄 Auto-loading ${enabledSkills.length} enabled skills...`);
        for (const skill of enabledSkills) {
            try {
                console.log(`📥 Loading skill: ${skill.name}`);
                await this.loadSkill(skill.id);
                console.log(`✅ Successfully loaded skill: ${skill.name}`);
            }
            catch (error) {
                console.error(`❌ Failed to auto-load skill ${skill.name}:`, error);
            }
        }
    }
    /**
     * Load built-in UX Audit Walkthrough skill (disabled by default)
     */
    async loadBuiltinUxAuditWalkthrough() {
        try {
            console.log("📦 Creating built-in ux-audit-walkthrough...");
            const skillName = "ux-audit-walkthrough";
            const skillPath = zenfs.getSkillPath(skillName);
            const skillMdPath = `${skillPath}/SKILL.md`;
            // Check if SKILL.md file exists (not just the directory)
            const skillMdExists = await zenfs.exists(skillMdPath);
            if (!skillMdExists) {
                // Create skill directory and write SKILL.md
                await zenfs.mkdir(skillPath, { recursive: true });
                await zenfs.writeFile(skillMdPath, uxAuditWalkthroughMarkdown);
                console.log(`✅ UX-audit-walkthrough files written to ZenFS: ${skillPath}`);
            }
            else {
                console.log("✅ Built-in ux-audit-walkthrough SKILL.md already exists in ZenFS");
            }
            // Always check if metadata exists in IndexedDB, and create if missing
            const existingMetadata = await skillStorage.getSkillMetadata(skillName);
            if (!existingMetadata) {
                // Create lightweight metadata (disabled by default)
                const uxAuditMetadata = {
                    id: skillName,
                    name: skillName,
                    description: "Minimalist UX/Interaction Audit Expert that deconstructs complex interactions through cognitive load and operational efficiency lenses. Use this skill when you need to perform a UX walkthrough audit on a Figma prototype or web interface.",
                    version: "1.0.0",
                    uploadedAt: Date.now(),
                    enabled: true, // Disabled by default - user must manually enable
                };
                // Save metadata to IndexedDB
                console.log("💾 Saving ux-audit-walkthrough metadata to IndexedDB...");
                await skillStorage.saveSkillMetadata(uxAuditMetadata);
                console.log("✅ UX-audit-walkthrough metadata saved to IndexedDB");
            }
            else {
                console.log("✅ Built-in ux-audit-walkthrough metadata already exists in IndexedDB");
            }
            console.log("✅ Built-in ux-audit-walkthrough loaded successfully (disabled by default)");
        }
        catch (error) {
            console.error("❌ Failed to load built-in ux-audit-walkthrough:", error);
        }
    }
    /**
     * Load built-in WCAG 2.2 Accessibility Audit skill (enabled by default)
     */
    async loadBuiltinWcag22A11yAudit() {
        try {
            console.log("📦 Creating built-in wcag22-a11y-audit...");
            const skillName = "wcag22-a11y-audit";
            const skillPath = zenfs.getSkillPath(skillName);
            const skillMdPath = `${skillPath}/SKILL.md`;
            // Check if SKILL.md file exists (not just the directory)
            const skillMdExists = await zenfs.exists(skillMdPath);
            if (!skillMdExists) {
                // Create skill directory and write SKILL.md
                await zenfs.mkdir(skillPath, { recursive: true });
                await zenfs.writeFile(skillMdPath, wcag22A11yAuditMarkdown);
                console.log(`✅ wcag22-a11y-audit files written to ZenFS: ${skillPath}`);
            }
            else {
                console.log("✅ Built-in wcag22-a11y-audit SKILL.md already exists in ZenFS");
            }
            // Always check if metadata exists in IndexedDB, and create if missing
            const existingMetadata = await skillStorage.getSkillMetadata(skillName);
            if (!existingMetadata) {
                // Create lightweight metadata (enabled by default)
                const wcag22Metadata = {
                    id: skillName,
                    name: skillName,
                    description: "WCAG 2.2 Accessibility Audit skill that systematically evaluates web pages against 8 core Success Criteria (1.1.1, 1.4.3, 1.4.11, 2.1.1, 2.1.2, 2.4.3, 2.4.7, 4.1.2) using accessibility tree inspection and visual analysis.",
                    version: "1.0.0",
                    uploadedAt: Date.now(),
                    enabled: true,
                };
                // Save metadata to IndexedDB
                console.log("💾 Saving wcag22-a11y-audit metadata to IndexedDB...");
                await skillStorage.saveSkillMetadata(wcag22Metadata);
                console.log("✅ wcag22-a11y-audit metadata saved to IndexedDB");
            }
            else {
                console.log("✅ Built-in wcag22-a11y-audit metadata already exists in IndexedDB");
            }
            console.log("✅ Built-in wcag22-a11y-audit loaded successfully");
        }
        catch (error) {
            console.error("❌ Failed to load built-in wcag22-a11y-audit:", error);
        }
    }
}
// Export singleton instance
export const skillManager = new SkillManager();
