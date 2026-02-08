import { Command } from "commander";
import { getClient, getAuthenticatedUserId } from "../client.js";
import { success, fail } from "../output.js";

const USER_FIELDS = [
  "id",
  "name",
  "username",
  "description",
  "created_at",
  "profile_image_url",
  "public_metrics",
  "verified",
  "location",
  "url",
  "pinned_tweet_id",
] as const;

export function registerUserCommand(program: Command): void {
  program
    .command("user <username>")
    .description("Get user profile information")
    .action(async (username: string) => {
      try {
        const client = await getClient();
        const name = username.replace(/^@/, "");

        const res = await client.users.getByUsername(name, {
          userFields: [...USER_FIELDS],
          expansions: ["pinned_tweet_id"],
          tweetFields: ["id", "text", "created_at", "public_metrics"],
        });

        if (!res.data) {
          fail({ code: "NOT_FOUND", message: `User @${name} not found` });
        }

        success({
          ...res.data,
          pinned_tweet: res.includes?.tweets?.[0] ?? null,
        });
      } catch (err) {
        fail(err);
      }
    });

  program
    .command("followers <username>")
    .description("Get followers of a user")
    .option("--limit <n>", "Max number of results", "50")
    .action(async (username: string, opts: { limit: string }) => {
      try {
        const client = await getClient();
        const name = username.replace(/^@/, "");
        const limit = parseInt(opts.limit) || 50;

        const userRes = await client.users.getByUsername(name);
        if (!userRes.data?.id) {
          fail({ code: "NOT_FOUND", message: `User @${name} not found` });
        }

        const res = await client.users.getFollowers(userRes.data!.id, {
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
    .command("following <username>")
    .description("Get users that a user is following")
    .option("--limit <n>", "Max number of results", "50")
    .action(async (username: string, opts: { limit: string }) => {
      try {
        const client = await getClient();
        const name = username.replace(/^@/, "");
        const limit = parseInt(opts.limit) || 50;

        const userRes = await client.users.getByUsername(name);
        if (!userRes.data?.id) {
          fail({ code: "NOT_FOUND", message: `User @${name} not found` });
        }

        const res = await client.users.getFollowing(userRes.data!.id, {
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
    .command("liked")
    .description("Get posts liked by the authenticated user")
    .option("--limit <n>", "Max number of results", "20")
    .action(async (opts: { limit: string }) => {
      try {
        const client = await getClient();
        const userId = await getAuthenticatedUserId();
        const limit = parseInt(opts.limit) || 20;

        const res = await client.users.getLikedPosts(userId, {
          maxResults: Math.min(limit, 100),
          tweetFields: ["id", "text", "author_id", "created_at", "public_metrics"],
          expansions: ["author_id"],
          userFields: ["id", "name", "username", "profile_image_url"],
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

  program
    .command("bookmarks")
    .description("Get posts bookmarked by the authenticated user")
    .option("--limit <n>", "Max number of results", "20")
    .action(async (opts: { limit: string }) => {
      try {
        const client = await getClient();
        const userId = await getAuthenticatedUserId();
        const limit = parseInt(opts.limit) || 20;

        const res = await client.users.getBookmarks(userId, {
          maxResults: Math.min(limit, 100),
          tweetFields: ["id", "text", "author_id", "created_at", "public_metrics"],
          expansions: ["author_id"],
          userFields: ["id", "name", "username", "profile_image_url"],
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
