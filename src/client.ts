import { Client, OAuth1 } from "@xdevplatform/xdk";
import { loadCredentials, saveOAuth2Tokens, getCredentialSource } from "./utils/config.js";
import type { OAuth2Credentials } from "./utils/config.js";
import { isTokenExpired, refreshAccessToken } from "./utils/oauth2.js";
import { XeetError, ErrorCode, ExitCode } from "./utils/errors.js";

let cachedClient: Client | null = null;
let cachedCreds: OAuth2Credentials | null = null;

export async function getClient(): Promise<Client> {
  // Cached OAuth2 — check expiry
  if (cachedClient && cachedCreds) {
    if (!isTokenExpired(cachedCreds.expiresAt)) {
      return cachedClient;
    }
    // Token expired, try refresh below
    cachedClient = null;
  }

  // Cached OAuth1 — no expiry concern
  if (cachedClient) return cachedClient;

  const creds = loadCredentials();
  if (!creds) {
    throw new XeetError(
      ErrorCode.AUTH_MISSING,
      "No credentials found. Run: xeet auth login --client-id <id>  (OAuth 2.0) or set XEET_API_KEY/XEET_API_SECRET/XEET_ACCESS_TOKEN/XEET_ACCESS_TOKEN_SECRET env vars (OAuth 1.0a)",
      ExitCode.AuthError,
    );
  }

  if (creds.authType === "oauth2") {
    let { accessToken, refreshToken, expiresAt, clientId, clientSecret, scope } = creds;

    if (isTokenExpired(expiresAt) && refreshToken && clientId) {
      try {
        const result = await refreshAccessToken(refreshToken, clientId, clientSecret);
        accessToken = result.accessToken;
        refreshToken = result.refreshToken;
        expiresAt = Date.now() + result.expiresIn * 1000;
        scope = result.scope || scope;

        // Persist refreshed tokens (only if credentials came from file)
        if (getCredentialSource() === "file") {
          saveOAuth2Tokens({
            authType: "oauth2",
            clientId,
            clientSecret,
            accessToken,
            refreshToken,
            expiresAt,
            scope,
          });
        }
      } catch {
        // Concurrent refresh: re-read file in case another process already refreshed
        const reloaded = loadCredentials();
        if (reloaded?.authType === "oauth2" && !isTokenExpired(reloaded.expiresAt)) {
          accessToken = reloaded.accessToken;
          refreshToken = reloaded.refreshToken;
          expiresAt = reloaded.expiresAt;
          scope = reloaded.scope;
        } else {
          throw new XeetError(
            ErrorCode.AUTH_EXPIRED,
            "OAuth 2.0 token expired and refresh failed. Run: xeet auth login --client-id <id>",
            ExitCode.AuthError,
          );
        }
      }
    }

    cachedCreds = { authType: "oauth2", clientId, clientSecret, accessToken, refreshToken, expiresAt, scope };
    cachedClient = new Client({ accessToken });
    return cachedClient;
  }

  // OAuth 1.0a
  const oauth1 = new OAuth1({
    apiKey: creds.apiKey,
    apiSecret: creds.apiSecret,
    callback: "oob",
    accessToken: creds.accessToken,
    accessTokenSecret: creds.accessTokenSecret,
  });

  cachedClient = new Client({ oauth1 });
  cachedCreds = null;
  return cachedClient;
}

export async function getAccessToken(): Promise<string> {
  // Ensure client is initialized and tokens are refreshed
  await getClient();

  if (!cachedCreds || cachedCreds.authType !== "oauth2") {
    throw new XeetError(
      ErrorCode.AUTH_INVALID,
      "Media upload requires OAuth 2.0. Run: xeet auth login --client-id <id>",
      ExitCode.AuthError,
    );
  }

  return cachedCreds.accessToken;
}

export async function getAuthenticatedUserId(): Promise<string> {
  const client = await getClient();
  const me = await client.users.getMe();
  if (!me.data?.id) {
    throw new XeetError(ErrorCode.AUTH_INVALID, "Failed to get authenticated user", ExitCode.AuthError);
  }
  return me.data.id;
}
