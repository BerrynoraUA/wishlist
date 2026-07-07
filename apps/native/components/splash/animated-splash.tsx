import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Appearance, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const IS_ANDROID = process.env.EXPO_OS === "android";

// Keep the OS splash on screen until our identical overlay is rendered,
// so the native -> JS handoff is invisible. iOS only: on Android the native
// splash already stays up until the first frame is drawn (which is this
// overlay), while preventAutoHideAsync suppresses window drawing entirely
// and is prone to leaving the app stuck on a gray frozen window
// (expo/expo#30643, #33762).
if (!IS_ANDROID) {
  void SplashScreen.preventAutoHideAsync().catch(() => {});
}

// Must match the expo-splash-screen config in app.json exactly (light/dark bg tokens).
const SPLASH_BACKGROUND_LIGHT = "#FAF7F8";
const SPLASH_BACKGROUND_DARK = "#0C0C0F";
const ICON_SIZE = 114;
const ICON_SOURCE = require("@/assets/images/icon.png");

const AppReadyContext = createContext<() => void>(() => {});

/** Render this once the first real screen is on the tree to dismiss the splash. */
export function MarkAppReady() {
  const markReady = use(AppReadyContext);

  useEffect(() => {
    markReady();
  }, [markReady]);

  return null;
}

export function AnimatedSplash({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const [revealRequested, setRevealRequested] = useState(false);
  const [done, setDone] = useState(false);
  const revealStarted = useRef(false);
  // Captured once at launch: the native splash follows the device system theme,
  // so the overlay must match it, not the app's (possibly forced) theme.
  const splashBackground = useRef(
    Appearance.getColorScheme() === "dark" ? SPLASH_BACKGROUND_DARK : SPLASH_BACKGROUND_LIGHT,
  ).current;

  const pulse = useSharedValue(1);
  const iconScale = useSharedValue(1);
  const iconOpacity = useSharedValue(1);
  const backdropOpacity = useSharedValue(1);
  // Android: no transform on the app content — an animated wrapper around the
  // react-native-screens tree breaks rendering there (react-native-screens#2856).
  const contentScale = useSharedValue(IS_ANDROID ? 1 : 1.04);

  // Scale needed for the icon to fly past every screen edge.
  const zoomScale = (Math.hypot(width, height) / ICON_SIZE) * 1.4;

  const nativeSplashHidden = useRef(false);
  const hideNativeSplash = useCallback(() => {
    if (nativeSplashHidden.current) return;
    nativeSplashHidden.current = true;
    if (!IS_ANDROID) {
      void SplashScreen.hideAsync().catch(() => {});
    }
    // Idle heartbeat: a soft breathing pulse while the app boots.
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 850, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [pulse]);

  const markReady = useCallback(() => setRevealRequested(true), []);

  // Safety net in case the image onDisplay event never fires.
  useEffect(() => {
    const timeout = setTimeout(hideNativeSplash, 600);
    return () => clearTimeout(timeout);
  }, [hideNativeSplash]);

  // Last-resort failsafe: never leave the overlay covering the app,
  // even if the ready signal or an animation callback never arrives.
  useEffect(() => {
    const timeout = setTimeout(() => setDone(true), 15000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!revealRequested || revealStarted.current) return;
    revealStarted.current = true;
    cancelAnimation(pulse);
    pulse.value = withTiming(1, { duration: 150 });

    // Anticipation squash, then zoom straight through the viewer.
    iconScale.value = withSequence(
      withTiming(0.86, { duration: 220, easing: Easing.bezier(0.3, 0, 0.6, 1) }),
      withTiming(zoomScale, { duration: 520, easing: Easing.bezier(0.7, 0, 0.84, 0) }),
    );
    iconOpacity.value = withDelay(
      480,
      withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }),
    );
    backdropOpacity.value = withDelay(
      300,
      withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setDone)(true);
      }),
    );
    // The page underneath settles from a slight over-scale, like an app launch.
    if (!IS_ANDROID) {
      contentScale.value = withDelay(
        260,
        withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
      );
    }
  }, [revealRequested, backdropOpacity, contentScale, iconOpacity, iconScale, pulse, zoomScale]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value * pulse.value }],
  }));

  return (
    <AppReadyContext value={markReady}>
      <View style={{ flex: 1, backgroundColor: splashBackground }}>
        {IS_ANDROID ? (
          <View style={{ flex: 1 }}>{children}</View>
        ) : (
          <Animated.View style={[{ flex: 1 }, contentStyle]}>{children}</Animated.View>
        )}
        {!done && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: splashBackground },
                backdropStyle,
              ]}
            />
            <View
              style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}
            >
              <Animated.View style={iconStyle}>
                <Image
                  source={ICON_SOURCE}
                  style={{ width: ICON_SIZE, height: ICON_SIZE }}
                  contentFit="contain"
                  onDisplay={hideNativeSplash}
                />
              </Animated.View>
            </View>
          </View>
        )}
      </View>
    </AppReadyContext>
  );
}
