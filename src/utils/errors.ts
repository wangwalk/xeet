export enum ExitCode {
  Success = 0,
  GeneralError = 1,
  AuthError = 2,
  RateLimit = 3,
  InvalidArgs = 4,
}

export enum ErrorCode {
  UNKNOWN = "UNKNOWN",
  AUTH_MISSING = "AUTH_MISSING",
  AUTH_INVALID = "AUTH_INVALID",
  RATE_LIMITED = "RATE_LIMITED",
  NOT_FOUND = "NOT_FOUND",
  FORBIDDEN = "FORBIDDEN",
  INVALID_ARGS = "INVALID_ARGS",
  API_ERROR = "API_ERROR",
  AUTH_EXPIRED = "AUTH_EXPIRED",
  CONFIG_ERROR = "CONFIG_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
}

export class XeetError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public exitCode: ExitCode = ExitCode.GeneralError,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = "XeetError";
  }
}

export function toXeetError(err: unknown): XeetError {
  if (err instanceof XeetError) return err;

  if (err instanceof Error) {
    const msg = err.message.toLowerCase();

    if (msg.includes("unauthorized") || msg.includes("401")) {
      return new XeetError(ErrorCode.AUTH_INVALID, err.message, ExitCode.AuthError);
    }
    if (msg.includes("forbidden") || msg.includes("403")) {
      return new XeetError(ErrorCode.FORBIDDEN, err.message, ExitCode.GeneralError);
    }
    if (msg.includes("not found") || msg.includes("404")) {
      return new XeetError(ErrorCode.NOT_FOUND, err.message, ExitCode.GeneralError);
    }
    if (msg.includes("rate limit") || msg.includes("429")) {
      return new XeetError(ErrorCode.RATE_LIMITED, err.message, ExitCode.RateLimit);
    }

    return new XeetError(ErrorCode.API_ERROR, err.message);
  }

  return new XeetError(ErrorCode.UNKNOWN, String(err));
}
