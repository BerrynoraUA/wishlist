import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useIsOnline } from "@/hooks/use-is-online";
import { NAV_TAB_BAR_HEIGHT } from "@/lib/layout";
import { useGT } from "gt-react-native";
import { CloudOff } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Tells people the lists they see are the copy saved on the device, not live data. */
export function OfflineBanner() {
  const t = useGT();
  const isOnline = useIsOnline();
  const insets = useSafeAreaInsets();

  if (isOnline) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 items-center"
      // Just above the floating tab bar: screen headers put buttons along the top edge.
      style={{ bottom: Math.max(insets.bottom, 8) + NAV_TAB_BAR_HEIGHT + 12 }}
    >
      <View
        accessibilityRole="alert"
        className="flex-row items-center gap-1.5 rounded-full border border-border-subtle bg-card-bg px-3 py-1.5"
      >
        <Icon as={CloudOff} className="size-3.5 text-text-muted" />
        <Text className="text-xs font-semibold text-text-muted">{t("Offline")}</Text>
      </View>
    </View>
  );
}
