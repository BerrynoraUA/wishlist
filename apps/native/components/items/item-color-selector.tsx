import { Icon } from "@/components/ui/icon";
import { StyledPressable } from "@/components/ui/styled-pressable";
import { motionDuration, useReducedMotion } from "@/lib/motion";
import { ITEM_COLORS } from "@wishlist/backend/lib/item-colors";
import { Ban, Check } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { I18nManager, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const SWATCH_SIZE = 40;
const ROW_GAP = 8;

/**
 * Border colour for an item card, with an animated selection indicator.
 */
export function ItemColorSelector({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (colorIndex: number | null) => void;
}) {
  const t = useGT();
  const reduceMotion = useReducedMotion();
  const columns = Math.ceil((ITEM_COLORS.length + 1) / 2);
  const [width, setWidth] = React.useState(0);
  const indicatorX = useSharedValue(0);
  const indicatorY = useSharedValue(0);
  const checkOpacity = useSharedValue(value === null ? 0 : 1);
  const hasMeasured = React.useRef(false);

  React.useEffect(() => {
    if (width === 0) return;

    const index = value === null ? 0 : value + 1;
    const column = index % columns;
    const x = (column * (width - SWATCH_SIZE)) / (columns - 1);
    const nextX = I18nManager.isRTL ? width - SWATCH_SIZE - x : x;
    const nextY = Math.floor(index / columns) * (SWATCH_SIZE + ROW_GAP);
    const nextOpacity = value === null ? 0 : 1;

    if (reduceMotion || !hasMeasured.current) {
      indicatorX.value = nextX;
      indicatorY.value = nextY;
      checkOpacity.value = nextOpacity;
      hasMeasured.current = true;
      return;
    }

    indicatorX.value = withTiming(nextX, { duration: motionDuration.normal });
    indicatorY.value = withTiming(nextY, { duration: motionDuration.normal });
    checkOpacity.value = withTiming(nextOpacity, { duration: motionDuration.fast });
  }, [width, value, columns, reduceMotion, indicatorX, indicatorY, checkOpacity]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }, { translateY: indicatorY.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: checkOpacity.value }));

  const swatches = [
    <StyledPressable
      key="none"
      accessibilityRole="button"
      accessibilityState={{ selected: value === null }}
      accessibilityLabel={t("No border")}
      onPress={() => onChange(null)}
      hitSlop={4}
      className="size-10 items-center justify-center rounded-full border-2 border-transparent bg-bg-muted active:opacity-80"
    >
      <Icon as={Ban} className="size-5 text-text-muted" />
    </StyledPressable>,
    ...ITEM_COLORS.map((color, index) => (
      <StyledPressable
        key={color.color}
        accessibilityRole="button"
        accessibilityState={{ selected: value === index }}
        accessibilityLabel={color.label}
        onPress={() => onChange(index)}
        hitSlop={4}
        className="size-10 items-center justify-center rounded-full border-2 border-transparent active:opacity-80"
        style={{ backgroundColor: color.color }}
      />
    )),
  ];
  // Two balanced rows laid out as a grid: the shorter row is padded with empty slots so
  // its swatches line up under the columns of the first one.
  const rows = [swatches.slice(0, columns), swatches.slice(columns)];

  return (
    <View className="relative gap-2" onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row justify-between">
          {row}
          {Array.from({ length: columns - row.length }, (_, index) => (
            <View key={`empty-${index}`} className="size-10" />
          ))}
        </View>
      ))}
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="absolute left-0 top-0 size-10 items-center justify-center rounded-full border-2 border-text"
          style={indicatorStyle}
        >
          <Animated.View style={checkStyle}>
            <Icon as={Check} className="size-5 text-white" strokeWidth={3} />
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}
