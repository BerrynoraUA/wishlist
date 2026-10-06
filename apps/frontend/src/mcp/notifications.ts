import { z } from "zod";
import type { McpContext } from "./auth";
import type { Tools } from "./tools";
import { checked, ToolError } from "./results";
import { id, page } from "./schemas";

export function notificationTools(tools: Tools, ctx: McpContext) {
  const { db } = ctx;
  tools.add("list_gifting_notifications", {
    title: "View gifting notifications",
    description: "Read notifications about wishes, friends, sharing and Secret Santa.",
    schema: { ...page, unread_only: z.boolean().default(false) },
    readOnly: true,
    run: async (input) => ({
      notifications: await checked(
        db.rpc("get_user_notifications", {
          p_user_id: ctx.userId,
          p_limit: input.limit,
          p_offset: input.offset,
          p_unread_only: input.unread_only,
        }),
      ),
    }),
  });
  tools.add("mark_notifications_read", {
    title: "Mark notifications read",
    description:
      "Mark selected notifications as read, or explicitly select all unread notifications.",
    schema: {
      notification_ids: z.array(id).min(1).max(100).optional(),
      all: z.boolean().default(false),
    },
    idempotent: true,
    run: async ({ notification_ids, all }) => {
      let query = db.from("notifications").update({ is_read: true }).eq("receiver_id", ctx.userId);
      if (!all) {
        if (!notification_ids?.length) throw new ToolError("Choose notifications to mark as read.");
        query = query.in("id", notification_ids);
      }
      await checked(query);
      return { message: "Notifications marked as read." };
    },
  });
}
