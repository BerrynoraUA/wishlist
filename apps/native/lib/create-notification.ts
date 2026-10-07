/**
 * Client-side creation of localized notifications (native). The implementation is shared with
 * web and the MCP server in `@wishlist/backend/notifications/notifier`.
 */
import { supabase } from "@wishlist/backend/supabase/native";
import { createNotifier } from "@wishlist/backend/notifications/notifier";
import { debugError } from "@/lib/debug-log";

export type { LocalizedNotification } from "@wishlist/backend/notifications/notifier";

export const {
  createLocalizedNotification,
  createLocalizedNotifications,
  notifySecretSantaInvites,
  notifySecretSantaStarted,
  notifyWishlistAccessGranted,
  notifyNewWishlist,
} = createNotifier(supabase, { log: debugError });
