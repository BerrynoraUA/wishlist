/**
 * Client-side creation of localized notifications (web). The implementation is shared with
 * native and the MCP server in `@wishlist/backend/notifications/notifier`.
 */
import { createNotifier } from "@wishlist/backend/notifications/notifier";
import { supabaseBrowser } from "@/lib/supabase-browser";

export type { LocalizedNotification } from "@wishlist/backend/notifications/notifier";

export const {
  createLocalizedNotification,
  createLocalizedNotifications,
  notifySecretSantaInvites,
  notifySecretSantaStarted,
  notifyWishlistAccessGranted,
  notifyNewWishlist,
} = createNotifier(supabaseBrowser, { log: console.error });
