import type { ToolSchema } from "../tool-schemas.js";
import { toolSchemas } from "../tool-schemas.js";

export interface CommandArg {
  name: string;
  required: boolean;
  description: string;
  type?: string;
}

export interface CommandOption {
  flag: string;
  type: string;
  description: string;
  required?: boolean;
}

export interface Command {
  name: string;
  description: string;
  toolName: string;
  args?: CommandArg[];
  options?: CommandOption[];
  examples?: string[];
  mapArgs: (
    positional: string[],
    options: Record<string, unknown>,
  ) => Record<string, unknown>;
}

export interface CommandGroup {
  name: string;
  description: string;
  commands: Map<string, Command>;
}

const groups = new Map<string, CommandGroup>();

export function defineGroup(name: string, description: string): CommandGroup {
  const group: CommandGroup = { name, description, commands: new Map() };
  groups.set(name, group);
  return group;
}

export function addCommand(groupName: string, command: Command): void {
  const group = groups.get(groupName);
  if (!group) throw new Error(`Group "${groupName}" not defined`);
  if (!getToolSchema(command.toolName)) return;
  group.commands.set(command.name, command);
}

export function getGroup(name: string): CommandGroup | undefined {
  return groups.get(name);
}

export function getAllGroups(): Map<string, CommandGroup> {
  return groups;
}

export function getToolSchema(toolName: string): ToolSchema | undefined {
  return toolSchemas.find((t) => t.name === toolName);
}

export function parseOptions(
  rawArgs: string[],
  command: Command,
): { positional: string[]; options: Record<string, unknown> } {
  const positional: string[] = [];
  const options: Record<string, unknown> = {};
  const optionDefs = command.options ?? [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const def = optionDefs.find((o) => o.flag === key);
      const value = rawArgs[++i];
      if (value === undefined) {
        process.stderr.write(`Missing value for --${key}\n`);
        process.exit(1);
      }
      options[key] = coerceOptionValue(value, def?.type ?? "string", key);
    } else {
      positional.push(arg);
    }
  }

  return { positional, options };
}

function coerceOptionValue(
  value: string,
  type: string,
  key: string,
): unknown {
  switch (type) {
    case "number": {
      const num = Number(value);
      if (Number.isNaN(num)) {
        process.stderr.write(`--${key} expects a number, got: ${value}\n`);
        process.exit(1);
      }
      return num;
    }
    case "boolean":
      return value === "true" || value === "1";
    case "json": {
      try {
        return JSON.parse(value);
      } catch {
        process.stderr.write(
          `--${key} expects valid JSON, got: ${value}\n`,
        );
        process.exit(1);
      }
      break;
    }
    default:
      return value;
  }
}

export function formatGroupHelp(group: CommandGroup): string {
  const lines: string[] = [];
  lines.push(`browser-cli ${group.name} — ${group.description}`);
  lines.push("");
  lines.push("COMMANDS:");

  const maxLen = Math.max(
    ...Array.from(group.commands.values()).map((c) => {
      const argStr = (c.args ?? [])
        .map((a) => (a.required ? `<${a.name}>` : `[${a.name}]`))
        .join(" ");
      return c.name.length + (argStr ? argStr.length + 1 : 0);
    }),
  );

  for (const cmd of group.commands.values()) {
    const argStr = (cmd.args ?? [])
      .map((a) => (a.required ? `<${a.name}>` : `[${a.name}]`))
      .join(" ");
    const label = argStr ? `${cmd.name} ${argStr}` : cmd.name;
    lines.push(`  ${label.padEnd(maxLen + 4)}${cmd.description}`);
  }

  const allExamples = Array.from(group.commands.values()).flatMap(
    (c) => c.examples ?? [],
  );
  if (allExamples.length > 0) {
    lines.push("");
    lines.push("EXAMPLES:");
    for (const ex of allExamples.slice(0, 5)) {
      lines.push(`  ${ex}`);
    }
  }

  return lines.join("\n");
}

export function formatCommandHelp(
  group: CommandGroup,
  command: Command,
): string {
  const lines: string[] = [];
  const argStr = (command.args ?? [])
    .map((a) => (a.required ? `<${a.name}>` : `[${a.name}]`))
    .join(" ");
  const usage = argStr
    ? `browser-cli ${group.name} ${command.name} ${argStr}`
    : `browser-cli ${group.name} ${command.name}`;

  lines.push(usage);
  lines.push(`  ${command.description}`);

  if (command.args && command.args.length > 0) {
    lines.push("");
    lines.push("ARGUMENTS:");
    for (const arg of command.args) {
      const req = arg.required ? " (required)" : "";
      lines.push(`  ${arg.name.padEnd(16)}${arg.description}${req}`);
    }
  }

  if (command.options && command.options.length > 0) {
    lines.push("");
    lines.push("OPTIONS:");
    for (const opt of command.options) {
      const req = opt.required ? " (required)" : "";
      lines.push(
        `  --${opt.flag.padEnd(14)}<${opt.type}>${req}  ${opt.description}`,
      );
    }
  }

  if (command.examples && command.examples.length > 0) {
    lines.push("");
    lines.push("EXAMPLES:");
    for (const ex of command.examples) {
      lines.push(`  ${ex}`);
    }
  }

  return lines.join("\n");
}
