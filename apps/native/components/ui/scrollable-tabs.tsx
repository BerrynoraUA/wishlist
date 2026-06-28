import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Text } from "@/components/ui/text";
import { GuideTarget } from "@/components/user-guide/guide-target";
import { cn } from "@/lib/utils";
import * as React from "react";
import { ScrollView, View, type LayoutChangeEvent } from "react-native";

export type ScrollableTab<T> = {
  value: T;
  label: string;
  count?: number;
  accessibilityLabel?: string;
  guideTargetId?: string;
};

export function ScrollableTabs<T>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: ScrollableTab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const scrollRef = React.useRef<ScrollView>(null);
  const tabLayoutsRef = React.useRef(new Map<T, { width: number; x: number }>());
  const [viewportWidth, setViewportWidth] = React.useState(0);

  const scrollToActiveTab = React.useCallback(
    (animated: boolean) => {
      const layout = tabLayoutsRef.current.get(value);
      if (!layout || viewportWidth === 0) return;

      scrollRef.current?.scrollTo({
        x: Math.max(0, layout.x - (viewportWidth - layout.width) / 2),
        animated,
      });
    },
    [value, viewportWidth],
  );

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => scrollToActiveTab(true));
    return () => cancelAnimationFrame(frame);
  }, [scrollToActiveTab]);

  function handleViewportLayout(event: LayoutChangeEvent) {
    setViewportWidth(event.nativeEvent.layout.width);
  }

  return (
    <View
      className={cn("border-b border-border-subtle bg-bg", className)}
      onLayout={handleViewportLayout}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        bounces
        contentContainerClassName="px-1"
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
      >
        {tabs.map((tab) => {
          const selected = tab.value === value;
          const trigger = (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={tab.accessibilityLabel ?? tab.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(tab.value)}
              className="relative h-11 min-w-20 flex-row items-center justify-center gap-1.5 px-4"
            >
              <Text
                className={cn("text-sm font-bold", selected ? "text-brand" : "text-text-muted")}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
              {tab.count !== undefined ? (
                <Text
                  className={cn(
                    "text-xs font-extrabold",
                    selected ? "text-brand" : "text-text-light",
                  )}
                >
                  {tab.count}
                </Text>
              ) : null}
              {selected ? (
                <View className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />
              ) : null}
            </AnimatedPressable>
          );

          return (
            <View
              key={String(tab.value)}
              onLayout={(event) => {
                const { width, x } = event.nativeEvent.layout;
                tabLayoutsRef.current.set(tab.value, { width, x });
                if (selected) scrollToActiveTab(false);
              }}
            >
              {tab.guideTargetId ? (
                <GuideTarget
                  attachedTooltip={false}
                  id={tab.guideTargetId}
                  onGuideActivate={() => onChange(tab.value)}
                  tooltipPlacementOverride="bottom"
                >
                  {trigger}
                </GuideTarget>
              ) : (
                trigger
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
