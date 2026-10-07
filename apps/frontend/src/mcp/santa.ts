import { randomInt } from "node:crypto";
import { z } from "zod";
import { generateSecretSantaAssignment } from "@wishlist/backend/lib/secret-santa-assignment";
import type { McpContext } from "./auth";
import type { Tools } from "./tools";
import { applyEach, checked, count, safeItem, ToolError } from "./results";
import { id, ids, search, text, date, currency, imageUrl, page } from "./schemas";
import { requireEvent } from "./access";
import {
  eventReview,
  eventsReview,
  inviteReview,
  named,
  peopleReview,
  type Review,
} from "./review";

// Crypto-strength randomness for draws made on the server.
const secureRandom = () => randomInt(2 ** 32) / 2 ** 32;

/** Whether two reviews list the same participants, ignoring order. */
export function sameParticipants(first: Review, second: Review) {
  const ids = (value: unknown) =>
    Array.isArray(value) ? value.map((person) => person.id).sort() : [];
  return JSON.stringify(ids(first.participants)) === JSON.stringify(ids(second.participants));
}

export function santaTools(tools: Tools, ctx: McpContext) {
  const { db } = ctx;
  tools.add("list_secret_santa_events", {
    title: "Browse Secret Santa events",
    description: "List Secret Santa events you can access.",
    schema: search,
    readOnly: true,
    view: true,
    run: async (input) => ({
      kind: "events",
      ...(await checked(
        db.rpc("list_secret_santa_events", {
          p_search: input.search ?? null,
          p_limit: input.limit,
          p_offset: input.offset,
        }),
      )),
    }),
  });
  tools.add("get_secret_santa_event", {
    title: "View Secret Santa event",
    description:
      "View participants, invitations and your own assigned recipient. Never reveals another participant's assignment.",
    schema: { event_id: id },
    readOnly: true,
    view: true,
    run: async ({ event_id }) => ({ kind: "event", event: await requireEvent(ctx, event_id) }),
  });
  const eventFields = {
    name: text,
    event_date: date,
    budget: z.number().nonnegative().max(1000000),
    currency,
    image_url: imageUrl,
  };
  tools.add("create_secret_santa_event", {
    title: "Create Secret Santa event",
    description:
      "Create an event and optionally invite friends. Invitations are sent only after user confirmation.",
    schema: { ...eventFields, invited_user_ids: z.array(id).max(100).default([]) },
    confirm: {
      when: (input) => input.invited_user_ids.length > 0,
      review: (input) => peopleReview(ctx, input.invited_user_ids),
    },
    run: async (input) => {
      const event = await checked(
        db.rpc("create_secret_santa_event", {
          p_name: input.name,
          p_event_date: input.event_date,
          p_budget: input.budget,
          p_currency: input.currency,
          p_image_url: input.image_url ?? null,
          p_invited_user_ids: input.invited_user_ids,
        }),
      );
      await ctx.notifier.notifySecretSantaInvites(event.id, input.name, input.invited_user_ids);
      return { kind: "event", event };
    },
  });
  tools.add("update_secret_santa_event", {
    title: "Edit Secret Santa event",
    description: "Update the name, date, budget, currency or image of an event you own.",
    schema: {
      event_id: id,
      changes: z
        .object(eventFields)
        .partial()
        .strict()
        .refine((value) => Object.keys(value).length > 0),
    },
    idempotent: true,
    view: true,
    run: async ({ event_id, changes }) => {
      await requireEvent(ctx, event_id, "own");
      const event = await checked(
        db
          .from("secret_santa")
          .update(changes)
          .eq("id", event_id)
          .eq("owner_id", ctx.userId)
          .select("id,name,event_date,budget,currency,image_url")
          .single(),
      );
      return { kind: "event", event };
    },
  });
  tools.add("delete_secret_santa_events", {
    title: "Delete Secret Santa events",
    description:
      "Delete one or more events you own, including their invitations and assignments. Pass every event the user wants removed in one call so they confirm once.",
    schema: { event_ids: ids },
    confirm: { review: (input) => eventsReview(ctx, input.event_ids) },
    run: async ({ event_ids }) => {
      await Promise.all(event_ids.map((eventId) => requireEvent(ctx, eventId, "own")));
      await applyEach(event_ids, (eventId) =>
        checked(db.rpc("delete_secret_santa_event", { p_event_id: eventId })),
      );
      return { message: `Deleted ${count(event_ids.length, "Secret Santa event")}.`, event_ids };
    },
  });
  tools.add("respond_to_secret_santa_invite", {
    title: "Respond to Secret Santa invitation",
    description:
      "Accept or decline your Secret Santa invitation. Use the invitation ID from notifications or event details.",
    schema: { invite_id: id, response: z.enum(["accept", "decline"]) },
    confirm: { review: (input) => inviteReview(ctx, input.invite_id) },
    run: async ({ invite_id, response }) => {
      await checked(
        db.rpc(
          response === "accept" ? "accept_secret_santa_invite" : "decline_secret_santa_invite",
          { p_invite_id: invite_id },
        ),
      );
      return { message: "Invitation updated.", invite_id };
    },
  });
  tools.add("join_secret_santa_event", {
    title: "Join your Secret Santa event",
    description: "Join an event you organize. Other users must accept their invitation.",
    schema: { event_id: id },
    confirm: { review: (input) => eventReview(ctx, input.event_id) },
    run: async ({ event_id }) => {
      const event = await requireEvent(ctx, event_id, "own");
      if (event.is_started) throw new ToolError("The event has already started.");
      await checked(
        db
          .from("secret_santa_participants")
          .upsert({ event_id, user_id: ctx.userId }, { onConflict: "event_id,user_id" }),
      );
      return { message: "Joined Secret Santa.", event_id };
    },
  });
  tools.add("remove_secret_santa_participants", {
    title: "Remove Secret Santa participants",
    description:
      "Remove one or more participants from an event before the draw. Only the organizer can remove others; participants may remove themselves. Pass every participant the user wants removed in one call so they confirm once.",
    schema: { event_id: id, user_ids: ids },
    confirm: {
      review: async (input) => ({
        event: (await requireEvent(ctx, input.event_id)).name,
        ...(await peopleReview(ctx, input.user_ids)),
      }),
    },
    run: async ({ event_id, user_ids }) => {
      // Participants may remove themselves; removing anyone else needs the organizer.
      const onlySelf = user_ids.every((userId) => userId === ctx.userId);
      const event = await requireEvent(ctx, event_id, onlySelf ? "view" : "own");
      if (event.is_started) throw new ToolError("Participants cannot be removed after the draw.");
      await checked(
        db
          .from("secret_santa_participants")
          .delete()
          .eq("event_id", event_id)
          .in("user_id", user_ids),
      );
      return { message: `Removed ${count(user_ids.length, "participant")}.`, event_id };
    },
  });
  tools.add("cancel_secret_santa_invites", {
    title: "Cancel Secret Santa invitations",
    description:
      "Cancel one or more pending invitations for an event you organize. Pass every invitation the user wants cancelled in one call so they confirm once.",
    schema: { event_id: id, invite_ids: ids },
    confirm: {
      review: async (input) => {
        const event = await requireEvent(ctx, input.event_id);
        return {
          event: event.name,
          ...named(
            "invitation",
            "invitations",
            event.pending_invites
              .filter((invite) => input.invite_ids.includes(invite.invite_id))
              .map((invite) => invite.display_name || invite.nickname || "Wishlane member"),
          ),
        };
      },
    },
    run: async ({ event_id, invite_ids }) => {
      const event = await requireEvent(ctx, event_id, "own");
      const pending = new Set(event.pending_invites.map((invite) => invite.invite_id));
      if (!invite_ids.every((inviteId) => pending.has(inviteId)))
        throw new ToolError(
          "Some of these invitations are no longer pending in the selected event.",
        );
      await applyEach(invite_ids, (inviteId) =>
        checked(db.rpc("remove_secret_santa_invite", { p_invite_id: inviteId })),
      );
      return { message: `Cancelled ${count(invite_ids.length, "invitation")}.`, invite_ids };
    },
  });
  tools.add("launch_secret_santa", {
    title: "Launch Secret Santa",
    description:
      "Launch an event you own. Generates assignments privately on the server, respects exclusions, and notifies participants. Cannot be undone by this tool. Never provide or request the full assignment map.",
    schema: {
      event_id: id,
      exclusions: z
        .array(z.object({ user_id: id, excluded_ids: z.array(id).max(100) }).strict())
        .max(100)
        .default([]),
    },
    confirm: {
      review: (input) => eventReview(ctx, input.event_id),
      // The draw must use exactly the participants the user approved.
      recheck: async (reviewed, input) => {
        if (!sameParticipants(reviewed, await eventReview(ctx, input.event_id)))
          throw new ToolError(
            "The participant list changed. Request a new review before drawing names.",
          );
      },
    },
    run: async ({ event_id, exclusions }) => {
      const event = await requireEvent(ctx, event_id, "own");
      if (event.is_started) throw new ToolError("This Secret Santa event has already started.");
      const participants = event.participants.map((person) => person.id);
      if (participants.length < 2 || participants.length > 100)
        throw new ToolError("The draw requires between 2 and 100 participants.");
      const excluded = new Map<string, Set<string>>();
      for (const row of exclusions) {
        if (
          !participants.includes(row.user_id) ||
          row.excluded_ids.some((value) => !participants.includes(value))
        )
          throw new ToolError("Exclusions must refer to current participants.");
        excluded.set(
          row.user_id,
          new Set([...(excluded.get(row.user_id) ?? []), ...row.excluded_ids]),
        );
      }
      const assignment = generateSecretSantaAssignment(participants, excluded, secureRandom);
      if (!assignment)
        throw new ToolError(
          "These exclusions make a valid draw impossible. Relax them and request a new review.",
        );
      await checked(
        db.rpc("launch_secret_santa", {
          p_event_id: event_id,
          p_assignments: Array.from(assignment, ([user_id, receiver_id]) => ({
            user_id,
            receiver_id,
          })),
        }),
      );
      await ctx.notifier.notifySecretSantaStarted(event_id, participants);
      return {
        message: "Secret Santa launched. Each participant can now see their receiver.",
        event_id,
      };
    },
  });
  tools.add("get_secret_santa_recipient_wishes", {
    title: "View your receiver's items",
    description:
      "Get accessible wishes for your own assigned recipient within the event budget. Does not reveal anyone else's assignment.",
    schema: { event_id: id, ...page },
    readOnly: true,
    view: true,
    run: async ({ event_id, limit, offset }) => {
      const { my_receiver: recipient, budget } = await requireEvent(ctx, event_id);
      if (!recipient) throw new ToolError("You do not have an assigned recipient yet.");
      const data = await checked(
        db.rpc("get_user_visible_items_by_max_price", {
          p_user_id: recipient.id,
          p_max_price: budget,
          p_limit: limit,
          p_offset: offset,
        }),
      );
      return {
        kind: "items",
        recipient,
        items: (data.items ?? []).map((row: Record<string, unknown>) =>
          safeItem(row, ctx.userId, recipient.id),
        ),
        total: data.total,
        limit,
        offset,
      };
    },
  });
}
