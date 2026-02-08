import { Command } from "commander";
import { getClient, getAccessToken } from "../client.js";
import { uploadMedia } from "../utils/media.js";
import { success, fail } from "../output.js";

async function resolveMediaIds(mediaPath?: string): Promise<string[] | undefined> {
  if (!mediaPath) return undefined;
  const token = await getAccessToken();
  const mediaId = await uploadMedia(token, mediaPath);
  return [mediaId];
}

export function registerPostCommands(program: Command): void {
  program
    .command("post <text>")
    .description("Create a new post")
    .option("--media <path>", "Attach an image (jpg/png/gif, max 5MB)")
    .action(async (text: string, opts: { media?: string }) => {
      try {
        const client = await getClient();
        const mediaIds = await resolveMediaIds(opts.media);
        const body: any = { text };
        if (mediaIds) body.media = { media_ids: mediaIds };
        const res = await client.posts.create(body);
        success(res.data);
      } catch (err) {
        fail(err);
      }
    });

  program
    .command("reply <id> <text>")
    .description("Reply to a post")
    .option("--media <path>", "Attach an image (jpg/png/gif, max 5MB)")
    .action(async (id: string, text: string, opts: { media?: string }) => {
      try {
        const client = await getClient();
        const mediaIds = await resolveMediaIds(opts.media);
        const body: any = {
          text,
          reply: { in_reply_to_tweet_id: id },
        };
        if (mediaIds) body.media = { media_ids: mediaIds };
        const res = await client.posts.create(body);
        success(res.data);
      } catch (err) {
        fail(err);
      }
    });

  program
    .command("quote <id> <text>")
    .description("Quote a post")
    .option("--media <path>", "Attach an image (jpg/png/gif, max 5MB)")
    .action(async (id: string, text: string, opts: { media?: string }) => {
      try {
        const client = await getClient();
        const mediaIds = await resolveMediaIds(opts.media);
        const body: any = {
          text,
          quote_tweet_id: id,
        };
        if (mediaIds) body.media = { media_ids: mediaIds };
        const res = await client.posts.create(body);
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
