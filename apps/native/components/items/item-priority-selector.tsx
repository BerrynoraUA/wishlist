import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { PRIORITY_ICONS } from "@/components/items/item-labels";
import type { getItemPriorityOptions } from "@/lib/items";
import { motionSpring, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { isStarPriorityId } from "@wishlist/backend/lib";
import * as React from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/**
 * Low / Medium / High as a row of pills with a thumb that slides to the picked one: a
 * border in the priority colour over the same translucent tint the priority badges use. Starred is not a level on this scale — it is toggled from the card — so a starred
 * item simply shows no pill selected here and keeps its star on save.
 */
export function ItemPrioritySelector({
  priorityOptions,
  value,
  onChange,
}: {
  priorityOptions: ReturnType<typeof getItemPriorityOptions>;
  value: string | null;
  onChange: (priorityId: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const options = React.useMemo(
    () => priorityOptions.filter((option) => !isStarPriorityId(option.priority_id)),
    [priorityOptions],
  );
  const selectedIndex = options.findIndex((option) => option.priority_id === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const [trackWidth, setTrackWidth] = React.useState(0);
  const segmentWidth = options.length > 0 ? trackWidth / options.length : 0;
  const thumbX = useSharedValue(0);
  const thumbOpacity = useSharedValue(0);
  const thumbColor = useSharedValue(selected?.color ?? "#00000000");
  // The same translucent tint (12%) the priority badges use. Animated on its own, since
  // an in-flight colour is an rgba() string that an alpha suffix cannot be appended to.
  const thumbTint = useSharedValue(selected ? `${selected.color}1f` : "#00000000");
  const hasMeasured = React.useRef(false);

  React.useEffect(() => {
    if (segmentWidth === 0) return;

    const nextX = Math.max(selectedIndex, 0) * segmentWidth;
    const nextOpacity = selected ? 1 : 0;
    // Keep the last colour while fading out, so the thumb does not flash grey.
    const nextColor = selected?.color ?? thumbColor.value;
    const nextTint = selected ? `${selected.color}1f` : thumbTint.value;

    // The first placement snaps, so the thumb does not fly in from the left on open.
    if (reduceMotion || !hasMeasured.current) {
      thumbX.value = nextX;
      thumbOpacity.value = nextOpacity;
      thumbColor.value = nextColor;
      thumbTint.value = nextTint;
      hasMeasured.current = true;
      return;
    }

    thumbX.value = withSpring(nextX, motionSpring.navPill);
    thumbOpacity.value = withTiming(nextOpacity, { duration: 150 });
    thumbColor.value = withTiming(nextColor, { duration: 200 });
    thumbTint.value = withTiming(nextTint, { duration: 200 });
  }, [
    reduceMotion,
    segmentWidth,
    selected,
    selectedIndex,
    thumbColor,
    thumbOpacity,
    thumbTint,
    thumbX,
  ]);

  const thumbStyle = useAnimatedStyle(() => ({
    width: segmentWidth,
    opacity: thumbOpacity.value,
    borderColor: thumbColor.value,
    backgroundColor: thumbTint.value,
    transform: [{ translateX: thumbX.value }],
  }));

  function handleLayout(event: LayoutChangeEvent) {
    // Padding of the track (p-1) on both sides.
    setTrackWidth(event.nativeEvent.layout.width - 8);
  }

  return (
    <View
      accessibilityRole="radiogroup"
      onLayout={handleLayout}
      className="relative h-12 flex-row rounded-full border border-border-subtle bg-bg-subtle p-1"
    >
      <Animated.View
        pointerEvents="none"
        className="absolute bottom-1 start-1 top-1 rounded-full border"
        style={thumbStyle}
      />
      {options.map((option) => {
        const isSelected = option.priority_id === value;
        const PriorityIcon = PRIORITY_ICONS[option.priority_id as keyof typeof PRIORITY_ICONS];

        return (
          <AnimatedPressable
            key={option.priority_id}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={option.label}
            pressedScale={0.96}
            onPress={() => onChange(option.priority_id)}
            className="min-w-0 flex-1 flex-row items-center justify-center gap-1.5 rounded-full"
          >
            {PriorityIcon ? (
              <Icon as={PriorityIcon} className="size-4" color={option.color} />
            ) : null}
            <Text
              numberOfLines={1}
              className={cn("text-sm", isSelected ? "font-bold" : "font-semibold text-text-muted")}
              style={isSelected ? { color: option.color } : undefined}
            >
              {option.label}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}
