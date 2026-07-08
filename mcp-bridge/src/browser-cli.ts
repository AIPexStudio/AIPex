import "./commands/tab.js";
import "./commands/page.js";
import "./commands/interact.js";
import "./commands/download.js";
import "./commands/intervention.js";
import "./commands/skill.js";

import {
  getAllGroups,
  getGroup,
  parseOptions,
  formatGroupHelp,
  formatCommandHelp,
} from "./lib/command-registry.js";
import { callTool, type DaemonClientOptions } from "./lib/daemon-client.js";
import { printResult, printHelp, success, error } from "./lib/output.js";
import { startVersionCheck, runSelfUpdate } from "./lib/version-check.js";
import { runStatusCommand } from "./commands/status.js";

const VERSION = "3.1.0";

// ── Global option extraction ────────────────────────────────────────────────

function extractGlobalOptions(argv: string[]): {
  args: string[];
  port: number;
  host: string;
} {
  const args: string[] = [];
  let port = 9223;
  let host = "127.0.0.1";

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--port" && argv[i + 1]) {
      port = parseInt(argv[++i], 10);
    } else if (argv[i] === "--host" && argv[i + 1]) {
      host = argv[++i];
    } else {
      args.push(argv[i]);
    }
  }

  return { args, port, host };
}

// ── Help text ───────────────────────────────────────────────────────────────

function printTopLevelHelp(): void {
  const groups = getAllGroups();
  const lines: string[] = [];
  lines.push(
    `browser-cli v${VERSION} — Control the browser from the command line.`,
  );
  lines.push("");
  lines.push("GROUPS:");

  const maxLen = Math.max(...Array.from(groups.keys()).map((k) => k.length));
  for (const group of groups.values()) {
    lines.push(
      `  ${group.name.padEnd(maxLen + 4)}${group.description}`,
    );
  }

  lines.push("");
  lines.push("COMMANDS:");
  lines.push(`  ${"status".padEnd(maxLen + 4)}Check daemon and extension connection status`);
  lines.push(`  ${"update".padEnd(maxLen + 4)}Update browser-cli to the latest version`);

  lines.push("");
  lines.push("OPTIONS:");
  lines.push("  --port <n>    Daemon port (default: 9223)");
  lines.push("  --host <h>    Daemon host (default: 127.0.0.1)");
  lines.push("  --help, -h    Show help");
  lines.push("  --version     Show version");
  lines.push("");
  lines.push("USAGE:");
  lines.push("  browser-cli <group>                  Show group help");
  lines.push(
    "  browser-cli <group> <command> [args]  Execute a command",
  );
  lines.push("");
  lines.push("SETUP:");
  lines.push("  npm install -g aipex-mcp-bridge");
  lines.push(
    "  # Then connect AIPex extension → Options → ws://localhost:9223/extension",
  );

  printHelp(lines.join("\n"));
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const rawArgs = process.argv.slice(2);
  const { args, port, host } = extractGlobalOptions(rawArgs);
  const daemonOpts: DaemonClientOptions = { port, host };

  // Version check (non-blocking)
  const showUpdateNotice = startVersionCheck(VERSION);

  // No args or help flag
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printTopLevelHelp();
    showUpdateNotice();
    process.exit(0);
  }

  // Version flag
  if (args[0] === "--version" || args[0] === "-v") {
    process.stderr.write(`browser-cli v${VERSION}\n`);
    process.exit(0);
  }

  // Update command
  if (args[0] === "update") {
    await runSelfUpdate();
    process.exit(0);
  }

  // Status command
  if (args[0] === "status") {
    const result = await runStatusCommand(daemonOpts);
    printResult(result as ReturnType<typeof success>);
    showUpdateNotice();
    process.exit(result.ok ? 0 : 1);
  }

  // Group routing
  const groupName = args[0];
  const group = getGroup(groupName);

  if (!group) {
    printResult(
      error(
        `Unknown command group: "${groupName}"`,
        "Run 'browser-cli --help' to see available groups",
      ),
    );
    process.exit(1);
  }

  // Group help (no subcommand)
  if (
    args.length === 1 ||
    args[1] === "--help" ||
    args[1] === "-h"
  ) {
    printHelp(formatGroupHelp(group));
    showUpdateNotice();
    process.exit(0);
  }

  // Subcommand routing
  const subName = args[1];
  const command = group.commands.get(subName);

  if (!command) {
    printResult(
      error(
        `Unknown command: "${groupName} ${subName}"`,
        `Run 'browser-cli ${groupName} --help' to see available commands`,
      ),
    );
    process.exit(1);
  }

  // Subcommand help
  if (args.includes("--help") || args.includes("-h")) {
    printHelp(formatCommandHelp(group, command));
    showUpdateNotice();
    process.exit(0);
  }

  // Parse and execute
  const { positional, options } = parseOptions(args.slice(2), command);

  // Validate required args
  const requiredArgs = (command.args ?? []).filter((a) => a.required);
  if (positional.length < requiredArgs.length) {
    const missing = requiredArgs
      .slice(positional.length)
      .map((a) => a.name)
      .join(", ");
    printResult(
      error(
        `Missing required argument(s): ${missing}`,
        `Run 'browser-cli ${groupName} ${subName} --help' for usage`,
      ),
    );
    process.exit(1);
  }

  // Validate required options
  const requiredOpts = (command.options ?? []).filter((o) => o.required);
  for (const opt of requiredOpts) {
    if (options[opt.flag] == null) {
      printResult(
        error(
          `Missing required option: --${opt.flag}`,
          `Run 'browser-cli ${groupName} ${subName} --help' for usage`,
        ),
      );
      process.exit(1);
    }
  }

  const toolArgs = command.mapArgs(positional, options);
  const startMs = Date.now();

  const result = await callTool(command.toolName, toolArgs, daemonOpts);
  const elapsed = Date.now() - startMs;

  if (result.ok) {
    printResult(
      success(result.data, { tool: command.toolName, elapsed_ms: elapsed }),
    );
  } else {
    printResult(error(result.error!, result.hint));
  }

  showUpdateNotice();
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  printResult(
    error(err instanceof Error ? err.message : String(err)),
  );
  process.exit(1);
});
