import { Command } from "commander";

interface CmdInfo {
  name: string;
  description: string;
  options: { flags: string; description: string }[];
  subcommands: CmdInfo[];
}

function extractCommands(cmd: Command): CmdInfo[] {
  return cmd.commands.map((c: Command) => ({
    name: c.name(),
    description: c.description() || "",
    options: c.options.map((o: any) => ({
      flags: o.long || o.short || "",
      description: o.description || "",
    })),
    subcommands: extractCommands(c),
  }));
}

function generateBash(cmds: CmdInfo[], programName: string): string {
  const topCmds = cmds.map((c) => c.name).join(" ");
  const cases: string[] = [];

  for (const c of cmds) {
    if (c.subcommands.length) {
      const subs = c.subcommands.map((s) => s.name).join(" ");
      cases.push(`    ${c.name}) COMPREPLY=( $(compgen -W "${subs}" -- "$cur") ) ;;`);
    }
  }

  return `# bash completion for ${programName}
_${programName}_completions() {
  local cur prev cmds
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  cmds="${topCmds}"

  case "$prev" in
${cases.join("\n")}
    ${programName}) COMPREPLY=( $(compgen -W "$cmds" -- "$cur") ) ;;
    *) COMPREPLY=( $(compgen -W "$cmds" -- "$cur") ) ;;
  esac
}
complete -F _${programName}_completions ${programName}
`;
}

function generateZsh(cmds: CmdInfo[], programName: string): string {
  const lines = [`#compdef ${programName}`, "", `_${programName}() {`, "  local -a commands"];
  lines.push("  commands=(");
  for (const c of cmds) {
    const desc = c.description.replace(/'/g, "'\\''");
    lines.push(`    '${c.name}:${desc}'`);
  }
  lines.push("  )");
  lines.push("");
  lines.push('  _describe "command" commands');

  // Subcommand completions
  for (const c of cmds) {
    if (c.subcommands.length) {
      lines.push("");
      lines.push(`  case "$words[2]" in`);
      lines.push(`    ${c.name})`);
      lines.push("      local -a subcmds");
      lines.push("      subcmds=(");
      for (const s of c.subcommands) {
        const desc = s.description.replace(/'/g, "'\\''");
        lines.push(`        '${s.name}:${desc}'`);
      }
      lines.push("      )");
      lines.push('      _describe "subcommand" subcmds');
      lines.push("      ;;");
      lines.push("  esac");
    }
  }

  lines.push("}");
  lines.push("");
  lines.push(`_${programName} "$@"`);
  return lines.join("\n") + "\n";
}

function generateFish(cmds: CmdInfo[], programName: string): string {
  const lines: string[] = [];
  for (const c of cmds) {
    const desc = c.description.replace(/'/g, "\\'");
    lines.push(`complete -c ${programName} -n '__fish_use_subcommand' -a '${c.name}' -d '${desc}'`);

    for (const s of c.subcommands) {
      const sdesc = s.description.replace(/'/g, "\\'");
      lines.push(
        `complete -c ${programName} -n '__fish_seen_subcommand_from ${c.name}' -a '${s.name}' -d '${sdesc}'`,
      );
    }
  }
  return lines.join("\n") + "\n";
}

export function registerCompletionCommand(program: Command): void {
  program
    .command("completion <shell>")
    .description("Output shell completion script (bash, zsh, fish)")
    .action((shell: string) => {
      const cmds = extractCommands(program);
      const name = program.name();

      switch (shell.toLowerCase()) {
        case "bash":
          process.stdout.write(generateBash(cmds, name));
          break;
        case "zsh":
          process.stdout.write(generateZsh(cmds, name));
          break;
        case "fish":
          process.stdout.write(generateFish(cmds, name));
          break;
        default:
          process.stderr.write(`Unknown shell: ${shell}. Supported: bash, zsh, fish\n`);
          process.exit(1);
      }
    });
}
