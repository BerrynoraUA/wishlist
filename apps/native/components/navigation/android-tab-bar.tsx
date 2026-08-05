import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  NAV_TAB_BAR_BACKDROP_OFFSET,
  NAV_TAB_BAR_FAB_OVERHANG,
  NAV_TAB_BAR_HEIGHT,
  NAV_TAB_BAR_MIN_BOTTOM_INSET,
  NAV_TAB_BAR_TOP_PADDING,
} from "@/lib/layout";
import { useReducedMotion } from "@/lib/motion";
import { NATIVE_ACCENTS, getThemeAccent } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useGT } from "gt-react-native";
import { Plus } from "lucide-react-native";
import * as React from "react";
import { Image, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useCSSVariable, useUniwind } from "uniwind";

const FAB_OVERHANG = NAV_TAB_BAR_FAB_OVERHANG;
const FAB_SIZE = 52;
const TAB_BAR_TOP_PADDING = NAV_TAB_BAR_TOP_PADDING;
const BACKDROP_TOP = TAB_BAR_TOP_PADDING + NAV_TAB_BAR_HEIGHT / 2 + NAV_TAB_BAR_BACKDROP_OFFSET;
const INDICATOR_VERTICAL_INSET = 7;
const INDICATOR_SPRING = { damping: 18, stiffness: 220, mass: 0.7 };

/**
 * Material Symbols (rounded) path data, viewBox "0 -960 960 960". These are
 * the same glyphs the native tab bar rendered via the `md` prop — kept so the
 * custom Android bar stays visually familiar. Source:
 * github.com/google/material-design-icons.
 */
const MATERIAL_GLYPHS = {
  featured_seasonal_and_gifts:
    "M160-160v-360q-33 0-56.5-23.5T80-600v-80q0-33 23.5-56.5T160-760h128q-5-9-6.5-19t-1.5-21q0-50 35-85t85-35q23 0 43 8.5t37 23.5q17-16 37-24t43-8q50 0 85 35t35 85q0 11-2 20.5t-6 19.5h128q33 0 56.5 23.5T880-680v80q0 33-23.5 56.5T800-520v360q0 33-23.5 56.5T720-80H240q-33 0-56.5-23.5T160-160Zm400-680q-17 0-28.5 11.5T520-800q0 17 11.5 28.5T560-760q17 0 28.5-11.5T600-800q0-17-11.5-28.5T560-840Zm-200 40q0 17 11.5 28.5T400-760q17 0 28.5-11.5T440-800q0-17-11.5-28.5T400-840q-17 0-28.5 11.5T360-800ZM160-680v80h280v-80H160Zm280 520v-360H240v360h200Zm80 0h200v-360H520v360Zm280-440v-80H520v80h280Z",
  group:
    "M40-272q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v32q0 33-23.5 56.5T600-160H120q-33 0-56.5-23.5T40-240v-32Zm698 112q11-18 16.5-38.5T760-240v-40q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v40q0 33-23.5 56.5T840-160H738ZM360-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm400-160q0 66-47 113t-113 47q-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113Z",
  account_circle:
    "M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Zm0-360q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm0-60Zm0 360Z",
} as const;

type MaterialGlyphName = keyof typeof MATERIAL_GLYPHS;

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
  | { kind: "tab"; name: string; label: string; glyph: MaterialGlyphName }
  | { kind: "tab"; name: string; label: string; image: number }
  | { kind: "create"; label: string };

