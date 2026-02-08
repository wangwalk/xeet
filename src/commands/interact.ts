import { Command } from "commander";
import { getClient, getAuthenticatedUserId } from "../client.js";
import { success, fail } from "../output.js";

export function registerInteractCommands(program: Command): void {
  program
    .command("like <id>")
    .description("Like a post")
    .action(async (id: string) => {
      try {
        const client = await getClient();
        const userId = await getAuthenticatedUserId();
        const res = await client.users.likePost(userId, { body: { tweet_id: id } } as any);
        success({ liked: res.data?.liked ?? true, id });
      } catch (err) {
        fail(err);
      }
    });

  program
    .command("repost <id>")
    .description("Repost (retweet) a post")
    .action(async (id: string) => {
      try {
        const client = await getClient();
        const userId = await getAuthenticatedUserId();
        const res = await client.users.repostPost(userId, { body: { tweet_id: id } } as any);
        success({ reposted: res.data?.retweeted ?? true, id });
      } catch (err) {
        fail(err);
      }
    });

  program
    .command("bookmark <id>")
    .description("Bookmark a post")
    .action(async (id: string) => {
      try {
        const client = await getClient();
        const userId = await getAuthenticatedUserId();
        const res = await client.users.createBookmark(userId, { tweet_id: id } as any);
        success({ bookmarked: res.data?.bookmarked ?? true, id });
      } catch (err) {
        fail(err);
      }
    });
}
