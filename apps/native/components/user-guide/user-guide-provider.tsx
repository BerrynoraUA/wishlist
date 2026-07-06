import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useProfile, useUpdateUserGuideStep } from "@/hooks/use-settings";
import { motionDuration, useReducedMotion } from "@/lib/motion";
import { useAuth } from "@/providers/auth-provider";
import { Portal } from "@rn-primitives/portal";
import { usePathname } from "expo-router";
import { useGT } from "gt-react-native";
import { X } from "lucide-react-native";
import * as React from "react";
import {
  AccessibilityInfo,
  Pressable,
  View,
  type LayoutRectangle,
  type View as RNView,
  useWindowDimensions,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  USER_GUIDE_COMPLETE_STEP,
  getUserGuideSegmentForStep,
  getUserGuideStep,
  matchesUserGuideRoute,
  type UserGuideSegment,
  type UserGuideStep,
} from "./user-guide-config";

type RegisteredTarget = {
  attachedTooltip?: boolean;
  portalTooltipAnchor?: "target" | "footer";
  ref: React.RefObject<RNView | null>;
  tooltipHorizontalOffset?: number;
  tooltipPlacementOverride?: "top" | "bottom";
  tooltipVerticalOffset?: number;
  activate?: () => void;
};

type GuideHighlightBox = LayoutRectangle & {
  source: "nav" | "target";
  tooltipTop: number;
  tooltipLeft: number;
  tooltipPlacement: "top" | "bottom";
};

type UserGuideContextValue = {
  active: boolean;
  completedStep: number;
  currentStep: UserGuideStep | null;
  currentSegment: UserGuideSegment | null;
  completeStep: (step: number) => void;
  completeCurrentStep: () => void;
  handleTabPress: (name: string) => void;
};

type UserGuideTargetRegistrationValue = {
  activeTargetId: string | null;
  activeTooltip: {
    arrowLeft: number;
    hasSequence: boolean;
    isLastSequence: boolean;
    left: number;
    onNext: () => void;
    pending: boolean;
    placement: "top" | "bottom";
    text: string;
  } | null;
  registerTarget: (id: string, target: RegisteredTarget) => () => void;
  requestMeasure: () => void;
};

const UserGuideContext = React.createContext<UserGuideContextValue>({
  active: false,
  completedStep: 0,
  currentStep: null,
  currentSegment: null,
  completeStep: () => {},
  completeCurrentStep: () => {},
  handleTabPress: () => {},
});

const UserGuideTargetRegistrationContext = React.createContext<UserGuideTargetRegistrationValue>({
  activeTargetId: null,
  activeTooltip: null,
  registerTarget: () => () => {},
  requestMeasure: () => {},
});

// Order must match the tab bar: wishlists, secret santa, create, friends, profile.
const NAV_TARGETS = [
  "nav-wishlists",
  "nav-secret-santa",
  "nav-create",
  "nav-friends",
  "nav-profile",
] as const;
const GUIDE_TOOLTIP_WIDTH = 230;
const GUIDE_TOOLTIP_HEIGHT = 78;
const GUIDE_TOOLTIP_COMPACT_HEIGHT = 44;

function normalizeCompletedStep(step: number | null | undefined): number {
  if (!Number.isFinite(step)) return 0;
  return Math.max(0, Math.min(USER_GUIDE_COMPLETE_STEP, Number(step)));
}

