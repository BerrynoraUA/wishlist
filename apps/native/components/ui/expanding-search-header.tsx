import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { motionDuration, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useGT } from "gt-react-native";
import { Search, X } from "lucide-react-native";
import * as React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const HAS_LIQUID_GLASS = isLiquidGlassAvailable();
const PILL_GLASS_STYLE = [StyleSheet.absoluteFill, { borderRadius: 9999 }];
const SEARCH_COLLAPSED_WIDTH = 44;
const SEARCH_TABS_GAP = 12;

/**
 * A header row with a search pill that expands across the row from either edge.
 * The tabs (passed as children) sit beside the collapsed pill and are hidden
 * while the search is expanded.
 */
export function ExpandingSearchHeader({
  search,
  onChangeSearch,
  placeholder,
  contentWidth,
  searchSide = "left",
  onOpen,
  children,
}: {
  search: string;
  onChangeSearch: (value: string) => void;
  placeholder: string;
  contentWidth: number;
  searchSide?: "left" | "right";
  onOpen?: () => void;
  children: React.ReactNode;
}) {
  const t = useGT();
  const reduceMotion = useReducedMotion();
  const searchInputRef = React.useRef<TextInput>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [tabsVisible, setTabsVisible] = React.useState(true);
  const searchProgress = useSharedValue(0);

  const searchExpanded = searchOpen || search.length > 0;

  React.useEffect(() => {
    const duration = reduceMotion ? 0 : motionDuration.normal;

    searchProgress.value = withTiming(searchExpanded ? 1 : 0, { duration });

    if (searchExpanded) {
      setTabsVisible(false);
      const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }

    const timeout = setTimeout(() => setTabsVisible(true), duration);
    return () => clearTimeout(timeout);
  }, [reduceMotion, searchExpanded, searchProgress]);

  const searchContainerStyle = useAnimatedStyle(() => ({
    width: SEARCH_COLLAPSED_WIDTH + (contentWidth - SEARCH_COLLAPSED_WIDTH) * searchProgress.value,
  }));

  const searchInputStyle = useAnimatedStyle(() => ({
    opacity: searchProgress.value,
  }));

  // Logical `start`/`end` (Yoga mirrors them under RTL) to stay consistent with
  // the search widget's `start-0`/`end-0` class below.
  const tabsPositionStyle =
    searchSide === "left"
      ? { start: SEARCH_COLLAPSED_WIDTH + SEARCH_TABS_GAP, end: 0 }
      : { start: 0, end: SEARCH_COLLAPSED_WIDTH + SEARCH_TABS_GAP };

  return (
    <View className="relative h-11" style={{ width: contentWidth }}>
      {tabsVisible ? (
        <View className="absolute top-0 h-11 justify-center" style={tabsPositionStyle}>
          {children}
        </View>
      ) : null}
      <Animated.View
        className={cn(
          "absolute top-0 z-10 h-11 overflow-hidden rounded-full border",
          searchSide === "left" ? "start-0" : "end-0",
          HAS_LIQUID_GLASS
            ? "border-transparent bg-transparent"
            : "border-border-subtle bg-card-bg shadow-sm",
        )}
        style={searchContainerStyle}
      >
        {HAS_LIQUID_GLASS ? <GlassView pointerEvents="none" style={PILL_GLASS_STYLE} /> : null}
        <View className="h-full flex-row items-center gap-2 px-0">
          <Button
            variant="ghost"
            size="icon-lg"
            accessibilityLabel={searchExpanded ? t("Focus search") : t("Open search")}
            onPress={() => {
              onOpen?.();
              setSearchOpen(true);
            }}
            className="shrink-0 rounded-full"
          >
            <Icon as={Search} className="size-4 text-muted-foreground/50" />
          </Button>
          <Animated.View className="min-w-0 flex-1" style={searchInputStyle}>
            <TextInput
              ref={searchInputRef}
              value={search}
              onChangeText={onChangeSearch}
              placeholder={placeholder}
              className="h-11 min-w-0 flex-1 bg-transparent px-0 text-base leading-5 text-text"
              placeholderTextColorClassName="accent-muted-foreground/50"
              returnKeyType="search"
            />
          </Animated.View>
          {searchExpanded ? (
            <Button
              variant="ghost"
              size="icon-lg"
              accessibilityLabel={search.length > 0 ? t("Clear search") : t("Close search")}
              onPress={() => {
                if (search.length > 0) {
                  onChangeSearch("");
                } else {
                  setSearchOpen(false);
                  searchInputRef.current?.blur();
                }
              }}
              className="shrink-0 rounded-full"
            >
              <Icon as={X} className="size-4 text-text-muted" />
            </Button>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}
