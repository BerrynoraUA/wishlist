import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useProfile, useUpdateUserGuideStep } from "@/hooks/use-settings";
import {
  USER_GUIDE_COMPLETE_STEP,
  USER_GUIDE_SEGMENTS,
  getUserGuideSegmentForStep,
  getUserGuideStep,
  matchesUserGuideRoute,
  type UserGuideSegment,
  type UserGuideStep,
} from "@/components/user-guide/user-guide-config";
import { usePathname, useRouter } from "expo-router";
import * as React from "react";
import {
  Alert,
  Animated,
  Pressable,
  View,
  useWindowDimensions,
  type LayoutRectangle,
  type StyleProp,
  type View as NativeView,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";

type GuideTargetRegistration = {
  ref: React.RefObject<NativeView | null>;
  activate?: () => void;
};

type HighlightBox = LayoutRectangle & {
  tooltipTop: number;
  tooltipLeft: number;
};

type UserGuideContextValue = {
  active: boolean;
  completedStep: number;
  currentStep: UserGuideStep | null;
  currentSegment: UserGuideSegment | null;
  registerTarget: (id: string, target: GuideTargetRegistration) => () => void;
  completeStep: (step: number) => void;
  completeCurrentStep: () => void;
};

const UserGuideContext = React.createContext<UserGuideContextValue>({
  active: false,
  completedStep: 0,
  currentStep: null,
  currentSegment: null,
  registerTarget: () => () => {},
  completeStep: () => {},
  completeCurrentStep: () => {},
});

function normalizeCompletedStep(step: number | null | undefined) {
  if (!Number.isFinite(step)) return 0;
  return Math.max(0, Math.min(USER_GUIDE_COMPLETE_STEP, Number(step)));
}

function isBypassPath(pathname: string) {
  return pathname === "/" || pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
}

function getVirtualNavBox(targetId: string, width: number, height: number, bottomInset: number) {
  const order = ["nav-wishlists", "nav-discover", "nav-friends", "nav-profile"];
  const index = order.indexOf(targetId);
  if (index < 0) return null;

  const itemWidth = width / order.length;
  const tabHeight = 68 + bottomInset;

  return {
    x: itemWidth * index + itemWidth * 0.18,
    y: height - tabHeight + 8,
    width: itemWidth * 0.64,
    height: 46,
  };
}

export function UserGuideProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const { data: profile, isLoading } = useProfile();
  const updateGuideStep = useUpdateUserGuideStep();
  const targetsRef = React.useRef(new Map<string, GuideTargetRegistration>());
  const pulse = React.useRef(new Animated.Value(0)).current;
  const [highlightBox, setHighlightBox] = React.useState<HighlightBox | null>(null);
  const [sequenceIndex, setSequenceIndex] = React.useState(0);
  const brand = (useCSSVariable("--color-brand") as string | undefined) ?? "#c0267e";
  const cardBg = (useCSSVariable("--color-card-bg") as string | undefined) ?? "#111827";
  const border = (useCSSVariable("--color-border") as string | undefined) ?? "#334155";
  const text = (useCSSVariable("--color-text") as string | undefined) ?? "#f8fafc";
  const muted = (useCSSVariable("--color-text-muted") as string | undefined) ?? "#94a3b8";

  const completedStep = normalizeCompletedStep(profile?.userGuideStep);
  const active = Boolean(profile) && completedStep < USER_GUIDE_COMPLETE_STEP;
  const currentStep = active ? (getUserGuideStep(completedStep + 1) ?? null) : null;
  const currentSegment = currentStep ? (getUserGuideSegmentForStep(currentStep.id) ?? null) : null;
  const routeMatches = Boolean(currentSegment && matchesUserGuideRoute(pathname, currentSegment.route));
  const activeSequenceTarget = currentStep?.sequenceTargets?.[sequenceIndex] ?? null;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const completeStep = React.useCallback(
    (step: number) => {
      if (!active || step <= completedStep || step > USER_GUIDE_COMPLETE_STEP) return;
      updateGuideStep.mutate(step);
    },
    [active, completedStep, updateGuideStep],
  );

  React.useEffect(() => {
    if (!currentStep) return;
    if (currentStep.targetId === "nav-friends" && pathname === "/friends") {
      completeStep(currentStep.id);
    }
    if (currentStep.targetId === "nav-discover" && pathname === "/discover") {
      completeStep(currentStep.id);
    }
  }, [completeStep, currentStep, pathname]);

  React.useEffect(() => {
    if (isLoading || !active || !currentSegment || routeMatches) return;
    if (isBypassPath(pathname)) return;
    if (currentStep?.targetId === "nav-friends" && pathname === "/friends") return;
    if (currentStep?.targetId === "nav-discover" && pathname === "/discover") return;

    router.replace(currentSegment.fallbackPath as never);
  }, [active, currentSegment, currentStep, isLoading, pathname, routeMatches, router]);

  React.useEffect(() => {
    setSequenceIndex(0);
  }, [currentStep?.id]);

  React.useEffect(() => {
    let cancelled = false;

    function measure() {
      if (!active || !currentStep || !routeMatches) {
        setHighlightBox(null);
        return;
      }

      const targetId = activeSequenceTarget?.targetId ?? currentStep.targetId;
      const virtualBox = getVirtualNavBox(targetId, window.width, window.height, insets.bottom);

      if (virtualBox) {
        setHighlightBox({
          ...virtualBox,
          tooltipTop: Math.max(16, virtualBox.y - 58),
          tooltipLeft: Math.max(16, Math.min(virtualBox.x - 66, window.width - 236)),
        });
        return;
      }

      const target = targetsRef.current.get(targetId);
      target?.ref.current?.measureInWindow((x, y, width, height) => {
        if (cancelled) return;
        if (width <= 0 || height <= 0 || y < 0 || y > window.height) {
          setHighlightBox(null);
          return;
        }

        const tooltipTop = y > 76 ? y - 62 : y + height + 10;
        setHighlightBox({
          x,
          y,
          width,
          height,
          tooltipTop: Math.max(16, Math.min(tooltipTop, window.height - 98)),
          tooltipLeft: Math.max(16, Math.min(x + width / 2 - 110, window.width - 236)),
        });
      });
    }

    measure();
    const interval = setInterval(measure, 350);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [active, activeSequenceTarget, currentStep, insets.bottom, routeMatches, window.height, window.width]);

  const registerTarget = React.useCallback((id: string, target: GuideTargetRegistration) => {
    targetsRef.current.set(id, target);
    return () => {
      if (targetsRef.current.get(id) === target) {
        targetsRef.current.delete(id);
      }
    };
  }, []);

  const completeCurrentStep = React.useCallback(() => {
    if (!currentStep || currentStep.actionRequired || currentStep.sequenceTargets) return;
    completeStep(currentStep.id);
  }, [completeStep, currentStep]);

  const skipCurrentStep = React.useCallback(() => {
    if (currentStep) completeStep(currentStep.id);
  }, [completeStep, currentStep]);

  const advanceSequence = React.useCallback(() => {
    if (!currentStep?.sequenceTargets?.length) return;
    const target = currentStep.sequenceTargets[sequenceIndex];
    if (target?.activateOnNext) {
      targetsRef.current.get(target.targetId)?.activate?.();
    }
    if (sequenceIndex >= currentStep.sequenceTargets.length - 1) {
      completeStep(currentStep.id);
      return;
    }
    setSequenceIndex((value) => Math.min(value + 1, currentStep.sequenceTargets!.length - 1));
  }, [completeStep, currentStep, sequenceIndex]);

  const pageSteps = React.useMemo(() => {
    if (!currentSegment) return [];
    return currentSegment.stepIds.map((stepId) => getUserGuideStep(stepId)).filter(Boolean);
  }, [currentSegment]);

  const pageProgress = React.useMemo(() => {
    if (!currentSegment || !currentStep) return { label: "", percent: 0 };
    const index = currentSegment.stepIds.indexOf(currentStep.id);
    const localStep = index < 0 ? 1 : index + 1;
    return {
      label: `Step ${localStep} of ${currentSegment.stepIds.length}`,
      percent: localStep / currentSegment.stepIds.length,
    };
  }, [currentSegment, currentStep]);

  const contextValue = React.useMemo(
    () => ({
      active,
      completedStep,
      currentStep,
      currentSegment,
      registerTarget,
      completeStep,
      completeCurrentStep,
    }),
    [active, completedStep, completeCurrentStep, completeStep, currentSegment, currentStep, registerTarget],
  );

  function finishGuide() {
    Alert.alert("Finish user guide?", "Are you sure you want to finish the user guide?", [
      { text: "Cancel", style: "cancel" },
      { text: "Finish", style: "destructive", onPress: () => updateGuideStep.mutate(USER_GUIDE_COMPLETE_STEP) },
    ]);
  }

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] });

  return (
    <UserGuideContext.Provider value={contextValue}>
      {children}
      {active && currentStep && currentSegment && routeMatches ? (
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000 }}
        >
          {highlightBox ? (
            <>
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: highlightBox.x - 6,
                  top: highlightBox.y - 6,
                  width: highlightBox.width + 12,
                  height: highlightBox.height + 12,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: brand,
                  opacity,
                  transform: [{ scale }],
                }}
              />
              <View
                style={{
                  position: "absolute",
                  left: highlightBox.tooltipLeft,
                  top: highlightBox.tooltipTop,
                  width: 220,
                  gap: 8,
                  borderWidth: 1,
                  borderColor: border,
                  borderRadius: 12,
                  backgroundColor: cardBg,
                  padding: 10,
                }}
              >
                <Text style={{ color: text, fontSize: 12, fontWeight: "800" }}>
                  {activeSequenceTarget?.tooltip ?? currentStep.tooltip}
                </Text>
                {currentStep.sequenceTargets ? (
                  <Button size="sm" onPress={advanceSequence} disabled={updateGuideStep.isPending}>
                    <Text>
                      {sequenceIndex >= currentStep.sequenceTargets.length - 1 ? "Done" : "Next"}
                    </Text>
                  </Button>
                ) : null}
              </View>
            </>
          ) : null}

          <View
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              bottom: Math.max(16, insets.bottom + 12),
              gap: 12,
              borderWidth: 1,
              borderColor: border,
              borderRadius: 14,
              backgroundColor: cardBg,
              padding: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: text, fontSize: 13, fontWeight: "900" }}>
                  {currentSegment.title}
                </Text>
                <Text style={{ color: muted, fontSize: 12 }}>{pageProgress.label}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={finishGuide}>
                <Text style={{ color: muted, fontSize: 18, fontWeight: "900" }}>×</Text>
              </Pressable>
            </View>
            <View style={{ height: 6, overflow: "hidden", borderRadius: 999, backgroundColor: border }}>
              <View
                style={{
                  width: `${Math.round(pageProgress.percent * 100)}%`,
                  height: "100%",
                  borderRadius: 999,
                  backgroundColor: brand,
                }}
              />
            </View>
            <View style={{ gap: 6 }}>
              {pageSteps.map((step, index) =>
                step ? (
                  <Text
                    key={step.id}
                    style={{
                      color: step.id === currentStep.id ? text : muted,
                      fontSize: 12,
                      fontWeight: step.id === currentStep.id ? "900" : "700",
                    }}
                  >
                    {index + 1}. {step.listTitle}
                  </Text>
                ) : null,
              )}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="outline" size="sm" onPress={skipCurrentStep} disabled={updateGuideStep.isPending}>
                <Text>Skip</Text>
              </Button>
              <Button
                size="sm"
                onPress={completeCurrentStep}
                disabled={Boolean(currentStep.actionRequired || currentStep.sequenceTargets || updateGuideStep.isPending)}
              >
                <Text>
                  {currentStep.actionRequired || currentStep.sequenceTargets ? "Use highlighted control" : "Next"}
                </Text>
              </Button>
            </View>
          </View>
        </View>
      ) : null}
    </UserGuideContext.Provider>
  );
}

export function useUserGuide() {
  return React.useContext(UserGuideContext);
}

export function useUserGuideStepCompletion(step: number) {
  const { completeStep } = useUserGuide();
  return React.useCallback(() => completeStep(step), [completeStep, step]);
}

export function UserGuideTarget({
  targetId,
  onGuideActivate,
  children,
  pointerEvents,
  style,
}: {
  targetId: string;
  onGuideActivate?: () => void;
  children: React.ReactNode;
  pointerEvents?: React.ComponentProps<typeof View>["pointerEvents"];
  style?: StyleProp<ViewStyle>;
}) {
  const ref = React.useRef<NativeView | null>(null);
  const { registerTarget } = useUserGuide();

  React.useEffect(
    () => registerTarget(targetId, { ref, activate: onGuideActivate }),
    [onGuideActivate, registerTarget, targetId],
  );

  return (
    <View ref={ref} collapsable={false} pointerEvents={pointerEvents} style={style}>
      {children}
    </View>
  );
}
