import { XeetError, ErrorCode, ExitCode, toXeetError } from "./utils/errors.js";

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

export function setPrettyMode(v: boolean): void {
  prettyMode = v;
}

export function setVerboseMode(v: boolean): void {
  verboseMode = v;
}

export function isPretty(): boolean {
  return prettyMode;
}

export function isVerbose(): boolean {
  return verboseMode;
}

export function success<T>(data: T): void {
  const result: SuccessResult<T> = { ok: true, data };
  const indent = prettyMode ? 2 : undefined;
  process.stdout.write(JSON.stringify(result, null, indent) + "\n");
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
