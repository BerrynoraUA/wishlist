import { hapticSelection } from "@/lib/haptics";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { GuideTarget } from "@/components/user-guide/guide-target";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  NAV_TAB_BAR_BACKDROP_OFFSET,
  NAV_TAB_BAR_FAB_OVERHANG,
  NAV_TAB_BAR_HEIGHT,
  NAV_TAB_BAR_TOP_PADDING,
  useBottomSafeAreaPadding,
} from "@/lib/layout";
import { useReducedMotion } from "@/lib/motion";
import { NATIVE_ACCENTS, getThemeAccent } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useGT } from "gt-react-native";
import { CircleUserRound, Gift, Plus, Users, type LucideIcon } from "lucide-react-native";
import * as React from "react";
import { I18nManager, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { useCSSVariable, useUniwind } from "uniwind";

const FAB_OVERHANG = NAV_TAB_BAR_FAB_OVERHANG;
const FAB_SIZE = 52;
const TAB_BAR_TOP_PADDING = NAV_TAB_BAR_TOP_PADDING;
const BACKDROP_TOP = TAB_BAR_TOP_PADDING + NAV_TAB_BAR_HEIGHT / 2 + NAV_TAB_BAR_BACKDROP_OFFSET;
const INDICATOR_TOP = 5;
const INDICATOR_HEIGHT = 30;
const INDICATOR_WIDTH = 56;
const INDICATOR_SPRING = { damping: 18, stiffness: 220, mass: 0.7 };

/**
 * Structural types for the pieces of React Navigation's BottomTabBarProps we
 * use — @react-navigation/bottom-tabs is only a transitive dependency of
 * expo-router, so we don't import its types directly.
 */
type TabRoute = {
  key: string;
  name: string;
  state?: { key?: string; index?: number };
};

type TabBarNavigation = {
  emit: (options: { type: "tabPress"; target: string; canPreventDefault: true }) => {
    defaultPrevented: boolean;
  };
  navigate: (name: string) => void;
  dispatch: (action: { type: string; target?: string }) => void;
};

export type AndroidTabBarProps = {
  state: { index: number; routes: TabRoute[] };
  navigation: TabBarNavigation;
  /** Opens the create menu overlay instead of navigating to the create route. */
  onCreatePress: () => void;
  /** Forwards presses to the user guide, mirroring the old native listeners. */
  onTabPress: (name: string) => void;
};

type TabSlot =
  | { kind: "tab"; name: string; label: string; icon: LucideIcon | "santa" }
  | { kind: "create"; label: string };

/** Outline Santa hat drawn on Lucide's grid, so it matches the other tab icons. */
function SantaHatIcon({ color, strokeWidth }: { color: string; strokeWidth: number }) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M5 16C5 9.5 8.2 4.5 13 4.5c3.4 0 5.6 2.2 6.4 5.6" />
      <Path d="M18 16c0-2.8-1-5-3-6.5" />
      <Path d="M5 16h13.5a2 2 0 0 1 0 4H5a2 2 0 0 1 0-4Z" />
      <Circle cx={19.5} cy={12} r={1.75} />
    </Svg>
  );
}

/** The raised Create button's gradient, following the user's accent. */
export function getFabGradientClassName(theme: string) {
  const accent = getThemeAccent(theme);
  return (
    NATIVE_ACCENTS.find((entry) => entry.name === accent)?.swatchClassName ??
    NATIVE_ACCENTS[0].swatchClassName
  );
}

