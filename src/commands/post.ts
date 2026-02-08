import { Command } from "commander";
import { getClient } from "../client.js";
import { success, fail } from "../output.js";

export function registerPostCommands(program: Command): void {
  program
    .command("post <text>")
    .description("Create a new post")
    .action(async (text: string) => {
      try {
        const client = await getClient();
        const res = await client.posts.create({ text });
        success(res.data);
      } catch (err) {
        fail(err);
      }
    });

  program
    .command("reply <id> <text>")
    .description("Reply to a post")
    .action(async (id: string, text: string) => {
      try {
        const client = await getClient();
        const res = await client.posts.create({
          text,
          reply: { in_reply_to_tweet_id: id } as any,
        });
        success(res.data);
      } catch (err) {
        fail(err);
      }
    });

  program
    .command("quote <id> <text>")
    .description("Quote a post")
    .action(async (id: string, text: string) => {
      try {
        const client = await getClient();
        const res = await client.posts.create({
          text,
          quote_tweet_id: id,
        } as any);
        success(res.data);
      } catch (err) {
        fail(err);
      }
    });

  program
    .command("thread <texts...>")
    .description("Post a thread (multiple posts in sequence)")
    .action(async (texts: string[]) => {
      try {
        if (texts.length < 2) {
          fail({ code: "INVALID_ARGS", message: "Thread requires at least 2 posts" });
        }

        const client = await getClient();
        const posted: any[] = [];

        // First post
        const first = await client.posts.create({ text: texts[0] });
        posted.push(first.data);

        // Subsequent replies
        let lastId = first.data?.id;
        for (let i = 1; i < texts.length; i++) {
          if (!lastId) break;
          const next = await client.posts.create({
            text: texts[i],
            reply: { in_reply_to_tweet_id: lastId } as any,
          });
          posted.push(next.data);
          lastId = next.data?.id;
        }

        success({ thread: posted });
      } catch (err) {
        fail(err);
      }
    });

  program
    .command("delete <id>")
    .description("Delete a post")
    .action(async (id: string) => {
      try {
        const client = await getClient();
        const res = await client.posts.delete(id);
        success({ id, deleted: res.data?.deleted ?? true });
      } catch (err) {
        fail(err);
      }
    });
}
