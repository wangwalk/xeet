import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { generateCodeVerifier, generateCodeChallenge } from "@xdevplatform/xdk";

const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutes

const SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "like.read",
  "like.write",
  "bookmark.read",
  "bookmark.write",
  "follows.read",
  "offline.access",
];

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  scope: string;
}

export interface PkceLoginSession {
  authUrl: string;
  waitForCallback(): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    scope: string;
  }>;
}

export function isTokenExpired(expiresAt: number): boolean {
  if (expiresAt === 0) return false; // unknown (env-sourced), assume valid
  return Date.now() >= expiresAt - REFRESH_MARGIN_MS;
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret?: string,
): Promise<RefreshResult> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (clientSecret) {
    headers["Authorization"] =
      "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope ?? "",
  };
}

export async function startPkceLogin(
  clientId: string,
  clientSecret?: string,
  port = 8477,
): Promise<PkceLoginSession> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateCodeVerifier(32); // reuse as random state
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `${AUTHORIZE_URL}?${params.toString()}`;

  return {
    authUrl,
    waitForCallback() {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          server.close();
          reject(new Error("Login timed out after 2 minutes"));
        }, 2 * 60 * 1000);

        const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
          const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);

          if (url.pathname !== "/callback") {
            res.writeHead(404);
            res.end("Not found");
            return;
          }

          const code = url.searchParams.get("code");
          const returnedState = url.searchParams.get("state");
          const error = url.searchParams.get("error");

          if (error) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end(`<html><body><h1>Authorization failed</h1><p>${error}</p></body></html>`);
            clearTimeout(timeout);
            server.close();
            reject(new Error(`Authorization denied: ${error}`));
            return;
          }

          if (returnedState !== state) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<html><body><h1>State mismatch</h1><p>Possible CSRF attack.</p></body></html>");
            clearTimeout(timeout);
            server.close();
            reject(new Error("State mismatch — possible CSRF attack"));
            return;
          }

          if (!code) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<html><body><h1>Missing code</h1></body></html>");
            clearTimeout(timeout);
            server.close();
            reject(new Error("No authorization code received"));
            return;
          }

          try {
            const tokens = await exchangeCode(code, codeVerifier, clientId, clientSecret, redirectUri);

            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(
              "<html><body><h1>Authorized!</h1><p>You can close this tab and return to the terminal.</p></body></html>",
            );
            clearTimeout(timeout);
            server.close();
            resolve(tokens);
          } catch (err) {
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end(`<html><body><h1>Token exchange failed</h1><p>${err}</p></body></html>`);
            clearTimeout(timeout);
            server.close();
            reject(err);
          }
        });

        server.listen(port, "127.0.0.1", () => {
          // server ready
        });

        server.on("error", (err) => {
          clearTimeout(timeout);
          reject(new Error(`Failed to start callback server on port ${port}: ${err.message}`));
        });
      });
    },
  };
}

async function exchangeCode(
  code: string,
  codeVerifier: string,
  clientId: string,
  clientSecret: string | undefined,
  redirectUri: string,
): Promise<RefreshResult> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: clientId,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (clientSecret) {
    headers["Authorization"] =
      "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope ?? "",
  };
}
