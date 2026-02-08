import { Command } from "commander";
import { setPrettyMode, setVerboseMode, setJsonMode, setCommandName } from "./output.js";
import { registerAuthCommands } from "./commands/auth.js";
import { registerReadCommand } from "./commands/read.js";
import { registerPostCommands } from "./commands/post.js";
import { registerTimelineCommand } from "./commands/timeline.js";
import { registerSearchCommand } from "./commands/search.js";
import { registerUserCommand } from "./commands/user.js";
import { registerInteractCommands } from "./commands/interact.js";
import { registerMentionsCommand } from "./commands/mentions.js";

const program = new Command();

program
  .name("xeet")
  .description("X Platform CLI for AI Agents")
  .version("0.1.0")
  .option("--pretty", "Human-friendly formatted output (indented JSON)")
  .option("--json", "Force JSON output (default for non-TTY)")
  .option("--verbose", "Include request metadata")
  .hook("preAction", (_thisCommand, actionCommand) => {
    const opts = program.opts();
    if (opts.pretty) setPrettyMode(true);
    if (opts.json) setJsonMode(true);
    if (opts.verbose) setVerboseMode(true);

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

program.parse();
