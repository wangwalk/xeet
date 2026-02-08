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
  "in_reply_to_user_id",
  "referenced_tweets",
  "lang",
  "source",
] as const;

const USER_FIELDS = ["id", "name", "username", "profile_image_url"] as const;

export function registerReadCommand(program: Command): void {
  program
    .command("read <id>")
    .description("Get a single post by ID")
    .action(async (id: string) => {
      try {
        const client = await getClient();
        const res = await client.posts.getById(id, {
          tweetFields: [...TWEET_FIELDS],
          expansions: ["author_id"],
          userFields: [...USER_FIELDS],
        });

        if (!res.data) {
          fail({ code: "NOT_FOUND", message: `Post ${id} not found` });
        }

        const author = res.includes?.users?.find((u: any) => u.id === res.data!.authorId);

        success({
          ...res.data,
          author: author || null,
        });
      } catch (err) {
        fail(err);
      }
    });

  program
    .command("lookup <ids...>")
    .description("Get multiple posts by IDs (up to 100)")
    .action(async (ids: string[]) => {
      try {
        const client = await getClient();
        const res = await client.posts.getByIds(ids, {
          tweetFields: [...TWEET_FIELDS],
          expansions: ["author_id"],
          userFields: [...USER_FIELDS],
        });

        success({
          posts: res.data ?? [],
          includes: res.includes ?? {},
        });
      } catch (err) {
        fail(err);
      }
    });

  program
    .command("liking-users <id>")
    .description("Get users who liked a post")
    .option("--limit <n>", "Max number of results", "50")
    .action(async (id: string, opts: { limit: string }) => {
      try {
        const client = await getClient();
        const limit = parseInt(opts.limit) || 50;
        const res = await client.posts.getLikingUsers(id, {
          maxResults: Math.min(limit, 100),
          userFields: ["id", "name", "username", "description", "public_metrics", "profile_image_url"],
        });

        success({
          users: res.data ?? [],
          meta: res.meta ?? {},
        });
      } catch (err) {
        fail(err);
      }
    });

  program
    .command("reposted-by <id>")
    .description("Get users who reposted a post")
    .option("--limit <n>", "Max number of results", "50")
    .action(async (id: string, opts: { limit: string }) => {
      try {
        const client = await getClient();
        const limit = parseInt(opts.limit) || 50;
        const res = await client.posts.getRepostedBy(id, {
          maxResults: Math.min(limit, 100),
          userFields: ["id", "name", "username", "description", "public_metrics", "profile_image_url"],
        });

        success({
          users: res.data ?? [],
          meta: res.meta ?? {},
        });
      } catch (err) {
        fail(err);
      }
    });

  program
    .command("hide-reply <id>")
    .description("Hide a reply to your post")
    .action(async (id: string) => {
      try {
        const client = await getClient();
        const res = await client.posts.hideReply(id, { body: { hidden: true } });
        success({ hidden: res.data?.hidden ?? true, id });
      } catch (err) {
        fail(err);
      }
    });

  program
    .command("unhide-reply <id>")
    .description("Unhide a reply to your post")
    .action(async (id: string) => {
      try {
        const client = await getClient();
        const res = await client.posts.hideReply(id, { body: { hidden: false } });
        success({ hidden: res.data?.hidden ?? false, id });
      } catch (err) {
        fail(err);
      }
    });
}
