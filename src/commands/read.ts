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
}
