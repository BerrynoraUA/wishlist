import {
  NOTIFICATION_TEMPLATES,
  renderNotificationText,
  type NotificationTemplateKey,
  type NotificationVars,
} from "@wishlist/backend/notifications/templates";
import type { McpContext } from "./auth";
import { checked } from "./results";

type Notice = {
  receiverId: string;
  key: NotificationTemplateKey;
  vars?: NotificationVars;
  entityId?: string;
};

export async function notify(ctx: McpContext, notices: Notice[]) {
  if (!notices.length) return;
  try {
    const locales = (await checked(
      ctx.db.rpc("get_preferred_locales", { p_user_ids: notices.map((n) => n.receiverId) }),
    )) as { user_id: string; preferred_locale: string }[];
    await Promise.all(
      notices.map(async (n) => {
        const locale = locales.find((l) => l.user_id === n.receiverId)?.preferred_locale ?? "en";
        const template = NOTIFICATION_TEMPLATES[n.key];
        await checked(
          ctx.db.rpc("create_notification", {
            p_receiver_id: n.receiverId,
            p_type: template.type,
            p_icon_type: template.iconType,
            p_text: renderNotificationText(n.key, { name: ctx.actorName, ...n.vars }, locale),
            p_entity_id: n.entityId ?? null,
          }),
        );
      }),
    );
  } catch {
    // As in the app, notification failure must not turn a successful mutation into a retry.
    console.error("[mcp] Notification delivery failed");
  }
}
