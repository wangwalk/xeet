import { Command } from "commander";
import { getClient } from "../client.js";
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

export function registerSearchCommand(program: Command): void {
  program
    .command("search <query>")
    .description("Search for posts")
    .option("--limit <n>", "Max number of results", "20")
    .option("--sort <order>", "Sort order: recency or relevancy", "recency")
    .action(async (query: string, opts: { limit: string; sort: string }) => {
      try {
        const client = await getClient();
        let limit = parseInt(opts.limit) || 20;
        if (limit < 10) {
          process.stderr.write(`Note: --limit minimum is 10 for search (got ${limit}), using 10\n`);
          limit = 10;
        }

        const res = await client.posts.searchRecent(query, {
          maxResults: Math.min(limit, 100),
          tweetFields: [...TWEET_FIELDS],
          expansions: ["author_id"],
          userFields: [...USER_FIELDS],
          sortOrder: opts.sort as "recency" | "relevancy",
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
