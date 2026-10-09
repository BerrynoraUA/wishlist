import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { hapticSelection } from "@/lib/haptics";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { PRIORITY_ICONS } from "@/components/items/item-labels";
import type { getItemPriorityOptions } from "@/lib/items";
import { motionSpring, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { isStarPriorityId } from "@wishlist/backend/lib";
import * as React from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { useCSSVariable } from "uniwind";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/**
 * Priority pills with a sliding thumb. Starred follows the app's accent colour.
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
  const brand = useCSSVariable("--color-brand");
  const brandTint = useCSSVariable("--color-brand-alpha-12");
  const options = React.useMemo(
    () =>
      priorityOptions.map((option) => ({
        ...option,
        color:
          isStarPriorityId(option.priority_id) && typeof brand === "string" ? brand : option.color,
        tint:
          isStarPriorityId(option.priority_id) && typeof brandTint === "string"
            ? brandTint
            : `${option.color}1f`,
      })),
    [priorityOptions, brand, brandTint],
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
  const thumbTint = useSharedValue(selected?.tint ?? "#00000000");
  const hasMeasured = React.useRef(false);

  React.useEffect(() => {
    if (segmentWidth === 0) return;

    const nextX = Math.max(selectedIndex, 0) * segmentWidth;
    const nextOpacity = selected ? 1 : 0;
    // Keep the last colour while fading out, so the thumb does not flash grey.
    const nextColor = selected?.color ?? thumbColor.get();
    const nextTint = selected?.tint ?? thumbTint.get();

    // The first placement snaps, so the thumb does not fly in from the left on open.
    if (reduceMotion || !hasMeasured.current) {
      thumbX.set(nextX);
      thumbOpacity.set(nextOpacity);
      thumbColor.set(nextColor);
      thumbTint.set(nextTint);
      hasMeasured.current = true;
      return;
    }

    thumbX.set(withSpring(nextX, motionSpring.navPill));
    thumbOpacity.set(withTiming(nextOpacity, { duration: 150 }));
    thumbColor.set(withTiming(nextColor, { duration: 200 }));
    thumbTint.set(withTiming(nextTint, { duration: 200 }));
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
    opacity: thumbOpacity.get(),
    borderColor: thumbColor.get(),
    backgroundColor: thumbTint.get(),
    transform: [{ translateX: thumbX.get() }],
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
            onPress={() => {
              if (!isSelected) hapticSelection();
              onChange(option.priority_id);
            }}
            className="min-w-0 flex-1 flex-row items-center justify-center gap-1 rounded-full px-1"
          >
            {PriorityIcon ? (
              <Icon as={PriorityIcon} className="size-4" color={option.color} />
            ) : null}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              className={cn(
                "shrink text-sm",
                isSelected ? "font-bold" : "font-semibold text-text-muted",
              )}
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
