import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { motionDuration, useReducedMotion } from "@/lib/motion";
import { SlidersHorizontal, X } from "lucide-react-native";
import { View } from "react-native";
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
}: {
  active: boolean;
  open: boolean;
  filterAccessibilityLabel: string;
  clearAccessibilityLabel: string;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
}) {
  const reduceMotion = useReducedMotion();

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
            variant="destructive"
            size="icon-lg"
            accessibilityLabel={clearAccessibilityLabel}
            onPress={onReset}
            className="rounded-full"
          >
            <Icon as={X} className="size-4 text-white" />
          </Button>
        </Animated.View>
      ) : null}
      <Button
        variant="outline"
        size="icon-lg"
        accessibilityLabel={filterAccessibilityLabel}
        accessibilityState={{ expanded: open }}
        onPress={() => onOpenChange(!open)}
        className="z-10 shrink-0 rounded-full border-border-subtle bg-card-bg dark:bg-card-bg"
      >
        <Icon as={SlidersHorizontal} className="size-4 text-text" />
      </Button>
    </View>
  );
}