function cssColor(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

/**
 * Custom Android tab bar: a floating rounded pill over the app background
 * with an animated accent indicator and a raised gradient Create button in
 * the center. Geometry stays close to NAV_TAB_BAR_HEIGHT + safe-area bottom
 * so the create menu and user-guide nav highlights keep lining up.
 */
export function AndroidTabBar({
  state,
  navigation,
  onCreatePress,
  onTabPress,
}: AndroidTabBarProps) {
  const t = useGT();
  const bottomSafeAreaPadding = useBottomSafeAreaPadding();
  const reduceMotion = useReducedMotion();
  const { theme } = useUniwind();
  const fabGradientClassName = getFabGradientClassName(theme);

  const activeColor = cssColor(useCSSVariable("--color-brand"), "#208aef");
  const inactiveColor = cssColor(useCSSVariable("--color-text-muted"), "#6b7280");

  const slots: TabSlot[] = [
    {
      kind: "tab",
      name: "wishlists",
      label: t("Wishlists"),
      icon: Gift,
    },
    {
      kind: "tab",
      name: "secret-santa",
      label: t("Secret Santa"),
      icon: "santa",
    },
    { kind: "create", label: t("Create") },
    { kind: "tab", name: "friends", label: t("Friends"), icon: Users },
    { kind: "tab", name: "profile", label: t("Profile"), icon: CircleUserRound },
  ];

  const [barWidth, setBarWidth] = React.useState(0);
  const slotWidth = barWidth > 0 ? barWidth / slots.length : 0;
  const focusedName = state.routes[state.index]?.name;
  const selectedSlot = slots.findIndex((slot) => slot.kind === "tab" && slot.name === focusedName);

  const indicatorWidth = Math.min(slotWidth, INDICATOR_WIDTH);
  const indicatorTarget =
    selectedSlot >= 0
      ? slotWidth * (I18nManager.isRTL ? slots.length - 1 - selectedSlot : selectedSlot) +
        (slotWidth - indicatorWidth) / 2
      : 0;

  const indicatorX = useSharedValue(indicatorTarget);
  // A value set while the sliding pill attaches can be dropped, leaving it at the bar's
  // start, so a static pill holds the spot until the first move between tabs.
  const [hasSlid, setHasSlid] = React.useState(false);
  const previousTarget = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (slotWidth <= 0 || selectedSlot < 0) return;
    const previous = previousTarget.current;
    previousTarget.current = indicatorTarget;
    if (previous === null || previous === indicatorTarget) return;
    if (reduceMotion) {
      indicatorX.set(indicatorTarget);
    } else {
      if (!hasSlid) indicatorX.set(previous);
      indicatorX.set(withSpring(indicatorTarget, INDICATOR_SPRING));
    }
    setHasSlid(true);
  }, [hasSlid, indicatorTarget, indicatorX, reduceMotion, selectedSlot, slotWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.get() }],
  }));

  function handleTabPress(route: TabRoute, isFocused: boolean) {
    onTabPress(route.name);

    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (event.defaultPrevented) return;

    if (!isFocused) {
      hapticSelection();
      navigation.navigate(route.name);
      return;
    }

    // Re-tapping the active tab pops its nested stack to the top, matching
    // the native tab bar behavior.
    if (route.state?.key && (route.state.index ?? 0) > 0) {
      navigation.dispatch({ type: "POP_TO_TOP", target: route.state.key });
    }
  }

  return (
    <View
      className="px-3"
      style={{
        position: "absolute",
        right: 0,
        bottom: 0,
        left: 0,
        paddingTop: TAB_BAR_TOP_PADDING,
        paddingBottom: bottomSafeAreaPadding,
      }}
    >
      <View
        pointerEvents="none"
        className="absolute inset-x-0 bottom-0 bg-linear-to-t from-bg from-65% to-bg/0"
        style={{ top: BACKDROP_TOP - NAV_TAB_BAR_HEIGHT / 2 }}
      />
      <View
        className="flex-row rounded-full border border-border-subtle bg-card shadow-[0px_6px_18px_rgba(15,23,42,0.16)] dark:bg-bg-muted"
        style={{ height: NAV_TAB_BAR_HEIGHT }}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      >
        {slotWidth > 0 && selectedSlot >= 0 ? (
          <>
            <View
              pointerEvents="none"
              className="absolute rounded-full bg-brand-lighter"
              style={{
                top: INDICATOR_TOP,
                left: indicatorTarget,
                height: INDICATOR_HEIGHT,
                width: indicatorWidth,
                opacity: hasSlid ? 0 : 1,
              }}
            />
            <Animated.View
              pointerEvents="none"
              className="absolute rounded-full bg-brand-lighter"
              style={[
                {
                  top: INDICATOR_TOP,
                  left: 0,
                  height: INDICATOR_HEIGHT,
                  width: indicatorWidth,
                  opacity: hasSlid ? 1 : 0,
                },
                indicatorStyle,
              ]}
            />
          </>
        ) : null}
        {slots.map((slot) => {
          if (slot.kind === "create") {
            return (
              <View key="create" className="flex-1 items-center justify-center">
                <GuideTarget
                  attachedTooltip={false}
                  borderRadius={999}
                  id="nav-create"
                  style={{ width: FAB_SIZE, height: FAB_SIZE, top: -FAB_OVERHANG }}
                >
                  <AnimatedPressable
                    accessibilityRole="button"
                    accessibilityLabel={slot.label}
                    onPress={onCreatePress}
                    className={cn(
                      "size-full items-center justify-center overflow-hidden rounded-full shadow-[0px_6px_14px_rgba(15,23,42,0.28)]",
                      fabGradientClassName,
                    )}
                  >
                    <Icon as={Plus} className="size-7 text-white" strokeWidth={2.5} />
                  </AnimatedPressable>
                </GuideTarget>
              </View>
            );
          }

          const route = state.routes.find((candidate) => candidate.name === slot.name);
          if (!route) return <View key={slot.name} className="flex-1" />;

          const isFocused = focusedName === slot.name;
          const color = isFocused ? activeColor : inactiveColor;

          return (
            <GuideTarget
              attachedTooltip={false}
              borderRadius={999}
              id={`nav-${slot.name}`}
              key={slot.name}
              style={{ flex: 1 }}
            >
              <AnimatedPressable
                accessibilityRole="tab"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={slot.label}
                onPress={() => handleTabPress(route, isFocused)}
                className="flex-1 items-center justify-center gap-0.5 overflow-hidden rounded-full"
              >
                {slot.icon === "santa" ? (
                  <SantaHatIcon color={color} strokeWidth={isFocused ? 2.4 : 1.9} />
                ) : (
                  <slot.icon color={color} size={24} strokeWidth={isFocused ? 2.4 : 1.9} />
                )}
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.1}
                  style={{ includeFontPadding: false, textAlignVertical: "center" }}
                  className={cn(
                    "max-w-full px-0.5 text-center text-xs leading-4 font-semibold",
                    isFocused ? "text-brand" : "text-text-muted",
                  )}
                >
                  {slot.label}
                </Text>
              </AnimatedPressable>
            </GuideTarget>
          );
        })}
      </View>
    </View>
  );
}
