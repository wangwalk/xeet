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

  program
    .command("unlike <id>")
    .description("Unlike a post")
    .action(async (id: string) => {
      try {
        const client = await getClient();
        const userId = await getAuthenticatedUserId();
        const res = await client.users.unlikePost(userId, id);
        success({ unliked: res.data?.liked === false, id });
      } catch (err) {
        fail(err);
      }
    });

  program
    .command("unrepost <id>")
    .description("Undo a repost (unretweet)")
    .action(async (id: string) => {
      try {
        const client = await getClient();
        const userId = await getAuthenticatedUserId();
        const res = await client.users.unrepostPost(userId, id);
        success({ unreposted: res.data?.retweeted === false, id });
      } catch (err) {
        fail(err);
      }
    });

  program
    .command("unbookmark <id>")
    .description("Remove a bookmark")
    .action(async (id: string) => {
      try {
        const client = await getClient();
        const userId = await getAuthenticatedUserId();
        const res = await client.users.deleteBookmark(userId, id);
        success({ unbookmarked: res.data?.bookmarked === false, id });
      } catch (err) {
        fail(err);
      }
    });
}
