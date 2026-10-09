/**
 * Localized notification creation shared by web, native and the MCP server.
 *
 * Renders the text in each recipient's own language from `./templates`, then writes it through
 * the SECURITY DEFINER `create_notification` RPC. Best-effort: a failure is logged and never
 * propagates into the action that triggered it.
 */
import type { WishlistSupabaseClient } from "../supabase/types";
import {
  NOTIFICATION_TEMPLATES,
  renderNotificationText,
  type NotificationTemplateKey,
  type NotificationVars,
} from "./templates";

const DEFAULT_LOCALE = "en";

export type LocalizedNotification = {
  receiverId: string;
  key: NotificationTemplateKey;
  vars?: NotificationVars;
  entityId?: string | null;
};

type NotifierOptions = {
  log: (message: string, error: unknown) => void;
  /**
   * The acting user's display name; every template's `{name}` placeholder is the actor.
   * Defaults to the client's signed-in user, which session-less (bearer token) clients lack.
   */
  actorName?: () => Promise<string>;
};

export function createNotifier(client: WishlistSupabaseClient, options: NotifierOptions) {
  const { log } = options;

  async function sessionActorName(): Promise<string> {
    const {
      data: { user },
    } = await client.auth.getUser();
    const fullName =
      typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
    return fullName ?? user?.email ?? "Someone";
  }
  const actorName = options.actorName ?? sessionActorName;

  async function getRecipientLocales(userIds: string[]): Promise<Map<string, string>> {
    const { data, error } = await client.rpc("get_preferred_locales", { p_user_ids: userIds });
    if (error) throw error;
    const result = new Map<string, string>();
    for (const row of (data ?? []) as { user_id: string; preferred_locale: string | null }[]) {
      if (row.preferred_locale) result.set(row.user_id, row.preferred_locale);
    }
    return result;
  }

  /** Creates many localized notifications (fan-out); each recipient in their own language. */
  async function createLocalizedNotifications(
    notifications: LocalizedNotification[],
  ): Promise<void> {
    if (notifications.length === 0) return;
    try {
      const [locales, name] = await Promise.all([
        getRecipientLocales(notifications.map((n) => n.receiverId)),
        actorName(),
      ]);
      await Promise.all(
        notifications.map(async (n) => {
          const locale = locales.get(n.receiverId) ?? DEFAULT_LOCALE;
          const { type, iconType } = NOTIFICATION_TEMPLATES[n.key];
          const { error } = await client.rpc("create_notification", {
            p_receiver_id: n.receiverId,
            p_type: type,
            p_icon_type: iconType,
            p_text: renderNotificationText(n.key, { name, ...n.vars }, locale),
            p_entity_id: n.entityId ?? null,
          });
          if (error) throw error;
        }),
      );
    } catch (error) {
      log("[notifications] failed to create localized notification", error);
    }
  }

  return {
    createLocalizedNotifications,

    /** Creates one localized notification. No-op on failure. */
    createLocalizedNotification: (input: LocalizedNotification) =>
      createLocalizedNotifications([input]),

    /**
     * Notifies invitees of a Secret Santa event. Reads the created invites to use each invite id
     * as the notification entity (needed for accept/decline). No-op on failure.
     */
    async notifySecretSantaInvites(
      eventId: string,
      eventName: string,
      invitedUserIds: string[],
    ): Promise<void> {
      try {
        if (!invitedUserIds?.length) return;
        const { data, error } = await client
          .from("secret_santa_invites")
          .select("id, receiver_id")
          .eq("event_id", eventId)
          .in("receiver_id", invitedUserIds);
        if (error) throw error;
        await createLocalizedNotifications(
          ((data ?? []) as { id: string; receiver_id: string }[]).map((invite) => ({
            receiverId: invite.receiver_id,
            key: "secret_santa_invite" as const,
            vars: { event: eventName },
            entityId: invite.id,
          })),
        );
      } catch (error) {
        log("[notifications] failed to notify secret santa invites", error);
      }
    },

    /**
     * Tells every other participant that the organizer drew names, with the event id as the
     * notification entity so a tap opens the event. No-op on failure.
     */
    async notifySecretSantaStarted(eventId: string, participantIds: string[]): Promise<void> {
      try {
        if (!participantIds.length) return;
        const { data, error } = await client
          .from("secret_santa")
          .select("name")
          .eq("id", eventId)
          .single();
        if (error) throw error;
        const eventName = (data as { name?: string } | null)?.name ?? "";
        await createLocalizedNotifications(
          participantIds.map((receiverId) => ({
            receiverId,
            key: "secret_santa_started" as const,
            vars: { event: eventName },
            entityId: eventId,
          })),
        );
      } catch (error) {
        log("[notifications] failed to notify secret santa start", error);
      }
    },

    /**
     * Notifies a user that a wishlist was shared with them. The granter owns the wishlist, so
     * the title is read directly. No-op on failure (create_notification skips self / duplicates).
     */
    async notifyWishlistAccessGranted(wishlistId: string, receiverId: string): Promise<void> {
      try {
        const { data } = await client
          .from("wishlist")
          .select("title")
          .eq("id", wishlistId)
          .single();
        const title = (data as { title?: string } | null)?.title ?? "";
        await createLocalizedNotifications([
          { receiverId, key: "wishlist_access", vars: { title }, entityId: wishlistId },
        ]);
      } catch (error) {
        log("[notifications] failed to notify wishlist access", error);
      }
    },

    /**
     * Notifies the owner's friends about a newly created public/friends-only wishlist.
     * Recipients come from the server (access-checked). No-op on failure.
     */
    async notifyNewWishlist(wishlistId: string, title: string): Promise<void> {
      try {
        const { data, error } = await client.rpc("get_wishlist_friends_to_notify", {
          p_wishlist_id: wishlistId,
        });
        if (error) throw error;
        const friendIds = ((data ?? []) as unknown[]).map(String).filter(Boolean);
        await createLocalizedNotifications(
          friendIds.map((receiverId) => ({
            receiverId,
            key: "wishlist_created" as const,
            vars: { title },
            entityId: wishlistId,
          })),
        );
      } catch (error) {
        log("[notifications] failed to notify friends about new wishlist", error);
      }
    },
  };
}

export type Notifier = ReturnType<typeof createNotifier>;
