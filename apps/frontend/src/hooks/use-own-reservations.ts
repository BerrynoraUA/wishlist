import { useSettings } from "@/hooks/use-settings";
import { useSubscription } from "@/hooks/use-subscription";
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";

/**
 * Whether the wishlist owner opted into seeing reservations on their own
 * items. The Pro check is applied on read, so the preference survives a lapsed
 * subscription without leaking the spoiler while it is inactive.
 */
export function useShowOwnReservations(): boolean {
  const { data: settings } = useSettings();
  const { isPro } = useSubscription();
  const gated = SUBSCRIPTIONS_UI_ENABLED && !isPro;

  return !gated && Boolean(settings?.show_own_reservations);
}