function MaterialGlyph({
  name,
  color,
  size = 24,
}: {
  name: MaterialGlyphName;
  color: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 -960 960 960">
      <Path d={MATERIAL_GLYPHS[name]} fill={color} />
    </Svg>
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
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { theme } = useUniwind();
  const accent = getThemeAccent(theme);
  const fabGradientClassName =
    NATIVE_ACCENTS.find((entry) => entry.name === accent)?.swatchClassName ??
    NATIVE_ACCENTS[0].swatchClassName;

  const activeColor = cssColor(useCSSVariable("--color-brand"), "#208aef");
  const inactiveColor = cssColor(useCSSVariable("--color-text-muted"), "#6b7280");

  const slots: TabSlot[] = [
    {
      kind: "tab",
      name: "wishlists",
      label: t("Wishlists"),
      glyph: "featured_seasonal_and_gifts",
    },
    {
      kind: "tab",
      name: "secret-santa",
      label: t("Secret Santa"),
      image: require("@/assets/images/secret-santa-tab.png"),
    },
    { kind: "create", label: t("Create") },
    { kind: "tab", name: "friends", label: t("Friends"), glyph: "group" },
    { kind: "tab", name: "profile", label: t("Profile"), glyph: "account_circle" },
  ];

  const [barWidth, setBarWidth] = React.useState(0);
  const slotWidth = barWidth > 0 ? barWidth / slots.length : 0;
  const focusedName = state.routes[state.index]?.name;
  const selectedSlot = slots.findIndex((slot) => slot.kind === "tab" && slot.name === focusedName);

  const indicatorWidth = Math.max(0, Math.min(slotWidth - 10, 76));
  const indicatorTarget =
    selectedSlot >= 0 ? slotWidth * selectedSlot + (slotWidth - indicatorWidth) / 2 : 0;

  const indicatorX = useSharedValue(indicatorTarget);
  const hasMeasured = React.useRef(false);

  React.useEffect(() => {
    if (slotWidth <= 0 || selectedSlot < 0) return;
    if (!hasMeasured.current || reduceMotion) {
      indicatorX.value = indicatorTarget;
      hasMeasured.current = true;
      return;
    }
    indicatorX.value = withSpring(indicatorTarget, INDICATOR_SPRING);
  }, [indicatorTarget, indicatorX, reduceMotion, selectedSlot, slotWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
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
        paddingBottom: Math.max(insets.bottom, NAV_TAB_BAR_MIN_BOTTOM_INSET),
      }}
    >
      <View
        pointerEvents="none"
        className="absolute inset-x-0 bottom-0 bg-bg/95"
        style={{ top: BACKDROP_TOP }}
      />
      <View
        className="flex-row rounded-full border border-border-subtle bg-card shadow-[0px_6px_18px_rgba(15,23,42,0.16)]"
        style={{ height: NAV_TAB_BAR_HEIGHT }}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      >
        {slotWidth > 0 && selectedSlot >= 0 ? (
          <Animated.View
            pointerEvents="none"
            className="absolute rounded-full bg-brand-lighter"
            style={[
              {
                top: INDICATOR_VERTICAL_INSET,
                height: NAV_TAB_BAR_HEIGHT - INDICATOR_VERTICAL_INSET * 2 - 2,
                width: indicatorWidth,
              },
              indicatorStyle,
            ]}
          />
        ) : null}
        {slots.map((slot) => {
          if (slot.kind === "create") {
            return (
              <View key="create" className="flex-1 items-center justify-center">
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel={slot.label}
                  onPress={onCreatePress}
                  className={cn(
                    "items-center justify-center rounded-full shadow-[0px_6px_14px_rgba(15,23,42,0.28)]",
                    fabGradientClassName,
                  )}
                  style={{ width: FAB_SIZE, height: FAB_SIZE, marginTop: -FAB_OVERHANG }}
                >
                  <Icon as={Plus} className="size-7 text-white" strokeWidth={2.5} />
                </AnimatedPressable>
              </View>
            );
          }

          const route = state.routes.find((candidate) => candidate.name === slot.name);
          if (!route) return <View key={slot.name} className="flex-1" />;

          const isFocused = focusedName === slot.name;
          const color = isFocused ? activeColor : inactiveColor;

          return (
            <AnimatedPressable
              key={slot.name}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={slot.label}
              onPress={() => handleTabPress(route, isFocused)}
              className="flex-1 items-center justify-center gap-0.5"
              pressedScale={0.94}
            >
              {"image" in slot ? (
                <Image
                  source={slot.image}
                  style={{ width: 24, height: 24, tintColor: color }}
                  resizeMode="contain"
                />
              ) : (
                <MaterialGlyph name={slot.glyph} color={color} />
              )}
              <Text
                numberOfLines={1}
                className={cn(
                  "text-[10px] font-semibold",
                  isFocused ? "text-brand" : "text-text-muted",
                )}
              >
                {slot.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}
