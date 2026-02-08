import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomBytes } from "node:crypto";

export interface OAuth1Credentials {
  authType: "oauth1";
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface OAuth2Credentials {
  authType: "oauth2";
  clientId: string;
  clientSecret?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (ms)
  scope: string; // space-separated scopes
}

export type AnyCredentials = OAuth1Credentials | OAuth2Credentials;

const CONFIG_DIR = join(homedir(), ".config", "xeet");
const CREDENTIALS_FILE = join(CONFIG_DIR, "credentials.json");

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getCredentialsPath(): string {
  return CREDENTIALS_FILE;
}

export function loadCredentials(): AnyCredentials | null {
  // 1. Environment variables (Agent-first)
  const envCreds = loadFromEnv();
  if (envCreds) return envCreds;

  // 2. Config file
  return loadFromFile();
}

function loadFromEnv(): AnyCredentials | null {
  const apiKey = process.env.XEET_API_KEY;
  const apiSecret = process.env.XEET_API_SECRET;
  const accessToken = process.env.XEET_ACCESS_TOKEN;
  const accessTokenSecret = process.env.XEET_ACCESS_TOKEN_SECRET;

  // Priority 1: OAuth 1.0a — all four present
  if (apiKey && apiSecret && accessToken && accessTokenSecret) {
    return { authType: "oauth1", apiKey, apiSecret, accessToken, accessTokenSecret };
  }

  // Priority 2: OAuth 2.0 — accessToken present but no apiKey
  if (accessToken && !apiKey) {
    return {
      authType: "oauth2",
      clientId: process.env.XEET_CLIENT_ID ?? "",
      clientSecret: process.env.XEET_CLIENT_SECRET,
      accessToken,
      refreshToken: process.env.XEET_REFRESH_TOKEN ?? "",
      expiresAt: 0, // unknown from env
      scope: "",
    };
  }

  return null;
}

function loadFromFile(): AnyCredentials | null {
  if (!existsSync(CREDENTIALS_FILE)) return null;

  try {
    const raw = readFileSync(CREDENTIALS_FILE, "utf-8");
    const data = JSON.parse(raw);

    // Explicit authType
    if (data.authType === "oauth2" && data.accessToken && data.refreshToken) {
      return data as OAuth2Credentials;
    }

    // Explicit or legacy OAuth 1.0a
    if (data.apiKey && data.apiSecret && data.accessToken && data.accessTokenSecret) {
      return { authType: "oauth1", ...data } as OAuth1Credentials;
    }

    return null;
  } catch {
    return null;
  }
}

export function saveCredentials(creds: OAuth1Credentials | Omit<OAuth1Credentials, "authType">): void {
  const toSave = "authType" in creds ? creds : { authType: "oauth1" as const, ...creds };
  atomicWrite(toSave);
}

export function saveOAuth2Tokens(creds: OAuth2Credentials): void {
  atomicWrite(creds);
}

function atomicWrite(data: unknown): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const tmp = CREDENTIALS_FILE + "." + randomBytes(4).toString("hex") + ".tmp";
  writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  renameSync(tmp, CREDENTIALS_FILE);
}

export function credentialsExist(): boolean {
  return loadCredentials() !== null;
}

export function getCredentialSource(): "env" | "file" | "none" {
  if (loadFromEnv()) return "env";
  if (loadFromFile()) return "file";
  return "none";
}

export function getAuthType(): "oauth1" | "oauth2" | "none" {
  const creds = loadCredentials();
  if (!creds) return "none";
  return creds.authType;
}
