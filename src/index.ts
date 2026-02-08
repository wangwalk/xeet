import { Command } from "commander";
import { setPrettyMode, setVerboseMode, setJsonMode, setCommandName, setNoInputMode } from "./output.js";
import { registerAuthCommands } from "./commands/auth.js";
import { registerReadCommand } from "./commands/read.js";
import { registerPostCommands } from "./commands/post.js";
import { registerTimelineCommand } from "./commands/timeline.js";
import { registerSearchCommand } from "./commands/search.js";
import { registerUserCommand } from "./commands/user.js";
import { registerInteractCommands } from "./commands/interact.js";
import { registerMentionsCommand } from "./commands/mentions.js";
import { registerCompletionCommand } from "./commands/completion.js";

const program = new Command();

program
  .name("xeet")
  .description("X Platform CLI for AI Agents")
  .version("0.1.0")
  .option("--pretty", "Human-friendly formatted output (indented JSON)")
  .option("--json", "Force JSON output (default for non-TTY)")
  .option("--verbose", "Include request metadata")
  .option("--enable-commands <csv>", "Restrict available commands (comma-separated)")
  .option("--no-input", "Never prompt; fail if interactive input is needed")
  .hook("preAction", (_thisCommand, actionCommand) => {
    const opts = program.opts();
    if (opts.pretty) setPrettyMode(true);
    if (opts.json) setJsonMode(true);
    if (opts.verbose) setVerboseMode(true);
    if (opts.input === false) setNoInputMode(true);

    // Derive command name for human-friendly formatting
    const name = actionCommand.name();
    const parent = actionCommand.parent;
    const cmdName = parent && parent.name() !== "xeet" ? `${parent.name()}-${name}` : name;
    setCommandName(cmdName);
  });

registerAuthCommands(program);
registerReadCommand(program);
registerPostCommands(program);
registerTimelineCommand(program);
registerSearchCommand(program);
registerUserCommand(program);
registerInteractCommands(program);
registerMentionsCommand(program);
registerCompletionCommand(program);

// Command sandbox: restrict available commands if --enable-commands or XEET_ENABLE_COMMANDS is set
function getEnabledCommands(): string[] | null {
  const envVal = process.env.XEET_ENABLE_COMMANDS;
  if (envVal) return envVal.split(",").map((s) => s.trim()).filter(Boolean);

  // Pre-scan argv for --enable-commands (before Commander parses)
  const idx = process.argv.indexOf("--enable-commands");
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1].split(",").map((s) => s.trim()).filter(Boolean);
  }
  return null;
}

const allowlist = getEnabledCommands();
if (allowlist) {
  // Always keep "completion" and "help" accessible
  const keep = new Set([...allowlist, "completion", "help"]);
  const cmds = program.commands;
  for (let i = cmds.length - 1; i >= 0; i--) {
    if (!keep.has(cmds[i].name())) {
      cmds.splice(i, 1);
    }
  }
}

program.parse();
