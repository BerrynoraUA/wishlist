/**
 * Client-side creation of localized notifications (web).
 *
 * Mirrors apps/native/lib/create-notification.ts: renders the text in each recipient's own
 * language from the pre-translated GT catalogs, then writes it via the SECURITY DEFINER
 * `create_notification` RPC. Best-effort — never throws into the calling action.
 *
 * Translations come from the shared `@wishlist/backend/notifications/translations` dictionary,
 * so web renders all supported locales the same as native. English is the fallback.
 */
import {
  NOTIFICATION_TEMPLATES,
  renderNotificationText,
  type NotificationTemplateKey,
  type NotificationVars,
} from "@wishlist/backend/notifications/templates";
import { supabaseBrowser } from "@/lib/supabase-browser";

const DEFAULT_LOCALE = "en";

/**
 * The acting user's display name. Every template's `{name}` placeholder is the actor, so the
 * helper fills it automatically and callers only pass entity-specific vars ({title}/{group}/…).
 */
async function getActorName(): Promise<string> {
  const {
    data: { user },
  } = await supabaseBrowser.auth.getUser();
  const fullName =
    typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
  return fullName ?? user?.email ?? "Someone";
}

async function getRecipientLocales(userIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (userIds.length === 0) return result;

  const { data, error } = await supabaseBrowser.rpc("get_preferred_locales", {
    p_user_ids: userIds,
  });
  if (error) throw error;

  for (const row of (data ?? []) as { user_id: string; preferred_locale: string | null }[]) {
    if (row.preferred_locale) result.set(row.user_id, row.preferred_locale);
  }
  return result;
}

export type LocalizedNotification = {
  receiverId: string;
  key: NotificationTemplateKey;
  vars: NotificationVars;
  entityId?: string | null;
};

/** Creates one localized notification. No-op on failure. */
export async function createLocalizedNotification(input: LocalizedNotification): Promise<void> {
  await createLocalizedNotifications([input]);
}

/**
 * Notifies invitees of a Secret Santa event. Reads the created invites to use each invite id as
 * the notification entity (needed for accept/decline). No-op on failure.
 */
export async function notifySecretSantaInvites(
  eventId: string,
  eventName: string,
  invitedUserIds: string[],
): Promise<void> {
  try {
    if (!invitedUserIds?.length) return;

    const { data, error } = await supabaseBrowser
      .from("secret_santa_invites")
      .select("id, receiver_id")
      .eq("event_id", eventId)
      .in("receiver_id", invitedUserIds);
    if (error) throw error;

    const invites = (data ?? []) as { id: string; receiver_id: string }[];
    await createLocalizedNotifications(
      invites.map((invite) => ({
        receiverId: invite.receiver_id,
        key: "secret_santa_invite" as const,
        vars: { event: eventName },
        entityId: invite.id,
      })),
    );
  } catch (error) {
    console.error("[notifications] failed to notify secret santa invites", error);
  }
}

/**
 * Notifies a user that a wishlist was shared with them. The granter owns the wishlist, so the
 * title is read directly. No-op on failure (and create_notification skips self / duplicates).
 */
export async function notifyWishlistAccessGranted(
  wishlistId: string,
  receiverId: string,
): Promise<void> {
  try {
    const { data } = await supabaseBrowser
      .from("wishlist")
      .select("title")
      .eq("id", wishlistId)
      .single();
    const title = (data as { title?: string } | null)?.title ?? "";
    await createLocalizedNotification({
      receiverId,
      key: "wishlist_access",
      vars: { title },
      entityId: wishlistId,
    });
  } catch (error) {
    console.error("[notifications] failed to notify wishlist access", error);
  }
}

/**
 * Notifies the owner's friends about a newly created public/friends-only wishlist. Recipients
 * come from the server (access-checked); each is notified in their own language. No-op on failure.
 */
export async function notifyNewWishlist(wishlistId: string, title: string): Promise<void> {
  try {
    const { data, error } = await supabaseBrowser.rpc("get_wishlist_friends_to_notify", {
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
    console.error("[notifications] failed to notify friends about new wishlist", error);
  }
}

/** Creates many localized notifications (fan-out); each recipient in their own language. */
export async function createLocalizedNotifications(
  notifications: LocalizedNotification[],
): Promise<void> {
  if (notifications.length === 0) return;

  try {
    const [locales, actorName] = await Promise.all([
      getRecipientLocales(notifications.map((n) => n.receiverId)),
      getActorName(),
    ]);

    await Promise.all(
      notifications.map(async (n) => {
        const locale = locales.get(n.receiverId) ?? DEFAULT_LOCALE;
        const text = renderNotificationText(n.key, { name: actorName, ...n.vars }, locale);
        const { type, iconType } = NOTIFICATION_TEMPLATES[n.key];

        const { error } = await supabaseBrowser.rpc("create_notification", {
          p_receiver_id: n.receiverId,
          p_type: type,
          p_icon_type: iconType,
          p_text: text,
          p_entity_id: n.entityId ?? null,
        });
        if (error) throw error;
      }),
    );
  } catch (error) {
    console.error("[notifications] failed to create localized notification", error);
  }
}
