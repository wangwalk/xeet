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
  "referenced_tweets",
] as const;

const USER_FIELDS = ["id", "name", "username", "profile_image_url"] as const;

function parseSince(since: string | undefined): string | undefined {
  if (!since) return undefined;

  const match = since.match(/^(\d+)(m|h|d)$/);
  if (!match) return since; // assume ISO date

  const [, num, unit] = match;
  const ms = { m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
  return new Date(Date.now() - parseInt(num) * ms).toISOString();
}

export function registerTimelineCommand(program: Command): void {
  program
    .command("timeline [user]")
    .description("Get timeline (home or @user)")
    .option("--limit <n>", "Max number of posts", "20")
    .option("--since <time>", "Time filter (e.g. 2h, 30m, 1d, or ISO date)")
    .action(async (user: string | undefined, opts: { limit: string; since?: string }) => {
      try {
        const client = await getClient();
        const limit = parseInt(opts.limit) || 20;
        const startTime = parseSince(opts.since);

        if (user) {
          // User timeline: get user ID first
          const username = user.replace(/^@/, "");
          const userRes = await client.users.getByUsername(username);
          if (!userRes.data?.id) {
            fail({ code: "NOT_FOUND", message: `User @${username} not found` });
          }

          const res = await client.users.getPosts(userRes.data!.id, {
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
        } else {
          // Home timeline (reverse chronological)
          const userId = await getAuthenticatedUserId();
          const res = await client.users.getTimeline(userId, {
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
        }
      } catch (err) {
        fail(err);
      }
    });
}
