import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Icon } from "@/components/ui/icon";
import { useHideBackButton } from "@/hooks/use-hide-back-button";
import { cn } from "@/lib/utils";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import { useGT } from "gt-react-native";
import { ChevronLeft } from "lucide-react-native";
import * as React from "react";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FloatingBackButtonProps = {
  /** Defaults to `router.back()`. */
  onPress?: () => void;
  accessibilityLabel?: string;
  className?: string;
};

/** Clearance for the translucent iOS tab bar (~44pt) that overlays content. */
const IOS_TAB_BAR_CLEARANCE = 45;
/** Android's tab bar is opaque and outside the screen, so a small inset is enough. */
const ANDROID_BOTTOM = 45;
const HAS_LIQUID_GLASS = isLiquidGlassAvailable();
const PILL_GLASS_STYLE = [StyleSheet.absoluteFill, { borderRadius: 9999 }];

/**
 * Shared floating "back" button used on detail screens.
 *
 * Lives at the bottom-left of the screen and computes a consistent bottom offset
 * across platforms: on iOS the native tab bar is translucent and overlays the
 * screen content, so the button is lifted to clear it (and the home indicator);
 * on Android the opaque tab bar sits outside the screen, so a small inset is enough.
 *
 * Centralizing this here keeps placement identical on every detail page and avoids
 * the per-page magic numbers that previously drifted out of sync.
 */
export function FloatingBackButton({
  onPress,
  accessibilityLabel,
  className,
}: FloatingBackButtonProps) {
  const t = useGT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [hidden] = useHideBackButton();

  if (hidden) return null;

  const bottom =
    process.env.EXPO_OS === "ios" ? insets.bottom + IOS_TAB_BAR_CLEARANCE : ANDROID_BOTTOM;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? t("Back")}
      onPress={onPress ?? (() => router.back())}
      className={cn(
        "absolute start-3 z-20 size-14 items-center justify-center rounded-full",
        // Native Liquid Glass (iOS 26+) replaces the translucent CSS fill; elsewhere keep it.
        HAS_LIQUID_GLASS ? "" : "border border-glass-border bg-glass-bg",
        className,
      )}
      style={{ bottom }}
    >
      {HAS_LIQUID_GLASS ? <GlassView pointerEvents="none" style={PILL_GLASS_STYLE} /> : null}
      <Icon as={ChevronLeft} className="size-7 text-text" />
    </AnimatedPressable>
  );
}
