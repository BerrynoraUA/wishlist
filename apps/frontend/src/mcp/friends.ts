import { z } from "zod";
import type { McpContext } from "./auth";
import type { Tools } from "./tools";
import { checked, ToolError } from "./results";
import { id, search, page, text, description } from "./schemas";
import { notify } from "./notifications";

export function friendTools(tools: Tools, ctx: McpContext) {
  const { db } = ctx;
  tools.add("list_friends", {
    title: "Find friends",
    description: "List and search your Wishlane friends.",
    schema: search,
    readOnly: true,
    run: async (input) => ({
      friends: await checked(
        db.rpc("get_friends", {
          p_skip: input.offset,
          p_take: input.limit,
          p_search: input.search ?? null,
        }),
      ),
      offset: input.offset,
      limit: input.limit,
    }),
  });
  tools.add("search_people", {
    title: "Find people by nickname",
    description:
      "Find Wishlane users by nickname to invite or share with. Does not send an invitation.",
    schema: { query: text, ...page },
    readOnly: true,
    run: async (input) => ({
      people: await checked(
        db.rpc("search_profiles_by_nickname", {
          p_query: input.query,
          p_skip: input.offset,
          p_take: input.limit,
        }),
      ),
    }),
  });
  tools.add("list_friend_requests", {
    title: "View friend requests",
    description: "List your incoming or outgoing friend requests.",
    schema: { direction: z.enum(["incoming", "outgoing"]), ...page },
    readOnly: true,
    run: async (input) => ({
      requests: await checked(
        db.rpc(
          input.direction === "incoming"
            ? "get_incoming_friend_requests_with_details"
            : "get_outgoing_friend_requests_with_details",
          { p_user_id: ctx.userId, p_skip: input.offset, p_take: input.limit },
        ),
      ),
    }),
  });
  tools.add("send_friend_request", {
    title: "Send friend request",
    description: "Send a friend invitation to the selected Wishlane user and notify them.",
    schema: { receiver_id: id },
    confirm: true,
    run: async ({ receiver_id }) => {
      if (receiver_id === ctx.userId) throw new ToolError("You cannot invite yourself.");
      const request = await checked(
        db
          .from("friend_requests")
          .insert({ sender_id: ctx.userId, receiver_id, status: 0 })
          .select("id")
          .single(),
      );
      if (!request) throw new ToolError("Unable to send this request.");
      await notify(ctx, [{ receiverId: receiver_id, key: "friend_request", entityId: ctx.userId }]);
      return { message: "Friend request sent.", request_id: request.id };
    },
  });
  tools.add("respond_to_friend_request", {
    title: "Respond to friend request",
    description:
      "Accept or decline an incoming request, or cancel your outgoing request. Accepting may grant access to friends-only wishlists.",
    schema: { request_id: id, response: z.enum(["accept", "decline", "cancel"]) },
    confirm: true,
    run: async ({ request_id, response }) => {
      if (response === "cancel") {
        await checked(
          db.from("friend_requests").delete().eq("id", request_id).eq("sender_id", ctx.userId),
        );
      } else {
        const sender = await checked(
          db.rpc(response === "accept" ? "accept_friend_request" : "reject_friend_request", {
            p_request_id: request_id,
          }),
        );
        if (sender)
          await notify(ctx, [
            {
              receiverId: sender,
              key: response === "accept" ? "friend_accepted" : "friend_declined",
            },
          ]);
      }
      return { message: "Friend request updated.", request_id };
    },
  });
  tools.add("remove_friend", {
    title: "Remove friend",
    description: "Remove a friendship. This changes access to friends-only wishlists.",
    schema: { user_id: id },
    confirm: true,
    run: async ({ user_id }) => {
      await checked(
        db
          .from("friends")
          .delete()
          .or(
            `and(user_f.eq.${ctx.userId},user_s.eq.${user_id}),and(user_f.eq.${user_id},user_s.eq.${ctx.userId})`,
          ),
      );
      return { message: "Friend removed.", user_id };
    },
  });
  tools.add("set_user_blocked", {
    title: "Block or unblock person",
    description:
      "Blocking also removes friendship and pending requests. Unblocking does not restore them.",
    schema: { user_id: id, blocked: z.boolean() },
    confirm: true,
    run: async ({ user_id, blocked }) => {
      await checked(db.rpc(blocked ? "block_user" : "unblock_user", { p_user_id: user_id }));
      return { user_id, blocked };
    },
  });
  tools.add("list_blocked_people", {
    title: "View blocked people",
    description: "List people you have blocked.",
    schema: search,
    readOnly: true,
    run: async (input) => ({
      people: await checked(
        db.rpc("get_blocked_users", {
          p_skip: input.offset,
          p_take: input.limit,
          p_search: input.search ?? null,
        }),
      ),
    }),
  });
  tools.add("list_friend_groups", {
    title: "View friend groups",
    description: "List your friend groups for wishlist sharing.",
    schema: search,
    readOnly: true,
    run: async (input) => ({
      groups: await checked(
        db.rpc("get_friend_groups", {
          p_skip: input.offset,
          p_take: input.limit,
          p_search: input.search ?? null,
        }),
      ),
    }),
  });
  tools.add("get_friend_group_members", {
    title: "View group members",
    description: "List members of one of your friend groups.",
    schema: { group_id: id },
    readOnly: true,
    run: async ({ group_id }) => ({
      members: await checked(db.rpc("get_friend_group_members", { p_group_id: group_id })),
    }),
  });
  const groupFields = {
    name: text,
    description,
    color: z.enum(["pink", "blue", "peach", "mint", "lavender"]).default("pink"),
    icon: text.default("users"),
    member_ids: z.array(id).max(100).default([]),
  };
  tools.add("save_friend_group", {
    title: "Create or update friend group",
    description:
      "Create a friend group or replace its details and membership. Supply the complete intended member list. Membership can change access to shared wishlists and notifies added members.",
    schema: { group_id: id.optional(), ...groupFields },
    confirm: true,
    run: async (input) => {
      const group = await checked(
        db.rpc(input.group_id ? "update_friend_group" : "create_friend_group", {
          ...(input.group_id ? { p_group_id: input.group_id } : {}),
          p_name: input.name,
          p_description: input.description ?? null,
          p_color: input.color,
          p_icon: input.icon,
          p_member_ids: input.member_ids,
        }),
      );
      const groupId = input.group_id ?? group?.id;
      if (groupId)
        await notify(
          ctx,
          input.member_ids.map((receiverId) => ({
            receiverId,
            key: "group_added" as const,
            vars: { group: input.name },
            entityId: groupId,
          })),
        );
      return { group };
    },
  });
  tools.add("delete_friend_group", {
    title: "Delete friend group",
    description: "Delete a friend group and its shared wishlist access.",
    schema: { group_id: id },
    confirm: true,
    run: async ({ group_id }) => {
      await checked(db.rpc("delete_friend_group", { p_group_id: group_id }));
      return { message: "Friend group deleted.", group_id };
    },
  });
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
      if (!all && !notification_ids?.length)
        throw new ToolError("Choose notifications to mark as read.");
      let query = db.from("notifications").update({ is_read: true }).eq("receiver_id", ctx.userId);
      if (!all) query = query.in("id", notification_ids!);
      await checked(query);
      return { message: "Notifications marked as read." };
    },
  });
}
