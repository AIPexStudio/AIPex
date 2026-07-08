import { defineGroup, addCommand } from "../lib/command-registry.js";

defineGroup("skill", "Manage AIPex skills");

addCommand("skill", {
  name: "list",
  description: "List all available skills",
  toolName: "list_skills",
  options: [
    {
      flag: "enabled-only",
      type: "boolean",
      description: "Only show enabled skills",
    },
  ],
  examples: ["browser-cli skill list", "browser-cli skill list --enabled-only true"],
  mapArgs: (_positional, options) => ({
    ...(options["enabled-only"] != null
      ? { enabledOnly: options["enabled-only"] }
      : {}),
  }),
});

addCommand("skill", {
  name: "load",
  description: "Load the main content (SKILL.md) of a skill",
  toolName: "load_skill",
  args: [{ name: "name", required: true, description: "Skill name" }],
  examples: ["browser-cli skill load my-skill"],
  mapArgs: (positional) => ({ name: positional[0] }),
});

addCommand("skill", {
  name: "info",
  description: "Get detailed info about a skill",
  toolName: "get_skill_info",
  args: [{ name: "name", required: true, description: "Skill name" }],
  examples: ["browser-cli skill info my-skill"],
  mapArgs: (positional) => ({ skillName: positional[0] }),
});

addCommand("skill", {
  name: "run",
  description: "Execute a script that belongs to a skill",
  toolName: "execute_skill_script",
  args: [
    { name: "skill", required: true, description: "Skill name" },
    {
      name: "script",
      required: true,
      description: 'Script path (e.g. scripts/init.js)',
    },
  ],
  options: [
    { flag: "args", type: "json", description: "Arguments to pass (JSON)" },
  ],
  examples: ["browser-cli skill run my-skill scripts/init.js"],
  mapArgs: (positional, options) => ({
    skillName: positional[0],
    scriptPath: positional[1],
    ...(options.args != null ? { args: options.args } : {}),
  }),
});

addCommand("skill", {
  name: "ref",
  description: "Read a reference document from a skill",
  toolName: "read_skill_reference",
  args: [
    { name: "skill", required: true, description: "Skill name" },
    {
      name: "path",
      required: true,
      description: 'Reference path (e.g. references/guide.md)',
    },
  ],
  examples: ["browser-cli skill ref my-skill references/guide.md"],
  mapArgs: (positional) => ({
    skillName: positional[0],
    refPath: positional[1],
  }),
});

addCommand("skill", {
  name: "asset",
  description: "Get an asset file from a skill",
  toolName: "get_skill_asset",
  args: [
    { name: "skill", required: true, description: "Skill name" },
    {
      name: "path",
      required: true,
      description: 'Asset path (e.g. assets/icon.png)',
    },
  ],
  examples: ["browser-cli skill asset my-skill assets/icon.png"],
  mapArgs: (positional) => ({
    skillName: positional[0],
    assetPath: positional[1],
  }),
});