function boxesEqual(a: GuideHighlightBox | null, b: GuideHighlightBox | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.round(a.x) === Math.round(b.x) &&
    Math.round(a.y) === Math.round(b.y) &&
    Math.round(a.width) === Math.round(b.width) &&
    Math.round(a.height) === Math.round(b.height) &&
    Math.round(a.tooltipTop) === Math.round(b.tooltipTop) &&
    Math.round(a.tooltipLeft) === Math.round(b.tooltipLeft) &&
    a.source === b.source &&
    a.tooltipPlacement === b.tooltipPlacement
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

export function UserGuideProvider({ children }: { children: React.ReactNode }) {
  const t = useGT();
  const pathname = usePathname();
  const { user } = useAuth();
  const profileQuery = useProfile();
  const updateGuideStep = useUpdateUserGuideStep();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const targetsRef = React.useRef(new Map<string, RegisteredTarget>());
  const measureFrameRef = React.useRef<number | null>(null);
  const [highlightBox, setHighlightBox] = React.useState<GuideHighlightBox | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);
  const [sequenceIndex, setSequenceIndex] = React.useState(0);
  const [instantHighlight, setInstantHighlight] = React.useState(false);

  const completedStep = normalizeCompletedStep(profileQuery.data?.userGuideStep);
  const active = Boolean(user?.id && profileQuery.data) && completedStep < USER_GUIDE_COMPLETE_STEP;
  const currentStep = active ? (getUserGuideStep(completedStep + 1) ?? null) : null;
  const currentSegment = currentStep ? (getUserGuideSegmentForStep(currentStep.id) ?? null) : null;
  const routeMatchesCurrentSegment = Boolean(
    currentSegment && matchesUserGuideRoute(pathname, currentSegment.route),
  );
  const activeSequenceTarget = currentStep?.sequenceTargets?.[sequenceIndex] ?? null;
  const activeTargetId = activeSequenceTarget?.targetId ?? currentStep?.targetId ?? null;

  const progress = React.useMemo(() => {
    if (!currentSegment || !currentStep) return { label: "", percent: 0 };
    if (currentSegment.id === "discover" && currentStep.sequenceTargets?.length) {
      const localStep = sequenceIndex + 1;
      const total = currentStep.sequenceTargets.length;
      return {
        label: t("Step {current} of {total}", { current: localStep, total }),
        percent: Math.max(0, Math.min(100, (localStep / total) * 100)),
      };
    }

    const currentIndex = currentSegment.stepIds.indexOf(currentStep.id);
    const localStep = currentIndex === -1 ? 1 : currentIndex + 1;
    const total = currentSegment.stepIds.length;
    return {
      label: t("Step {current} of {total}", { current: localStep, total }),
      percent: Math.max(0, Math.min(100, (localStep / total) * 100)),
    };
  }, [currentSegment, currentStep, sequenceIndex, t]);

  React.useEffect(() => {
    setSequenceIndex(0);
  }, [currentStep?.id]);

  const getNavBox = React.useCallback(
    (targetId: string): LayoutRectangle | null => {
      const index = NAV_TARGETS.indexOf(targetId as (typeof NAV_TARGETS)[number]);
      if (index < 0) return null;

      const tabWidth = width / NAV_TARGETS.length;
      const tabHeight = 58;
      const pillWidth = Math.min(72, tabWidth - 16);
      const bottom = Math.max(insets.bottom, 8);
      return {
        x: Math.round(tabWidth * index + (tabWidth - pillWidth) / 2),
        y: Math.round(height - bottom - tabHeight - 2),
        width: Math.round(pillWidth),
        height: Math.round(tabHeight),
      };
    },
    [height, insets.bottom, width],
  );

  const getBoxWithTooltip = React.useCallback(
    (rect: LayoutRectangle, source: GuideHighlightBox["source"]): GuideHighlightBox | null => {
      if (rect.width <= 0 || rect.height <= 0) return null;

      const padding = 6;
      const gap = 2;
      const tooltipWidth = Math.min(GUIDE_TOOLTIP_WIDTH, width - 32);
      const tooltipHeight = GUIDE_TOOLTIP_HEIGHT;
      const safeTop = Math.max(insets.top + 8, 8);
      const safeBottom = height - Math.max(insets.bottom + 8, 8);
      const x = clamp(rect.x - padding, 8, width - 16);
      const y = clamp(rect.y - padding, safeTop, height - insets.bottom - 24);
      const boxWidth = Math.min(rect.width + padding * 2, width - x - 8);
      const boxHeight = Math.min(rect.height + padding * 2, height - y - insets.bottom - 8);
      const canPlaceTop = y >= safeTop + tooltipHeight + gap;
      const tooltipPlacement = canPlaceTop ? "top" : "bottom";
      const rawTooltipTop = canPlaceTop ? y - tooltipHeight - gap : y + boxHeight + gap;
      const tooltipTop = clamp(
        rawTooltipTop,
        safeTop,
        Math.max(safeTop, safeBottom - tooltipHeight),
      );
      const tooltipLeft = clamp(x + boxWidth / 2 - tooltipWidth / 2, 12, width - tooltipWidth - 12);

      return {
        x,
        y,
        width: boxWidth,
        height: boxHeight,
        source,
        tooltipTop,
        tooltipLeft,
        tooltipPlacement,
      };
    },
    [height, insets.bottom, insets.top, width],
  );

  const updateHighlightNow = React.useCallback(() => {
    if (!active || !currentStep || !routeMatchesCurrentSegment || !activeTargetId) {
      setHighlightBox((current) => (current === null ? current : null));
      return;
    }

    const navBox = getNavBox(activeTargetId);
    if (navBox) {
      const nextBox = getBoxWithTooltip(navBox, "nav");
      setHighlightBox((current) => (boxesEqual(current, nextBox) ? current : nextBox));
      return;
    }

    const target = targetsRef.current.get(activeTargetId);
    if (!target?.ref.current) {
      setHighlightBox((current) => (current === null ? current : null));
      return;
    }

    target.ref.current.measureInWindow((x, y, targetWidth, targetHeight) => {
      const isVisible =
        targetWidth > 0 &&
        targetHeight > 0 &&
        y + targetHeight > insets.top &&
        y < height - insets.bottom;
      const nextBox = isVisible
        ? getBoxWithTooltip({ x, y, width: targetWidth, height: targetHeight }, "target")
        : null;
      setHighlightBox((current) => (boxesEqual(current, nextBox) ? current : nextBox));
    });
  }, [
    active,
    activeTargetId,
    currentStep,
    getBoxWithTooltip,
    getNavBox,
    height,
    insets.bottom,
    insets.top,
    routeMatchesCurrentSegment,
  ]);

  const requestMeasure = React.useCallback(() => {
    if (measureFrameRef.current !== null) return;
    measureFrameRef.current = requestAnimationFrame(() => {
      measureFrameRef.current = null;
      updateHighlightNow();
    });
  }, [updateHighlightNow]);

  const requestInstantMeasure = React.useCallback(() => {
    if (measureFrameRef.current !== null) {
      cancelAnimationFrame(measureFrameRef.current);
      measureFrameRef.current = null;
    }
    setInstantHighlight(true);
    updateHighlightNow();
    setTimeout(() => setInstantHighlight(false), 120);
  }, [updateHighlightNow]);

  React.useEffect(() => {
    requestMeasure();
    return () => {
      if (measureFrameRef.current !== null) {
        cancelAnimationFrame(measureFrameRef.current);
        measureFrameRef.current = null;
      }
    };
  }, [requestMeasure, width, height, pathname, activeTargetId, sequenceIndex]);

  const registerTarget = React.useCallback(
    (id: string, target: RegisteredTarget) => {
      targetsRef.current.set(id, target);
      requestMeasure();
      return () => {
        const current = targetsRef.current.get(id);
        if (current === target) {
          targetsRef.current.delete(id);
          requestMeasure();
        }
      };
    },
    [requestMeasure],
  );

  const completeStep = React.useCallback(
    (step: number) => {
      if (
        !active ||
        step !== currentStep?.id ||
        step <= completedStep ||
        step > USER_GUIDE_COMPLETE_STEP
      ) {
        return;
      }
      updateGuideStep.mutate(step);
    },
    [active, completedStep, currentStep?.id, updateGuideStep],
  );

  const completeCurrentStep = React.useCallback(() => {
    if (!currentStep || currentStep.actionRequired || currentStep.sequenceTargets) return;
    completeStep(currentStep.id);
  }, [completeStep, currentStep]);

  const skipCurrentStep = React.useCallback(() => {
    if (!currentStep) return;
    completeStep(currentStep.id);
  }, [completeStep, currentStep]);

  const advanceSequence = React.useCallback(() => {
    if (!currentStep?.sequenceTargets?.length) return;

    if (sequenceIndex >= currentStep.sequenceTargets.length - 1) {
      completeStep(currentStep.id);
      return;
    }

    const nextIndex = Math.min(sequenceIndex + 1, currentStep.sequenceTargets.length - 1);
    const nextSequenceTarget = currentStep.sequenceTargets[nextIndex];

    if (nextSequenceTarget?.activateOnNext) {
      targetsRef.current.get(nextSequenceTarget.targetId)?.activate?.();
      requestInstantMeasure();
    }

    setSequenceIndex(nextIndex);
  }, [completeStep, currentStep, requestInstantMeasure, sequenceIndex]);

  const handleTabPress = React.useCallback(
    (name: string) => {
      if (!currentStep) return;
      if (name === "friends" && currentStep.targetId === "nav-friends") {
        completeStep(currentStep.id);
      }
    },
    [completeStep, currentStep],
  );

  const handleFinishGuide = React.useCallback(() => {
    updateGuideStep.mutate(USER_GUIDE_COMPLETE_STEP, {
      onSuccess: () => setConfirmCloseOpen(false),
    });
  }, [updateGuideStep]);

  React.useEffect(() => {
    if (active && progress.label) {
      AccessibilityInfo.announceForAccessibility(progress.label);
    }
  }, [active, progress.label]);

  const contextValue = React.useMemo<UserGuideContextValue>(
    () => ({
      active,
      completedStep,
      currentStep,
      currentSegment,
      completeStep,
      completeCurrentStep,
      handleTabPress,
    }),
    [
      active,
      completedStep,
      completeCurrentStep,
      completeStep,
      currentSegment,
      currentStep,
      handleTabPress,
    ],
  );

  const shouldRenderGuide = active && currentStep && currentSegment && routeMatchesCurrentSegment;
  const tooltipText = translateUserGuideText(
    t,
    activeSequenceTarget?.tooltip ?? currentStep?.tooltip ?? "",
  );
  const activeTargetTooltip = React.useMemo(() => {
    if (!shouldRenderGuide || !highlightBox || highlightBox.source !== "target") return null;
    const target = activeTargetId ? targetsRef.current.get(activeTargetId) : null;
    if (target?.attachedTooltip === false) return null;

    return {
      arrowLeft: clamp(
        highlightBox.x + highlightBox.width / 2 - highlightBox.tooltipLeft - 6,
        18,
        GUIDE_TOOLTIP_WIDTH - 30,
      ),
      hasSequence: Boolean(currentStep.sequenceTargets),
      isLastSequence:
        Boolean(currentStep.sequenceTargets) &&
        sequenceIndex >= (currentStep.sequenceTargets?.length ?? 1) - 1,
      left: highlightBox.tooltipLeft - highlightBox.x - 6,
      onNext: advanceSequence,
      pending: updateGuideStep.isPending,
      placement:
        target?.tooltipPlacementOverride ??
        (target?.portalTooltipAnchor === "footer" ? "top" : highlightBox.tooltipPlacement),
      text: tooltipText,
    };
  }, [
    advanceSequence,
    activeTargetId,
    currentStep,
    highlightBox,
    sequenceIndex,
    shouldRenderGuide,
    tooltipText,
    updateGuideStep.isPending,
  ]);
  const registrationValue = React.useMemo<UserGuideTargetRegistrationValue>(
    () => ({
      activeTargetId: shouldRenderGuide ? activeTargetId : null,
      activeTooltip: activeTargetTooltip,
      registerTarget,
      requestMeasure: requestInstantMeasure,
    }),
    [activeTargetId, activeTargetTooltip, registerTarget, requestInstantMeasure, shouldRenderGuide],
  );

  return (
    <UserGuideContext.Provider value={contextValue}>
      <UserGuideTargetRegistrationContext.Provider value={registrationValue}>
        {children}
        {shouldRenderGuide ? (
          <Portal name="user-guide-overlay">
            <Pressable
              className="absolute inset-0"
              pointerEvents="box-none"
              style={{ zIndex: 9999 }}
            >
              {highlightBox ? (
                <>
                  {highlightBox.source === "nav" ? (
                    <GuideHighlight box={highlightBox} instant={instantHighlight || reduceMotion} />
                  ) : null}
                  {highlightBox.source === "nav" ||
                  targetsRef.current.get(activeTargetId ?? "")?.attachedTooltip === false ? (
                    <GuideTooltip
                      box={highlightBox}
                      text={tooltipText}
                      hasSequence={Boolean(currentStep.sequenceTargets)}
                      footerAnchor={
                        targetsRef.current.get(activeTargetId ?? "")?.portalTooltipAnchor ===
                        "footer"
                      }
                      placementOverride={
                        targetsRef.current.get(activeTargetId ?? "")?.tooltipPlacementOverride
                      }
                      horizontalOffset={
                        targetsRef.current.get(activeTargetId ?? "")?.tooltipHorizontalOffset
                      }
                      verticalOffset={
                        targetsRef.current.get(activeTargetId ?? "")?.tooltipVerticalOffset
                      }
                      isLastSequence={
                        Boolean(currentStep.sequenceTargets) &&
                        sequenceIndex >= (currentStep.sequenceTargets?.length ?? 1) - 1
                      }
                      pending={updateGuideStep.isPending}
                      onNext={advanceSequence}
                    />
                  ) : null}
                </>
              ) : null}
              <GuideCard
                bottomRight={pathname === "/friends" || pathname.startsWith("/wishlists/")}
                lowerCenter={pathname === "/wishlists"}
                segmentTitle={translateUserGuideText(t, currentSegment.title)}
                stepTitle={translateUserGuideText(t, currentStep.title)}
                progressLabel={progress.label}
                progressPercent={progress.percent}
                pending={updateGuideStep.isPending}
                onClose={() => setConfirmCloseOpen(true)}
                onSkip={skipCurrentStep}
              />
            </Pressable>
          </Portal>
        ) : null}
        <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Finish user guide?")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("You can continue using Wishlane without guide steps.")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                <Text>{t("Cancel")}</Text>
              </AlertDialogCancel>
              <AlertDialogAction onPress={handleFinishGuide}>
                <Text>{t("Finish guide")}</Text>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </UserGuideTargetRegistrationContext.Provider>
    </UserGuideContext.Provider>
  );
}

