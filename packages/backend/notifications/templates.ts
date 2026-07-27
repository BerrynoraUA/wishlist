/**
 * Client-side localized notification templates.
 *
 * Notifications are rendered on the acting client in the *recipient's* language and stored,
 * already-localized, in `notifications.text`. Both the in-app list and the OS push banner
 * then show that text — no realtime translation anywhere.
 *
 * Translations are maintained by hand in `./translations.ts` (all supported locales), NOT via
 * any translation service. Because they live in this shared package, both the native and web
 * apps get the full locale set automatically. English is the source and the fallback for any
 * locale/template that has no entry yet.
 */

export type NotificationTemplateKey =
  | "secret_santa_invite"
  | "item_reserved"
  | "item_bought"
  | "friend_request"
  | "friend_accepted"
  | "friend_declined"
  | "wishlist_created"
  | "group_added"
  | "wishlist_access";

export type NotificationTemplate = {
  /** English source string, also the fallback when a locale has no translation. */
  source: string;
  /** `notifications.type` written to the row (routing + settings gate). */
  type: number;
  /** `notifications.icon_type` written to the row. */
  iconType: number;
};

export const NOTIFICATION_TEMPLATES: Record<NotificationTemplateKey, NotificationTemplate> = {
  secret_santa_invite: {
    source: 'You have been invited to Secret Santa "{event}"',
    type: 0,
    iconType: 0,
  },
  item_reserved: { source: "{name} reserved your item", type: 1, iconType: 5 },
  item_bought: { source: "{name} bought your item", type: 3, iconType: 5 },
  friend_request: { source: "{name} sent you a friend request", type: 2, iconType: 1 },
  friend_accepted: { source: "{name} accepted your friend request", type: 2, iconType: 2 },
  friend_declined: { source: "{name} declined your friend request", type: 2, iconType: 3 },
  wishlist_created: { source: '{name} created a new wishlist "{title}"', type: 4, iconType: 4 },
  group_added: { source: '{name} added you to the group "{group}"', type: 6, iconType: 6 },
  wishlist_access: {
    source: '{name} shared the wishlist "{title}" with you',
    type: 7,
    iconType: 7,
  },
};

export type NotificationVars = Record<string, string | number>;

/**
 * Fills `{var}` placeholders. Templates use only simple named placeholders, so a plain
 * substitution is enough. Unknown placeholders are left intact.
 */
export function interpolateTemplate(template: string, vars: NotificationVars): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}

// Imported after the templates so this module stays the single public entrypoint. The cycle is
// type-only in the other direction (translations.ts imports only the key type), so no runtime cycle.
import { NOTIFICATION_TRANSLATIONS } from "./translations";

/**
 * Renders the final notification text in `locale`. Pass the *recipient's* locale. Falls back
 * to the English source when the locale (or that template within it) has no translation.
 */
export function renderNotificationText(
  key: NotificationTemplateKey,
  vars: NotificationVars,
  locale?: string | null,
): string {
  const translated = locale ? NOTIFICATION_TRANSLATIONS[locale]?.[key] : undefined;
  const template =
    typeof translated === "string" && translated.length > 0
      ? translated
      : NOTIFICATION_TEMPLATES[key].source;
  return interpolateTemplate(template, vars);
}
