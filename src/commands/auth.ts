import { Command } from "commander";
import { execSync } from "node:child_process";
import * as readline from "node:readline";
import {
  saveCredentials,
  saveOAuth2Tokens,
  getCredentialSource,
  getCredentialsPath,
  getAuthType,
  loadCredentials,
} from "../utils/config.js";
import { getClient } from "../client.js";
import { startPkceLogin } from "../utils/oauth2.js";
import { success, fail } from "../output.js";

function ask(rl: readline.Interface, q: string): Promise<string> {
  return new Promise((resolve) => rl.question(q, resolve));
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin" ? "open" :
    process.platform === "win32" ? "start" :
    "xdg-open";
  try {
    execSync(`${cmd} "${url}"`, { stdio: "ignore" });
  } catch {
    // Browser open failed — user will see the URL in output
  }
}

export function registerAuthCommands(program: Command): void {
  const auth = program.command("auth").description("Manage authentication");

  auth
    .command("login")
    .description("Authenticate with OAuth 2.0 PKCE (recommended)")
    .requiredOption("--client-id <id>", "OAuth 2.0 Client ID")
    .option("--client-secret <secret>", "OAuth 2.0 Client Secret (confidential clients)")
    .option("--port <port>", "Local callback server port", "8477")
    .action(async (opts: { clientId: string; clientSecret?: string; port: string }) => {
      try {
        const port = parseInt(opts.port) || 8477;
        const session = await startPkceLogin(opts.clientId, opts.clientSecret, port);

        process.stderr.write(`Opening browser for authorization...\n`);
        process.stderr.write(`If it doesn't open, visit:\n${session.authUrl}\n\n`);

        openBrowser(session.authUrl);

        process.stderr.write("Waiting for callback...\n");
        const tokens = await session.waitForCallback();

        saveOAuth2Tokens({
          authType: "oauth2",
          clientId: opts.clientId,
          clientSecret: opts.clientSecret,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: Date.now() + tokens.expiresIn * 1000,
          scope: tokens.scope,
        });

        success({
          message: "Authenticated with OAuth 2.0",
          path: getCredentialsPath(),
          scope: tokens.scope,
          expiresIn: tokens.expiresIn,
        });
      } catch (err) {
        fail(err);
      }
    });

  auth
    .command("setup")
    .description("Configure OAuth 1.0a credentials interactively")
    .action(async () => {
      try {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

        process.stdout.write("Enter your X API credentials (from https://developer.x.com)\n\n");

        const apiKey = await ask(rl, "API Key (Consumer Key): ");
        const apiSecret = await ask(rl, "API Secret (Consumer Secret): ");
        const accessToken = await ask(rl, "Access Token: ");
        const accessTokenSecret = await ask(rl, "Access Token Secret: ");

        rl.close();

        if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
          fail({ code: "INVALID_ARGS", message: "All four credentials are required" });
        }

        saveCredentials({
          authType: "oauth1",
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
          accessToken: accessToken.trim(),
          accessTokenSecret: accessTokenSecret.trim(),
        });

        success({
          message: "Credentials saved",
          path: getCredentialsPath(),
        });
      } catch (err) {
        fail(err);
      }
    });

  auth
    .command("status")
    .description("Check authentication status")
    .action(async () => {
      try {
        const source = getCredentialSource();
        const authType = getAuthType();

        if (source === "none") {
          success({
            authenticated: false,
            source: "none",
            authType: "none",
            message: "No credentials configured",
          });
          return;
        }

        const client = await getClient();
        const me = await client.users.getMe({
          userFields: ["id", "name", "username", "created_at", "public_metrics"],
        });

        const result: Record<string, unknown> = {
          authenticated: true,
          source,
          authType,
          user: me.data,
        };

        // Extra info for OAuth 2.0
        if (authType === "oauth2") {
          const creds = loadCredentials();
          if (creds?.authType === "oauth2") {
            result.expiresAt = creds.expiresAt > 0 ? new Date(creds.expiresAt).toISOString() : "unknown";
            result.scope = creds.scope || "unknown";
          }
        }

        success(result);
      } catch (err) {
        fail(err);
      }
    });
}
