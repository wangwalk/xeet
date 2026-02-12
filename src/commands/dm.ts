import { Command } from "commander";
import { getClient, getAuthenticatedUserId } from "../client.js";
import { success, fail } from "../output.js";

export function registerDmCommands(program: Command): void {
  const dm = program.command("dm").description("Direct message commands");

  dm.command("send <participant> <message>")
    .description("Send a direct message to a user by ID")
    .action(async (participant: string, message: string) => {
      try {
        const client = await getClient();
        const res = await client.directMessages.createByParticipantId(participant, {
          body: { text: message },
        } as any);
        success({ sent: true, event: res.data ?? {} });
      } catch (err) {
        fail(err);
      }
    });

  dm.command("inbox")
    .description("List recent DM events")
    .option("--limit <n>", "Max number of events", "20")
    .action(async (opts: { limit: string }) => {
      try {
        const client = await getClient();
        const limit = parseInt(opts.limit) || 20;
        const res = await client.directMessages.getEvents({
          maxResults: Math.min(limit, 100),
          eventTypes: ["MessageCreate"],
          dmEventFields: ["id", "text", "created_at", "sender_id", "dm_conversation_id"],
        } as any);
        success({
          events: res.data ?? [],
          meta: res.meta ?? {},
        });
      } catch (err) {
        fail(err);
      }
    });

  dm.command("conversation <conversation-id>")
    .description("Get messages in a conversation")
    .option("--limit <n>", "Max number of events", "20")
    .action(async (conversationId: string, opts: { limit: string }) => {
      try {
        const client = await getClient();
        const limit = parseInt(opts.limit) || 20;
        const res = await client.directMessages.getEventsByConversationId(conversationId, {
          maxResults: Math.min(limit, 100),
          dmEventFields: ["id", "text", "created_at", "sender_id"],
        } as any);
        success({
          events: res.data ?? [],
          meta: res.meta ?? {},
        });
      } catch (err) {
        fail(err);
      }
    });

  dm.command("reply <conversation-id> <message>")
    .description("Reply in an existing conversation")
    .action(async (conversationId: string, message: string) => {
      try {
        const client = await getClient();
        const res = await client.directMessages.createByConversationId(conversationId, {
          body: { text: message },
        } as any);
        success({ sent: true, event: res.data ?? {} });
      } catch (err) {
        fail(err);
      }
    });
}