function GuideHighlight({ box, instant }: { box: GuideHighlightBox; instant: boolean }) {
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute rounded-[10px] border-2 border-brand shadow-[0px_0px_24px_rgba(192,38,126,0.32)]"
      style={{
        height: box.height,
        left: box.x,
        opacity: 1,
        top: box.y,
        width: box.width,
      }}
    >
      {!instant ? <PulseOverlay /> : null}
    </Animated.View>
  );
}

function PulseOverlay() {
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withTiming(0.12, { duration: motionDuration.slow });
  }, [opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute -inset-1 rounded-xl bg-brand"
      style={style}
    />
  );
}

function GuideTooltip({
  box,
  footerAnchor = false,
  hasSequence,
  horizontalOffset = 0,
  isLastSequence,
  onNext,
  pending,
  placementOverride,
  text,
  verticalOffset = 0,
}: {
  box: GuideHighlightBox;
  footerAnchor?: boolean;
  hasSequence: boolean;
  horizontalOffset?: number;
  isLastSequence: boolean;
  onNext: () => void;
  pending: boolean;
  placementOverride?: "top" | "bottom";
  text: string;
  verticalOffset?: number;
}) {
  const t = useGT();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const placement = footerAnchor ? "top" : (placementOverride ?? box.tooltipPlacement);
  const tooltipHeight = hasSequence ? GUIDE_TOOLTIP_HEIGHT : GUIDE_TOOLTIP_COMPACT_HEIGHT;
  const tooltipLeft = clamp(
    box.tooltipLeft + horizontalOffset,
    12,
    width - GUIDE_TOOLTIP_WIDTH - 12,
  );
  const safeTop = Math.max(insets.top + 8, 8);
  const safeBottom = height - Math.max(insets.bottom + 8, 8);
  const tooltipTop = placementOverride
    ? clamp(
        (placement === "bottom" ? box.y + box.height + 6 : box.y - tooltipHeight - 6) +
          verticalOffset,
        safeTop,
        Math.max(safeTop, safeBottom - tooltipHeight),
      )
    : box.tooltipTop;
  const arrowLeft = clamp(box.x + box.width / 2 - tooltipLeft - 6, 18, GUIDE_TOOLTIP_WIDTH - 30);
  const arrowClassName =
    placement === "top"
      ? "absolute -bottom-1.25 size-3 rotate-45 border-b border-r border-border bg-card-bg"
      : "absolute -top-1.25 size-3 rotate-45 border-l border-t border-border bg-card-bg";
  const footerTooltipBottom = Math.max(insets.bottom + 88, 96);

  return (
    <Pressable
      className="absolute w-57.5 gap-2 rounded-lg border border-border bg-card-bg px-3 py-2"
      style={
        footerAnchor
          ? { bottom: footerTooltipBottom, left: tooltipLeft, zIndex: 10000 }
          : { left: tooltipLeft, top: tooltipTop, zIndex: 10000 }
      }
    >
      <View pointerEvents="none" className={arrowClassName} style={{ left: arrowLeft }} />
      <Text className="text-xs font-bold leading-4 text-text">{text}</Text>
      {hasSequence ? (
        <Button
          size="sm"
          disabled={pending}
          onPress={onNext}
          className="h-8 self-end rounded-md px-3"
        >
          <Text>{isLastSequence ? t("Done") : t("Next")}</Text>
        </Button>
      ) : null}
    </Pressable>
  );
}

