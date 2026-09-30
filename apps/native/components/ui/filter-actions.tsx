import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  GLASS_CAPSULE_STYLE,
  GlassCapsuleSlot,
  HAS_LIQUID_GLASS,
} from "@/components/ui/liquid-glass";
import { motionDuration, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { GlassView } from "expo-glass-effect";
import { SlidersHorizontal, X } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, Keyframe } from "react-native-reanimated";

const resetButtonEntering = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ translateX: 48 }, { scale: 0.9 }],
  },
  100: {
    opacity: 1,
    transform: [{ translateX: 0 }, { scale: 1 }],
  },
}).duration(motionDuration.normal);

const resetButtonExiting = new Keyframe({
  0: {
    opacity: 1,
    transform: [{ translateX: 0 }, { scale: 1 }],
  },
  100: {
    opacity: 0,
    transform: [{ translateX: 48 }, { scale: 0.9 }],
  },
}).duration(motionDuration.fast);

export function FilterActions({
  active,
  open,
  filterAccessibilityLabel,
  clearAccessibilityLabel,
  onOpenChange,
  onReset,
  children,
}: {
  active: boolean;
  open: boolean;
  filterAccessibilityLabel: string;
  clearAccessibilityLabel: string;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
  /** Additional controls sharing the filter capsule. */
  children?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  // iOS 26: while filters are active the clear button joins the filter button's glass
  // capsule, which grows to hold both and shrinks back when they are cleared.
  if (HAS_LIQUID_GLASS) {
    return (
      <GlassView isInteractive style={[GLASS_CAPSULE_STYLE, styles.glassRow]}>
        <GlassCapsuleSlot
          visible={active}
          accessibilityLabel={clearAccessibilityLabel}
          onPress={onReset}
        >
          <Icon as={X} className="size-5 text-destructive" />
        </GlassCapsuleSlot>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={filterAccessibilityLabel}
          accessibilityState={{ expanded: open }}
          onPress={() => onOpenChange(!open)}
          className="size-11 items-center justify-center"
        >
          <Icon
            as={SlidersHorizontal}
            className={cn("size-5", open ? "text-brand" : "text-text")}
          />
        </Pressable>
        {children}
      </GlassView>
    );
  }

  return (
    <View className="relative -m-1 flex-row items-center gap-1 rounded-full p-1">
      {active ? (
        <Animated.View
          pointerEvents="none"
          entering={reduceMotion ? undefined : FadeIn.duration(motionDuration.fast)}
          exiting={reduceMotion ? undefined : FadeOut.duration(motionDuration.fast)}
          className="absolute inset-0 rounded-full border border-border-subtle bg-card-bg/80 dark:bg-card-bg/80"
        />
      ) : null}
      {active ? (
        <Animated.View
          entering={reduceMotion ? undefined : resetButtonEntering}
          exiting={reduceMotion ? undefined : resetButtonExiting}
          className="z-10"
        >
          <Button
            variant={process.env.EXPO_OS === "android" ? "ghost" : "destructive"}
            size="icon-lg"
            accessibilityLabel={clearAccessibilityLabel}
            onPress={onReset}
            className="rounded-full android:overflow-hidden android:bg-danger-bg"
          >
            <Icon as={X} className="size-4 text-white android:size-5 android:text-destructive" />
          </Button>
        </Animated.View>
      ) : null}
      <Button
        variant="outline"
        size="icon-lg"
        accessibilityLabel={filterAccessibilityLabel}
        accessibilityState={{ expanded: open }}
        onPress={() => onOpenChange(!open)}
        className={cn(
          "z-10 shrink-0 rounded-full border-border-subtle bg-card-bg dark:bg-card-bg android:overflow-hidden android:rounded-2xl android:shadow-none",
          process.env.EXPO_OS === "android" &&
            (open || active
              ? "border-brand/20 bg-brand-lighter dark:bg-brand-lighter"
              : "border-transparent bg-bg-muted dark:bg-bg-muted"),
        )}
      >
        <Icon
          as={SlidersHorizontal}
          className={cn(
            "size-4 text-text android:size-5",
            process.env.EXPO_OS === "android" && (open || active) && "text-brand",
          )}
        />
      </Button>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glassRow: { flexDirection: "row", alignItems: "center" },
});
