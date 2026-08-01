import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { GuideTarget } from "@/components/user-guide/guide-target";
import { motionSpring, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import * as React from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

export const SLIDING_SELECTOR_GAP = 8;

export type SlidingOptionRenderProps = { selected: boolean };

export type SlidingSelectorContent =
  | React.ReactNode
  | ((props: SlidingOptionRenderProps) => React.ReactNode);

export type SlidingOption<T> = {
  value: T;
  accessibilityLabel?: string;
  guideTargetId?: string;
  /** Optional stable key when `value` isn't unique among siblings */
  id?: string;
  guideTooltipPlacement?: "top" | "bottom";
  /** Replaces default `bg-bg-subtle` when the option is not selected */
  surfaceClassName?: string;
  children: SlidingSelectorContent;
};

type SlidingOptionSelectorProps<T> = {
  rows: SlidingOption<T>[][];
  value: T;
  onChange: (value: T) => void;
  /** Pixel height of one option row (used for the sliding indicator) */
  optionHeight: number;
  optionHeightClassName: string;
  /** Extra classes on each option trigger (shape, padding) */
  optionClassName?: string;
  /** Extra classes on the trigger when selected (e.g. transparent border) */
  selectedOptionClassName?: string;
  indicatorClassName: string;
  /** Classes on outer container */
  className?: string;
  /** Classes merged onto each row’s flex-row wrapper (e.g. horizontal gap) */
  rowClassName?: string;
};

function renderOptionContent(content: SlidingSelectorContent, selected: boolean) {
  return typeof content === "function" ? content({ selected }) : content;
}

export function SlidingOptionSelector<T>({
  rows,
  value,
  onChange,
  optionHeight,
  optionHeightClassName,
  optionClassName,
  selectedOptionClassName,
  indicatorClassName,
  className,
  rowClassName,
}: SlidingOptionSelectorProps<T>) {
  const reduceMotion = useReducedMotion();
  const [rowWidth, setRowWidth] = React.useState(0);
  const selectedPosition = React.useMemo(() => {
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const columnIndex = rows[rowIndex].findIndex((option) => option.value === value);

      if (columnIndex >= 0) {
        return { rowIndex, columnIndex };
      }
    }

    return null;
  }, [rows, value]);
  const selectedRowLength =
    selectedPosition === null ? 1 : (rows[selectedPosition.rowIndex]?.length ?? 1);
  const selectedOptionWidth =
    rowWidth > 0 && selectedPosition !== null
      ? (rowWidth - SLIDING_SELECTOR_GAP * (selectedRowLength - 1)) / selectedRowLength
      : 0;
  const indicatorX = useSharedValue(0);
  const indicatorY = useSharedValue(0);
  const didPositionIndicator = React.useRef(false);

  React.useEffect(() => {
    if (selectedPosition === null) {
      didPositionIndicator.current = false;
      return;
    }

    const targetX = selectedPosition.columnIndex * (selectedOptionWidth + SLIDING_SELECTOR_GAP);
    const targetY = selectedPosition.rowIndex * (optionHeight + SLIDING_SELECTOR_GAP);

    if (!didPositionIndicator.current || selectedOptionWidth === 0 || reduceMotion) {
      indicatorX.value = targetX;
      indicatorY.value = targetY;
      didPositionIndicator.current = selectedOptionWidth > 0;
      return;
    }

    indicatorX.value = withSpring(targetX, motionSpring.navPill);
    indicatorY.value = withSpring(targetY, motionSpring.navPill);
  }, [indicatorX, indicatorY, optionHeight, reduceMotion, selectedOptionWidth, selectedPosition]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }, { translateY: indicatorY.value }],
  }));

  function handleLayout(event: LayoutChangeEvent) {
    const nextWidth = event.nativeEvent.layout.width;
    if (selectedPosition === null) {
      didPositionIndicator.current = false;
      setRowWidth((current) => (current === nextWidth ? current : nextWidth));
      return;
    }

    const nextSelectedRowLength = rows[selectedPosition.rowIndex]?.length ?? 1;
    const nextSelectedOptionWidth =
      nextWidth > 0
        ? (nextWidth - SLIDING_SELECTOR_GAP * (nextSelectedRowLength - 1)) / nextSelectedRowLength
        : 0;

    if (!didPositionIndicator.current && nextSelectedOptionWidth > 0) {
      indicatorX.value =
        selectedPosition.columnIndex * (nextSelectedOptionWidth + SLIDING_SELECTOR_GAP);
      indicatorY.value = selectedPosition.rowIndex * (optionHeight + SLIDING_SELECTOR_GAP);
      didPositionIndicator.current = true;
    }

    setRowWidth((current) => (current === nextWidth ? current : nextWidth));
  }

  return (
    <View className={cn("relative gap-2", className)} onLayout={handleLayout}>
      {selectedOptionWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          className={cn("absolute start-0 top-0", indicatorClassName)}
          style={[{ height: optionHeight, width: selectedOptionWidth }, indicatorStyle]}
        />
      ) : null}

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} className={cn("flex-row gap-2", rowClassName)}>
          {row.map((option, columnIndex) => {
            const selected = value === option.value;
            const key = option.id ?? `${rowIndex}-${columnIndex}-${String(option.value)}`;

            const trigger = (
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={option.accessibilityLabel}
                onPress={() => onChange(option.value)}
                className={cn(
                  "z-10 flex-1 flex-row items-center justify-center border border-border-subtle",
                  optionHeightClassName,
                  optionClassName,
                  selected
                    ? selectedOptionWidth > 0
                      ? "border-transparent bg-transparent"
                      : "border-brand bg-brand"
                    : cn("bg-bg-subtle", option.surfaceClassName),
                  selected && selectedOptionClassName,
                )}
              >
                {renderOptionContent(option.children, selected)}
              </AnimatedPressable>
            );

            return option.guideTargetId ? (
              <GuideTarget
                attachedTooltip={false}
                key={key}
                id={option.guideTargetId}
                onGuideActivate={() => onChange(option.value)}
                style={{ flex: 1 }}
                tooltipPlacementOverride={
                  option.guideTooltipPlacement ?? (rowIndex === 0 ? "top" : "bottom")
                }
              >
                {trigger}
              </GuideTarget>
            ) : (
              <React.Fragment key={key}>{trigger}</React.Fragment>
            );
          })}
        </View>
      ))}
    </View>
  );
}