function GuideCard({
  bottomRight,
  lowerCenter,
  onClose,
  onSkip,
  pending,
  progressLabel,
  progressPercent,
  segmentTitle,
  stepTitle,
}: {
  bottomRight: boolean;
  lowerCenter: boolean;
  onClose: () => void;
  onSkip: () => void;
  pending: boolean;
  progressLabel: string;
  progressPercent: number;
  segmentTitle: string;
  stepTitle: string;
}) {
  const t = useGT();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const cardWidth = Math.min(width - 48, bottomRight ? 280 : 300);
  const positionStyle = bottomRight
    ? {
        bottom: Math.max(insets.bottom + 86, 96),
        right: 12,
      }
    : lowerCenter
      ? {
          bottom: Math.max(insets.bottom + 150, 160),
          right: 12,
        }
      : {
          left: (width - cardWidth) / 2,
          top: Math.max(insets.top + 72, height * 0.5 - 88),
        };

  return (
    <Pressable
      className="absolute gap-3 rounded-lg border border-border bg-card-bg p-3 shadow-xl"
      style={{
        elevation: 60,
        ...positionStyle,
        width: cardWidth,
        zIndex: 60,
      }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-xs font-extrabold text-text">{segmentTitle}</Text>
          <Text accessibilityLiveRegion="polite" className="text-xs font-semibold text-text-muted">
            {progressLabel}
          </Text>
        </View>
        <Button
          variant="outline"
          size="icon"
          accessibilityLabel={t("Close user guide")}
          onPress={onClose}
          className="size-8 rounded-md"
        >
          <Icon as={X} className="size-4 text-text" />
        </Button>
      </View>
      <View className="h-1 overflow-hidden rounded-full bg-border-light">
        <View className="h-full rounded-full bg-brand" style={{ width: `${progressPercent}%` }} />
      </View>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="min-w-0 flex-1 text-sm font-bold text-text" numberOfLines={2}>
          {stepTitle}
        </Text>
        <Button variant="secondary" size="sm" disabled={pending} onPress={onSkip}>
          <Text>{t("Skip")}</Text>
        </Button>
      </View>
    </Pressable>
  );
}

export function useUserGuide() {
  return React.useContext(UserGuideContext);
}

export function useUserGuideStepCompletion(step: number) {
  const { completeStep } = useUserGuide();
  return React.useCallback(() => completeStep(step), [completeStep, step]);
}

export function useUserGuideTargetRegistration() {
  return React.useContext(UserGuideTargetRegistrationContext);
}

function translateUserGuideText(t: (message: string) => string, text: string): string {
  switch (text) {
    case "Explore the main menu":
      return t("Explore the main menu");
    case "Main menu":
      return t("Main menu");
    case "Start with Wishlists.":
      return t("Start with Wishlists.");
    case "Wishlists is where your own lists live.":
      return t("Wishlists is where your own lists live.");
    case "The + button creates wishlists, wishes, events, and more.":
      return t("The + button creates wishlists, wishes, events, and more.");
    case "Friends is where invites, requests, and groups live.":
      return t("Friends is where invites, requests, and groups live.");
    case "Profile is where your account and settings live.":
      return t("Profile is where your account and settings live.");
    case "Learn where each main section lives before creating your first wishlist.":
      return t("Learn where each main section lives before creating your first wishlist.");
    case "Start a wishlist":
      return t("Start a wishlist");
    case "Start wishlist":
      return t("Start wishlist");
    case "Tap + and choose New Wishlist.":
      return t("Tap + and choose New Wishlist.");
    case "Tap the + button and choose New Wishlist to start your first wishlist.":
      return t("Tap the + button and choose New Wishlist to start your first wishlist.");
    case "Create the wishlist":
      return t("Create the wishlist");
    case "Create wishlist":
      return t("Create wishlist");
    case "Fill the name, then tap Create wishlist.":
      return t("Fill the name, then tap Create wishlist.");
    case "Create the wishlist to continue to the wishlist detail page.":
      return t("Create the wishlist to continue to the wishlist detail page.");
    case "Open wishlist details":
      return t("Open wishlist details");
    case "Open details":
      return t("Open details");
    case "Tap your wishlist card to open its details.":
      return t("Tap your wishlist card to open its details.");
    case "Open the wishlist detail page to continue adding items.":
      return t("Open the wishlist detail page to continue adding items.");
    case "Add a gift idea":
      return t("Add a gift idea");
    case "Add item":
      return t("Add item");
    case "Tap + and choose New Wish.":
      return t("Tap + and choose New Wish.");
    case "Tap the + button and choose New Wish to add a product or gift idea.":
      return t("Tap the + button and choose New Wish to add a product or gift idea.");
    case "Create the item":
      return t("Create the item");
    case "Create item":
      return t("Create item");
    case "Fill the item name, then tap Create item.":
      return t("Fill the item name, then tap Create item.");
    case "Create the item and return to the wishlist item grid.":
      return t("Create the item and return to the wishlist item grid.");
    case "Share the wishlist":
      return t("Share the wishlist");
    case "Share":
      return t("Share");
    case "Tap Share to copy a share link.":
      return t("Tap Share to copy a share link.");
    case "Create a link friends can open to view and reserve items.":
      return t("Create a link friends can open to view and reserve items.");
    case "Manage sharing access":
      return t("Manage sharing access");
    case "Manage access":
      return t("Manage access");
    case "Open access settings for this wishlist.":
      return t("Open access settings for this wishlist.");
    case "Grant or revoke access for specific friends and groups.":
      return t("Grant or revoke access for specific friends and groups.");
    case "Open Friends":
      return t("Open Friends");
    case "Tap Friends in the tab bar.":
      return t("Tap Friends in the tab bar.");
    case "Open Friends directly from the wishlist detail page.":
      return t("Open Friends directly from the wishlist detail page.");
    case "Invite a friend":
      return t("Invite a friend");
    case "Add friend":
      return t("Add friend");
    case "Tap + and choose Invite Friend.":
      return t("Tap + and choose Invite Friend.");
    case "Tap the + button and choose Invite Friend to add someone.":
      return t("Tap the + button and choose Invite Friend to add someone.");
    case "Open friend groups":
      return t("Open friend groups");
    case "Friends and groups":
      return t("Friends and groups");
    case "Start with Friends.":
      return t("Start with Friends.");
    case "Friends shows everyone already connected with you.":
      return t("Friends shows everyone already connected with you.");
    case "Groups helps you organize friends for sharing.":
      return t("Groups helps you organize friends for sharing.");
    case "Move from the friends list to the groups tab.":
      return t("Move from the friends list to the groups tab.");
    case "Create a group":
      return t("Create a group");
    case "Create group":
      return t("Create group");
    case "Tap +, choose Friend Group, fill the name, then tap Save.":
      return t("Tap +, choose Friend Group, fill the name, then tap Save.");
    case "Create the group and return to the groups list.":
      return t("Create the group and return to the groups list.");
    case "Review friend requests":
      return t("Review friend requests");
    case "Requests and sent":
      return t("Requests and sent");
    case "Start with Requests.":
      return t("Start with Requests.");
    case "Requests shows people who want to connect with you.":
      return t("Requests shows people who want to connect with you.");
    case "Sent shows invitations you already sent. Next, head to Wishlists.":
      return t("Sent shows invitations you already sent. Next, head to Wishlists.");
    case "Learn where incoming and outgoing friend requests live.":
      return t("Learn where incoming and outgoing friend requests live.");
    case "Open Discover":
      return t("Open Discover");
    case "Tap Discover to explore friends' gifts.":
      return t("Tap Discover to explore friends' gifts.");
    case "Open Discover from the Wishlists page.":
      return t("Open Discover from the Wishlists page.");
    case "Explore Discover tabs":
      return t("Explore Discover tabs");
    case "Discover tabs":
      return t("Discover tabs");
    case "Wishlists shows every shared wishlist.":
      return t("Wishlists shows every shared wishlist.");
    case "Available shows gifts that can still be reserved.":
      return t("Available shows gifts that can still be reserved.");
    case "Reserved shows gifts already claimed.":
      return t("Reserved shows gifts already claimed.");
    case "Purchased shows gifts marked as bought.":
      return t("Purchased shows gifts marked as bought.");
    case "Learn what each Discover tab means and how it helps avoid duplicate gifts.":
      return t("Learn what each Discover tab means and how it helps avoid duplicate gifts.");
    case "Wishlists":
      return t("Wishlists");
    case "Wishlist":
      return t("Wishlist");
    case "Friends":
      return t("Friends");
    case "Discover":
      return t("Discover");
    default:
      return text;
  }
}
