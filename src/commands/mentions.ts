import { Command } from "commander";
import { getClient, getAuthenticatedUserId } from "../client.js";
import { success, fail } from "../output.js";

const TWEET_FIELDS = [
  "id",
  "text",
  "author_id",
  "created_at",
  "public_metrics",
  "conversation_id",
  "in_reply_to_user_id",
  "referenced_tweets",
] as const;

const USER_FIELDS = ["id", "name", "username", "profile_image_url"] as const;

export function registerMentionsCommand(program: Command): void {
  program
    .command("mentions")
    .description("Get posts mentioning the authenticated user")
    .option("--limit <n>", "Max number of results", "20")
    .option("--since <time>", "Time filter (e.g. 2h, 30m, 1d, or ISO date)")
    .action(async (opts: { limit: string; since?: string }) => {
      try {
        const client = await getClient();
        const userId = await getAuthenticatedUserId();
        const limit = parseInt(opts.limit) || 20;

        let startTime: string | undefined;
        if (opts.since) {
          const match = opts.since.match(/^(\d+)(m|h|d)$/);
          if (match) {
            const [, num, unit] = match;
            const ms = { m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
            startTime = new Date(Date.now() - parseInt(num) * ms).toISOString();
          } else {
            startTime = opts.since;
          }
        }

        const res = await client.users.getMentions(userId, {
          maxResults: Math.min(limit, 100),
          tweetFields: [...TWEET_FIELDS],
          expansions: ["author_id"],
          userFields: [...USER_FIELDS],
          ...(startTime && { startTime }),
        });

        success({
          posts: res.data ?? [],
          includes: res.includes ?? {},
          meta: res.meta ?? {},
        });
      } catch (err) {
        fail(err);
      }
    });
}
