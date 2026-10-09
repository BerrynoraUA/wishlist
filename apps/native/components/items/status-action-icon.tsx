import { Icon } from "@/components/ui/icon";
import { LockKeyhole, LockKeyholeOpen, ShoppingCart } from "lucide-react-native";
import * as React from "react";
import { View } from "react-native";
import Animated, {
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

export function ReservationActionIcon({
  reserved,
  className,
}: {
  reserved: boolean;
  className: string;
}) {
  const previous = React.useRef(reserved);
  const travel = useSharedValue(0);
  const closure = useSharedValue(reserved ? 1 : 0);

  React.useEffect(() => {
    if (previous.current !== reserved) {
      travel.value = withSequence(
        withTiming(reserved ? -3 : 3, { duration: 90, reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 160, reduceMotion: ReduceMotion.System }),
      );
    }
    closure.value = withTiming(reserved ? 1 : 0, {
      duration: 180,
      reduceMotion: ReduceMotion.System,
    });
    previous.current = reserved;
  }, [closure, reserved, travel]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: travel.value }] }));
  const openStyle = useAnimatedStyle(() => ({ opacity: 1 - closure.value }));
  const closedStyle = useAnimatedStyle(() => ({ opacity: closure.value }));
  return (
    <Animated.View style={style}>
      <View className="size-4">
        <Animated.View style={openStyle}>
          <Icon as={LockKeyholeOpen} className={className} />
        </Animated.View>
        <Animated.View className="absolute inset-0" style={closedStyle}>
          <Icon as={LockKeyhole} className={className} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export function PurchaseActionIcon({ purchased }: { purchased: boolean }) {
  const previous = React.useRef(purchased);
  const travel = useSharedValue(0);
  const tint = useSharedValue(purchased ? 1 : 0);

  React.useEffect(() => {
    if (previous.current !== purchased) {
      travel.value = withSequence(
        withTiming(5, { duration: 95, reduceMotion: ReduceMotion.System }),
        withTiming(-1, { duration: 95, reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 100, reduceMotion: ReduceMotion.System }),
      );
    }
    tint.value = withTiming(purchased ? 1 : 0, {
      duration: 250,
      reduceMotion: ReduceMotion.System,
    });
    previous.current = purchased;
  }, [purchased, tint, travel]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: travel.value }] }));
  const buyStyle = useAnimatedStyle(() => ({ opacity: 1 - tint.value }));
  const undoStyle = useAnimatedStyle(() => ({ opacity: tint.value }));
  return (
    <Animated.View style={style}>
      <View className="size-4">
        <Animated.View style={buyStyle}>
          <Icon as={ShoppingCart} className="size-4 text-buy" />
        </Animated.View>
        <Animated.View className="absolute inset-0" style={undoStyle}>
          <Icon as={ShoppingCart} className="size-4 text-destructive" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// Drawn over the button's own (transparent) 1px border, so the frame crossfades with the fill
// instead of a green border showing around the red Undo state.
const TINT_OVER_BORDER = { top: -1, right: -1, bottom: -1, left: -1 } as const;

/**
 * The Buy / Undo button's background and border. Give the button `border border-transparent`
 * and no background of its own.
 */
export function PurchaseActionTint({
  purchased,
  buyBorderClassName = "border-buy/35",
}: {
  purchased: boolean;
  buyBorderClassName?: string;
}) {
  const opacity = useSharedValue(purchased ? 1 : 0);
  React.useEffect(() => {
    opacity.value = withTiming(purchased ? 1 : 0, {
      duration: 250,
      reduceMotion: ReduceMotion.System,
    });
  }, [opacity, purchased]);
  const buyStyle = useAnimatedStyle(() => ({ opacity: 1 - opacity.value }));
  const undoStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <>
      <Animated.View
        pointerEvents="none"
        className={`absolute rounded-lg border bg-buy-bg ${buyBorderClassName}`}
        style={[TINT_OVER_BORDER, buyStyle]}
      />
      <Animated.View
        pointerEvents="none"
        className="absolute rounded-lg border border-destructive/35 bg-danger-bg"
        style={[TINT_OVER_BORDER, undoStyle]}
      />
    </>
  );
}

export function PurchaseActionLabel({
  purchased,
  children,
  className,
}: {
  purchased: boolean;
  children: React.ReactNode;
  className: string;
}) {
  const buyColor = useCSSVariable("--color-buy");
  const undoColor = useCSSVariable("--color-destructive");
  const tint = useSharedValue(purchased ? 1 : 0);
  React.useEffect(() => {
    tint.value = withTiming(purchased ? 1 : 0, {
      duration: 250,
      reduceMotion: ReduceMotion.System,
    });
  }, [purchased, tint]);
  const style = useAnimatedStyle(() => ({
    color: interpolateColor(
      tint.value,
      [0, 1],
      [
        typeof buyColor === "string" ? buyColor : "#16a34a",
        typeof undoColor === "string" ? undoColor : "#ef4444",
      ],
    ),
  }));
  return (
    <Animated.Text className={className} numberOfLines={1} style={style}>
      {children}
    </Animated.Text>
  );
}
