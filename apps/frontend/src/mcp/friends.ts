import { z } from "zod";
import type { McpContext } from "./auth";
import type { Tools } from "./tools";
import { applyEach, checked, count, paged, ToolError } from "./results";
import { id, ids, search, page, text, description } from "./schemas";
import { groupReview, groupsReview, peopleReview } from "./review";

/** Only what an assistant needs to identify a person; no avatars or internal columns. */
function person(row: Record<string, unknown>, idKey = "id") {
  return { id: row[idKey], nickname: row.nickname, display_name: row.display_name ?? null };
}

export function friendTools(tools: Tools, ctx: McpContext) {
  const { db } = ctx;
  tools.add("list_friends", {
    title: "Find friends",
    description: "List and search your Wishlane friends.",
    schema: search,
    readOnly: true,
    run: async (input) => {
      const { rows, page } = paged(
        await checked(
          db.rpc("get_friends", {
            p_skip: input.offset,
            p_take: input.limit + 1,
            p_search: input.search ?? null,
          }),
        ),
        input,
      );
      return {
        friends: rows.map((row: Record<string, unknown>) => ({
          ...person(row, "friend_id"),
          wishlists_count: row.wishlists_count,
        })),
        ...page,
      };
    },
  });
  tools.add("search_people", {
    title: "Find people by nickname",
    description:
      "Find Wishlane users by nickname to invite or share with. Does not send an invitation.",
    schema: { query: text, ...page },
    readOnly: true,
    run: async (input) => {
      const { rows, page } = paged(
        await checked(
          db.rpc("search_profiles_by_nickname", {
            p_query: input.query,
            p_skip: input.offset,
            p_take: input.limit + 1,
          }),
        ),
        input,
      );
      return { people: rows.map((row: Record<string, unknown>) => person(row)), ...page };
    },
  });
  tools.add("list_friend_requests", {
    title: "View friend requests",
    description: "List your incoming or outgoing friend requests.",
    schema: { direction: z.enum(["incoming", "outgoing"]), ...page },
    readOnly: true,
    run: async (input) => {
      const { rows, page } = paged(
        await checked(
          db.rpc(
            input.direction === "incoming"
              ? "get_incoming_friend_requests_with_details"
              : "get_outgoing_friend_requests_with_details",
            { p_user_id: ctx.userId, p_skip: input.offset, p_take: input.limit + 1 },
          ),
        ),
        input,
      );
      return {
        requests: rows.map((row: Record<string, unknown>) => ({
          request_id: row.id,
          person: person(row, input.direction === "incoming" ? "sender_id" : "receiver_id"),
          created_at: row.created_at,
        })),
        ...page,
      };
    },
  });
  tools.add("send_friend_request", {
    title: "Send friend request",
    description: "Send a friend invitation to the selected Wishlane user and notify them.",
    schema: { receiver_id: id },
    confirm: { review: (input) => peopleReview(ctx, [input.receiver_id]) },
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
      await ctx.notifier.createLocalizedNotification({
        receiverId: receiver_id,
        key: "friend_request",
        entityId: ctx.userId,
      });
      return { message: "Friend request sent.", request_id: request.id };
    },
  });
  tools.add("respond_to_friend_requests", {
    title: "Respond to friend requests",
    description:
      "Accept or decline incoming requests, or cancel your outgoing requests, when the user asks. Pass every request the user answered the same way in one call. Accepting may grant access to friends-only wishlists.",
    schema: { request_ids: ids, response: z.enum(["accept", "decline", "cancel"]) },
    run: async ({ request_ids, response }) => {
      await applyEach(request_ids, async (requestId) => {
        if (response === "cancel") {
          const cancelled = await checked(
            db
              .from("friend_requests")
              .delete()
              .eq("id", requestId)
              .eq("sender_id", ctx.userId)
              .select("id"),
          );
          if (!cancelled?.length) throw new ToolError("This friend request is no longer pending.");
          return;
        }
        const sender = await checked(
          db.rpc(response === "accept" ? "accept_friend_request" : "reject_friend_request", {
            p_request_id: requestId,
          }),
        );
        if (sender)
          await ctx.notifier.createLocalizedNotification({
            receiverId: sender,
            key: response === "accept" ? "friend_accepted" : "friend_declined",
          });
      });
      const verb = { accept: "Accepted", decline: "Declined", cancel: "Cancelled" }[response];
      return { message: `${verb} ${count(request_ids.length, "friend request")}.`, request_ids };
    },
  });
  tools.add("remove_friends", {
    title: "Remove friends",
    description:
      "Remove one or more friendships. This changes access to friends-only wishlists. Pass every friend the user wants removed in one call so they confirm once.",
    schema: { user_ids: ids },
    confirm: { review: (input) => peopleReview(ctx, input.user_ids) },
    run: async ({ user_ids }) => {
      await checked(
        db
          .from("friends")
          .delete()
          .or(
            user_ids
              .flatMap((userId) => [
                `and(user_f.eq.${ctx.userId},user_s.eq.${userId})`,
                `and(user_f.eq.${userId},user_s.eq.${ctx.userId})`,
              ])
              .join(","),
          ),
      );
      return { message: `Removed ${count(user_ids.length, "friend")}.`, user_ids };
    },
  });
  tools.add("set_user_blocked", {
    title: "Block or unblock person",
    description:
      "Blocking also removes friendship and pending requests. Unblocking does not restore them.",
    schema: { user_id: id, blocked: z.boolean() },
    confirm: { review: (input) => peopleReview(ctx, [input.user_id]) },
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
    run: async (input) => {
      const { rows, page } = paged(
        await checked(
          db.rpc("get_blocked_users", {
            p_skip: input.offset,
            p_take: input.limit + 1,
            p_search: input.search ?? null,
          }),
        ),
        input,
      );
      return { people: rows.map((row: Record<string, unknown>) => person(row)), ...page };
    },
  });
  tools.add("list_friend_groups", {
    title: "View friend groups",
    description: "List your friend groups for wishlist sharing.",
    schema: search,
    readOnly: true,
    run: async (input) => {
      const { rows, page } = paged(
        await checked(
          db.rpc("get_friend_groups", {
            p_skip: input.offset,
            p_take: input.limit + 1,
            p_search: input.search ?? null,
          }),
        ),
        input,
      );
      return {
        groups: rows.map((row: Record<string, unknown>) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          member_count: row.member_count,
        })),
        ...page,
      };
    },
  });
  tools.add("get_friend_group_members", {
    title: "View group members",
    description: "List members of one of your friend groups.",
    schema: { group_id: id },
    readOnly: true,
    run: async ({ group_id }) => ({
      members: (
        (await checked(db.rpc("get_friend_group_members", { p_group_id: group_id }))) ?? []
      ).map((row: Record<string, unknown>) => person(row)),
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
    confirm: {
      review: async (input) => ({
        ...(input.group_id ? await groupReview(ctx, input.group_id) : {}),
        ...(await peopleReview(ctx, input.member_ids)),
      }),
    },
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
        await ctx.notifier.createLocalizedNotifications(
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
  tools.add("delete_friend_groups", {
    title: "Delete friend groups",
    description:
      "Delete one or more friend groups and their shared wishlist access. Pass every group the user wants removed in one call so they confirm once.",
    schema: { group_ids: ids },
    confirm: { review: (input) => groupsReview(ctx, input.group_ids) },
    run: async ({ group_ids }) => {
      // Fails before deleting anything if a group vanished or is not the caller's.
      await groupsReview(ctx, group_ids);
      await applyEach(group_ids, (groupId) =>
        checked(db.rpc("delete_friend_group", { p_group_id: groupId })),
      );
      return { message: `Deleted ${count(group_ids.length, "friend group")}.`, group_ids };
    },
  });
}
