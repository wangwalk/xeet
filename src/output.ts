import { XeetError, ErrorCode, ExitCode, toXeetError } from "./utils/errors.js";
import { formatHuman } from "./format.js";

export interface SuccessResult<T = unknown> {
  ok: true;
  data: T;
}

export interface ErrorResult {
  ok: false;
  error: {
    code: string;
    message: string;
    retryAfter?: number;
  };
}

let prettyMode = false;
let verboseMode = false;
let jsonMode = false;
let commandName = "";
let noInputMode = false;

export function setPrettyMode(v: boolean): void {
  prettyMode = v;
}

export function setVerboseMode(v: boolean): void {
  verboseMode = v;
}

export function setJsonMode(v: boolean): void {
  jsonMode = v;
}

export function setCommandName(name: string): void {
  commandName = name;
}

export function setNoInputMode(v: boolean): void {
  noInputMode = v;
}

export function isNoInput(): boolean {
  return noInputMode || process.env.XEET_NO_INPUT === "1";
}

export function isPretty(): boolean {
  return prettyMode;
}

export function isVerbose(): boolean {
  return verboseMode;
}

function shouldOutputJson(): boolean {
  if (jsonMode) return true;
  if (prettyMode) return true;
  return !process.stdout.isTTY;
}

export function success<T>(data: T): void {
  if (shouldOutputJson()) {
    const result: SuccessResult<T> = { ok: true, data };
    const indent = prettyMode ? 2 : undefined;
    process.stdout.write(JSON.stringify(result, null, indent) + "\n");
  } else {
    const text = formatHuman(commandName, data);
    process.stdout.write(text + "\n");
  }
  process.exit(ExitCode.Success);
}

export function fail(err: unknown): void {
  const xeetErr = err instanceof XeetError ? err : toXeetError(err);
  const result: ErrorResult = {
    ok: false,
    error: {
      code: xeetErr.code,
      message: xeetErr.message,
      ...(xeetErr.retryAfter !== undefined && { retryAfter: xeetErr.retryAfter }),
    },
  };
  const indent = prettyMode ? 2 : undefined;
  process.stderr.write(JSON.stringify(result, null, indent) + "\n");
  process.exit(xeetErr.exitCode);
}

export function failWithCode(code: ErrorCode, message: string, exitCode: ExitCode = ExitCode.GeneralError): void {
  fail(new XeetError(code, message, exitCode));
}
