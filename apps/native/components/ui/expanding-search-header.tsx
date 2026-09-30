import { Button } from "@/components/ui/button";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Icon } from "@/components/ui/icon";
import {
  AnimatedGlassView,
  GLASS_CAPSULE_STYLE,
  GLASS_MERGE_SPACING,
  HAS_LIQUID_GLASS,
  MorphingGlassButton,
  useGlassReveal,
} from "@/components/ui/liquid-glass";
import { SearchClearButton } from "@/components/ui/search-clear-button";
import { useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { GlassContainer } from "expo-glass-effect";
import { useFocusEffect } from "expo-router";
import { useGT } from "gt-react-native";
import { ArrowLeft, Search, X } from "lucide-react-native";
import * as React from "react";
import { BackHandler, StyleSheet, TextInput, View } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const IS_ANDROID = process.env.EXPO_OS === "android";
const SEARCH_COLLAPSED_WIDTH = IS_ANDROID ? 48 : 44;
const SEARCH_TABS_GAP = 12;
/** Space between the open field and its close button (liquid glass only). */
const CLOSE_BUTTON_GAP = 8;
/** Nearly critically damped: the field stretches out with a little give, but doesn't wobble. */
const SEARCH_SPRING = { stiffness: 380, damping: 34, mass: 1 };

function clamp01(value: number) {
  "worklet";
  return Math.min(1, Math.max(0, value));
}

/**
 * A header row with a round search button that stretches into a search field across the
 * row, from either edge. The tabs (passed as children) sit beside the button and fade out
 * under the field while it is open. On iOS 26 it follows the system search: the field is
 * liquid glass with the native clear button, and a separate round close button splits off
 * its end. `searchEnabled` can turn search off (for tabs that can't be searched); the
 * button then melts away and the tabs slide over into its place.
 */
export function ExpandingSearchHeader({
  search,
  onChangeSearch,
  placeholder,
  contentWidth,
  searchSide = "left",
  searchEnabled = true,
  onOpen,
  children,
}: {
  search: string;
  onChangeSearch: (value: string) => void;
  placeholder: string;
  contentWidth: number;
  searchSide?: "left" | "right";
  searchEnabled?: boolean;
  onOpen?: () => void;
  /** Pass the fade progress to the tabs so their glass effect can reset after hiding. */
  children: (opacity: SharedValue<number>) => React.ReactNode;
}) {
  const t = useGT();
  const reduceMotion = useReducedMotion();
  const searchInputRef = React.useRef<TextInput>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const expanded = searchEnabled && (searchOpen || search.length > 0);
  const expandedRef = React.useRef(expanded);
  expandedRef.current = expanded;
  const expandProgress = useSharedValue(expanded ? 1 : 0);
  const enabledProgress = useGlassReveal(searchEnabled, reduceMotion);

  // Search that gets turned off closes, rather than reopening when it comes back.
  React.useEffect(() => {
    if (!searchEnabled) setSearchOpen(false);
  }, [searchEnabled]);

  React.useEffect(() => {
    expandProgress.value = reduceMotion
      ? expanded
        ? 1
        : 0
      : withSpring(expanded ? 1 : 0, SEARCH_SPRING);

    if (!expanded) return;
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [expandProgress, expanded, reduceMotion]);

  // With liquid glass the close button splits off the field, so the field stops short of it.
  const expandedFieldWidth = HAS_LIQUID_GLASS
    ? contentWidth - SEARCH_COLLAPSED_WIDTH - CLOSE_BUTTON_GAP
    : contentWidth;

  const fieldStyle = useAnimatedStyle(() => {
    const enabled = clamp01(enabledProgress.value);
    const expand = clamp01(expandProgress.value);
    return {
      width:
        (SEARCH_COLLAPSED_WIDTH + (expandedFieldWidth - SEARCH_COLLAPSED_WIDTH) * expand) * enabled,
      // Glass dissolves by itself; the fallback pill fades instead.
      opacity: HAS_LIQUID_GLASS ? 1 : enabled,
    };
  }, [expandedFieldWidth]);

  const inputStyle = useAnimatedStyle(() => ({ opacity: clamp01(expandProgress.value) }));
  const tabsOpacity = useDerivedValue(() => 1 - clamp01(expandProgress.value));

  // Logical `start`/`end` (Yoga mirrors them under RTL), matching the search side.
  const tabsStyle = useAnimatedStyle(() => {
    const offset = (SEARCH_COLLAPSED_WIDTH + SEARCH_TABS_GAP) * clamp01(enabledProgress.value);
    return {
      opacity: tabsOpacity.value,
      ...(searchSide === "left" ? { start: offset, end: 0 } : { start: 0, end: offset }),
    };
  }, [searchSide]);

  function openSearch() {
    onOpen?.();
    setSearchOpen(true);
  }

  const closeSearch = React.useCallback(() => {
    // Clear the native text as well: blurring makes iOS commit whatever the keyboard still
    // holds, which arrives as one late change carrying the old text.
    searchInputRef.current?.clear();
    searchInputRef.current?.blur();
    onChangeSearch("");
    setSearchOpen(false);
  }, [onChangeSearch]);

  useFocusEffect(
    React.useCallback(() => {
      if (!IS_ANDROID || !expanded) return;
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        closeSearch();
        return true;
      });
      return () => subscription.remove();
    }, [closeSearch, expanded]),
  );

  // Any text reopens the field, so a change that lands after it has closed (see
  // `closeSearch`) must not count.
  function handleChangeText(value: string) {
    if (!expandedRef.current) return;
    onChangeSearch(value);
  }

  const field = (
    <View className="h-full flex-row items-center">
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={
          expanded ? (IS_ANDROID ? t("Close search") : t("Focus search")) : t("Open search")
        }
        accessibilityElementsHidden={!searchEnabled}
        importantForAccessibility={searchEnabled ? "auto" : "no-hide-descendants"}
        disabled={!searchEnabled}
        onPress={
          expanded ? (IS_ANDROID ? closeSearch : () => searchInputRef.current?.focus()) : openSearch
        }
        pressedScale={1}
        pressedOpacity={1}
        className="size-11 shrink-0 items-center justify-center rounded-full android:size-12 android:overflow-hidden"
      >
        <Icon
          as={IS_ANDROID && expanded ? ArrowLeft : Search}
          className={cn(
            "size-5",
            expanded && !IS_ANDROID ? "text-muted-foreground/60" : "text-text",
          )}
        />
      </AnimatedPressable>
      <Animated.View
        className="min-w-0 flex-1"
        pointerEvents={expanded ? "auto" : "none"}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? "auto" : "no-hide-descendants"}
        style={inputStyle}
      >
        <TextInput
          ref={searchInputRef}
          value={search}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          className={cn(
            "h-11 min-w-0 flex-1 bg-transparent text-[17px] text-text android:h-12 android:text-base",
            HAS_LIQUID_GLASS && search.length === 0 ? "pe-4" : "pe-1",
          )}
          placeholderTextColorClassName={
            IS_ANDROID ? "accent-text-muted" : "accent-muted-foreground/60"
          }
          accessibilityLabel={placeholder}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Animated.View>
      {(HAS_LIQUID_GLASS || IS_ANDROID) && expanded && search.length > 0 ? (
        <SearchClearButton
          onPress={() => {
            onChangeSearch("");
            searchInputRef.current?.focus();
          }}
        />
      ) : null}
      {!HAS_LIQUID_GLASS && !IS_ANDROID && expanded ? (
        <Button
          variant="ghost"
          size="icon-lg"
          accessibilityLabel={search.length > 0 ? t("Clear search") : t("Close search")}
          onPress={() => {
            if (search.length > 0) {
              onChangeSearch("");
            } else {
              closeSearch();
            }
          }}
          className="shrink-0 rounded-full"
        >
          <Icon as={X} className="size-4 text-text-muted" />
        </Button>
      ) : null}
    </View>
  );

  return (
    <View className="relative h-11 android:h-12" style={{ width: contentWidth }}>
      <Animated.View
        className="absolute top-0 h-11 justify-center android:h-12"
        pointerEvents={expanded ? "none" : "box-none"}
        accessibilityElementsHidden={expanded}
        importantForAccessibility={expanded ? "no-hide-descendants" : "auto"}
        style={tabsStyle}
      >
        {children(tabsOpacity)}
      </Animated.View>
      {HAS_LIQUID_GLASS ? (
        <GlassContainer
          spacing={GLASS_MERGE_SPACING}
          style={[styles.glassRow, searchSide === "left" ? styles.start : styles.end]}
        >
          <AnimatedGlassView
            isInteractive
            glassEffectStyle={{
              style: searchEnabled ? "regular" : "none",
              animate: !reduceMotion,
            }}
            style={[GLASS_CAPSULE_STYLE, styles.field, fieldStyle]}
          >
            {field}
          </AnimatedGlassView>
          <MorphingGlassButton
            visible={expanded}
            placement="after"
            gap={CLOSE_BUTTON_GAP}
            accessibilityLabel={t("Close search")}
            onPress={closeSearch}
          >
            <Icon as={X} className="size-5 text-text" />
          </MorphingGlassButton>
        </GlassContainer>
      ) : (
        <Animated.View
          className={cn(
            "absolute top-0 z-10 h-11 overflow-hidden rounded-full border border-border-subtle bg-card-bg shadow-sm",
            IS_ANDROID && "h-12 border-transparent bg-bg-muted shadow-none",
            IS_ANDROID && expanded && "bg-brand-lighter",
            searchSide === "left" ? "start-0" : "end-0",
          )}
          style={fieldStyle}
        >
          {field}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  glassRow: {
    position: "absolute",
    top: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  start: { start: 0 },
  end: { end: 0 },
  field: { height: SEARCH_COLLAPSED_WIDTH, overflow: "hidden" },
});
