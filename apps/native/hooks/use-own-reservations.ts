import { useSettings } from "@/hooks/use-settings";
import { useProGate } from "@/hooks/use-pro-gate";

/**
 * Whether the wishlist owner opted into seeing reservations on their own
 * items. The Pro check is applied on read, so the preference survives a lapsed
 * subscription without leaking the spoiler while it is inactive.
 */
export function useShowOwnReservations(): boolean {
  const { data: settings } = useSettings();
  const { isPro } = useProGate();

  return isPro && Boolean(settings?.show_own_reservations);
}
