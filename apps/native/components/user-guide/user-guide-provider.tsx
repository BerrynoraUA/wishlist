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
import { GuidePulseBorder } from "@/components/user-guide/guide-pulse-border";
import { useProfile, useUpdateUserGuideStep } from "@/hooks/use-settings";
import { PREFERENCE_KEYS, preferencesStorage } from "@/lib/storage";
import { NAV_TAB_BAR_HEIGHT } from "@/lib/layout";
import { useCreateButtonCenter } from "@/lib/create-button-box";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  USER_GUIDE_COMPLETE_STEP,
  USER_GUIDE_STEP_IDS,
  getUserGuideSegmentForStep,
  getUserGuideSegments,
  getNextUserGuideStep,
  getUserGuideSteps,
  matchesUserGuideRoute,
  type UserGuideSegment,
  type UserGuideStep,
} from "./user-guide-config";

type RegisteredTarget = {
  attachedTooltip?: boolean;
  portalHighlight?: boolean;
  portalTooltipAnchor?: "target" | "footer";
  ref: React.RefObject<RNView | null>;
  tooltipHorizontalOffset?: number;
  tooltipPlacementOverride?: "top" | "bottom";
  tooltipVerticalOffset?: number;
  activate?: () => void;
};

type GuideHighlightBox = LayoutRectangle & {
  source: "nav" | "target";
  targetId: string;
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
  setGuideSurface: (surface: GuideSurface | null) => void;
};

type GuideSurface = {
  stepId: number;
  targetId: string | null;
  mode: "menu" | "sheet" | "hidden";
};

type ActiveGuideTooltip = {
  arrowLeft: number;
  hasSequence: boolean;
  isLastSequence: boolean;
  left: number;
  onNext: () => void;
  pending: boolean;
  placement: "top" | "bottom";
  text: string;
};

type UserGuideTargetRegistrationValue = {
  activeTargetId: string | null;
  registerTarget: (id: string, target: RegisteredTarget) => () => void;
  /** Frame-coalesced. Safe to call from high-frequency events such as `onScroll`. */
  requestMeasure: () => void;
  /** Measures immediately after the active target changes layout. */
  requestInstantMeasure: () => void;
};

const UserGuideContext = React.createContext<UserGuideContextValue>({
  active: false,
  completedStep: 0,
  currentStep: null,
  currentSegment: null,
  completeStep: () => {},
  completeCurrentStep: () => {},
  handleTabPress: () => {},
  setGuideSurface: () => {},
});

const UserGuideTargetRegistrationContext = React.createContext<UserGuideTargetRegistrationValue>({
  activeTargetId: null,
  registerTarget: () => () => {},
  requestMeasure: () => {},
  requestInstantMeasure: () => {},
});
const UserGuideActiveTooltipContext = React.createContext<ActiveGuideTooltip | null>(null);

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
    a.targetId === b.targetId &&
    a.tooltipPlacement === b.tooltipPlacement
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * Skips the guide machinery outright for users who already finished it — no profile
 * query, no translated step config, no measuring, no overlay. Both contexts default to
 * inert values, so everything downstream keeps working without a provider.
 *
 * The decision is latched at mount and deliberately never re-read. Flipping it later
 * would swap the element type rendered here and remount the entire app below it, which
 * costs far more than the guide ever does. Mounting inside the per-account subtree in
 * `app/_layout.tsx` means each account gets a fresh, correct decision.
 */
export function UserGuideProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [skip] = React.useState(
    () =>
      Boolean(userId) &&
      preferencesStorage.getBoolean(PREFERENCE_KEYS.userGuideCompleted(userId!)) === true,
  );

  if (skip) return <>{children}</>;

  return <ActiveUserGuideProvider>{children}</ActiveUserGuideProvider>;
}

function ActiveUserGuideProvider({ children }: { children: React.ReactNode }) {
  const t = useGT();
  const pathname = usePathname();
  const { user } = useAuth();
  const profileQuery = useProfile();
  const updateGuideStep = useUpdateUserGuideStep();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const createButton = useCreateButtonCenter();
  const targetsRef = React.useRef(new Map<string, RegisteredTarget>());
  const measureFrameRef = React.useRef<number | null>(null);
  const measureGenerationRef = React.useRef(0);
  const lastScrollMeasureRef = React.useRef(0);
  const [highlightBox, setHighlightBox] = React.useState<GuideHighlightBox | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);
  const [sequenceIndex, setSequenceIndex] = React.useState(0);
  const [guideSurface, setGuideSurfaceState] = React.useState<GuideSurface | null>(null);
  const setGuideSurface = React.useCallback((surface: GuideSurface | null) => {
    setGuideSurfaceState((current) =>
      current?.stepId === surface?.stepId &&
      current?.targetId === surface?.targetId &&
      current?.mode === surface?.mode
        ? current
        : surface,
    );
  }, []);
  const guideSteps = React.useMemo(() => getUserGuideSteps(t), [t]);
  const guideSegments = React.useMemo(() => getUserGuideSegments(t), [t]);

  const completedStep = normalizeCompletedStep(profileQuery.data?.userGuideStep);
  const active = Boolean(user?.id && profileQuery.data) && completedStep < USER_GUIDE_COMPLETE_STEP;
  const currentStep = active ? (getNextUserGuideStep(guideSteps, completedStep) ?? null) : null;
  const currentSegment = currentStep
    ? (getUserGuideSegmentForStep(guideSegments, currentStep.id) ?? null)
    : null;
  const routeMatchesCurrentSegment = Boolean(
    currentSegment && matchesUserGuideRoute(pathname, currentSegment.route),
  );
  const activeSequenceTarget = currentStep?.sequenceTargets?.[sequenceIndex] ?? null;
  const currentSurface = guideSurface?.stepId === currentStep?.id ? guideSurface : null;
  const activeTargetId =
    currentSurface?.mode === "hidden"
      ? null
      : (currentSurface?.targetId ??
        activeSequenceTarget?.targetId ??
        currentStep?.targetId ??
        null);
  const hasSequence =
    Boolean(currentStep?.sequenceTargets) && !activeSequenceTarget?.actionRequired;
  // There is nothing to follow once the guide is done, which is the state almost every
  // session is in. Measuring is driven by onScroll/onLayout across the app, so without
  // this the whole tree keeps paying for a guide that will never show.
  const trackingHighlight = Boolean(
    active &&
    currentStep &&
    routeMatchesCurrentSegment &&
    activeTargetId &&
    currentSurface?.mode !== "menu",
  );

  // Mirror completion on-device so the next launch can skip this provider entirely.
  const userId = user?.id;
  React.useEffect(() => {
    if (!userId || !profileQuery.data) return;
    if (completedStep < USER_GUIDE_COMPLETE_STEP) return;
    preferencesStorage.set(PREFERENCE_KEYS.userGuideCompleted(userId), true);
  }, [completedStep, profileQuery.data, userId]);

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
      if (process.env.EXPO_OS === "android") return null;
      const index = NAV_TARGETS.indexOf(targetId as (typeof NAV_TARGETS)[number]);
      if (index < 0) return null;

      if (targetId === "nav-create") {
        return {
          x: createButton.x - createButton.radius,
          y: createButton.y - createButton.radius,
          width: createButton.radius * 2,
          height: createButton.radius * 2,
        };
      }

      const tabWidth = width / NAV_TARGETS.length;
      const tabHeight = NAV_TAB_BAR_HEIGHT;
      const pillWidth = Math.min(72, tabWidth - 16);
      const bottom = Math.max(insets.bottom, 8);
      return {
        x: Math.round(tabWidth * index + (tabWidth - pillWidth) / 2),
        y: Math.round(height - bottom - tabHeight - 2),
        width: Math.round(pillWidth),
        height: Math.round(tabHeight),
      };
    },
    [createButton.x, createButton.y, createButton.radius, height, insets.bottom, width],
  );

  const getBoxWithTooltip = React.useCallback(
    (
      rect: LayoutRectangle,
      source: GuideHighlightBox["source"],
      targetId: string,
    ): GuideHighlightBox | null => {
      if (rect.width <= 0 || rect.height <= 0) return null;

      const gap = 8;
      const tooltipWidth = Math.min(GUIDE_TOOLTIP_WIDTH, width - 32);
      const tooltipHeight = hasSequence ? GUIDE_TOOLTIP_HEIGHT : GUIDE_TOOLTIP_COMPACT_HEIGHT;
      const safeTop = Math.max(insets.top + 8, 8);
      const safeBottom = height - Math.max(insets.bottom + 8, 8);
      const x = rect.x;
      const y = rect.y;
      const boxWidth = rect.width;
      const boxHeight = rect.height;
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
        targetId,
        tooltipTop,
        tooltipLeft,
        tooltipPlacement,
      };
    },
    [hasSequence, height, insets.bottom, insets.top, width],
  );

  const updateHighlightNow = React.useCallback(() => {
    const generation = ++measureGenerationRef.current;
    if (!trackingHighlight || !activeTargetId) {
      setHighlightBox((current) => (current === null ? current : null));
      return;
    }

    const target = targetsRef.current.get(activeTargetId);
    if (target?.ref.current) {
      target.ref.current.measureInWindow((x, y, targetWidth, targetHeight) => {
        if (generation !== measureGenerationRef.current) return;
        const isVisible =
          targetWidth > 0 &&
          targetHeight > 0 &&
          y + targetHeight > insets.top &&
          y < height - insets.bottom;
        const nextBox = isVisible
          ? getBoxWithTooltip(
              { x, y, width: targetWidth, height: targetHeight },
              "target",
              activeTargetId,
            )
          : null;
        setHighlightBox((current) => (boxesEqual(current, nextBox) ? current : nextBox));
      });
      return;
    }

    const navBox = getNavBox(activeTargetId);
    if (!navBox) {
      setHighlightBox((current) => (current === null ? current : null));
      return;
    }

    const nextBox = getBoxWithTooltip(navBox, "nav", activeTargetId);
    setHighlightBox((current) => (boxesEqual(current, nextBox) ? current : nextBox));
  }, [
    activeTargetId,
    getBoxWithTooltip,
    getNavBox,
    height,
    insets.bottom,
    insets.top,
    trackingHighlight,
  ]);

  const scheduleMeasure = React.useCallback(() => {
    if (!trackingHighlight) return;
    if (measureFrameRef.current !== null) return;
    measureFrameRef.current = requestAnimationFrame(() => {
      measureFrameRef.current = null;
      updateHighlightNow();
    });
  }, [trackingHighlight, updateHighlightNow]);

  const requestMeasure = React.useCallback(() => {
    if (!trackingHighlight) return;
    const now = Date.now();
    if (now - lastScrollMeasureRef.current < 50) return;
    lastScrollMeasureRef.current = now;
    scheduleMeasure();
  }, [scheduleMeasure, trackingHighlight]);

  const requestInstantMeasure = React.useCallback(() => {
    if (!trackingHighlight) return;
    if (measureFrameRef.current !== null) {
      cancelAnimationFrame(measureFrameRef.current);
      measureFrameRef.current = null;
    }
    updateHighlightNow();
  }, [trackingHighlight, updateHighlightNow]);

  // Drop the previous step's box as soon as tracking stops.
  React.useEffect(() => {
    if (trackingHighlight) return;
    setHighlightBox((current) => (current === null ? current : null));
  }, [trackingHighlight]);

  React.useEffect(() => {
    scheduleMeasure();
    return () => {
      if (measureFrameRef.current !== null) {
        cancelAnimationFrame(measureFrameRef.current);
        measureFrameRef.current = null;
      }
    };
  }, [scheduleMeasure, width, height, pathname, activeTargetId, sequenceIndex]);

  const registerTarget = React.useCallback(
    (id: string, target: RegisteredTarget) => {
      targetsRef.current.set(id, target);
      if (id === activeTargetId) scheduleMeasure();
      return () => {
        const current = targetsRef.current.get(id);
        if (current === target) {
          targetsRef.current.delete(id);
          if (id === activeTargetId) scheduleMeasure();
        }
      };
    },
    [activeTargetId, scheduleMeasure],
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
    // `mutate` is stable; depending on the whole mutation object would rebuild this
    // callback on every render, and it reaches list `renderItem`s through the context.
    [active, completedStep, currentStep?.id, updateGuideStep.mutate],
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
      if (currentStep.sequenceTargets[sequenceIndex]?.actionRequired) return;
      completeStep(currentStep.id);
      return;
    }

    const nextIndex = Math.min(sequenceIndex + 1, currentStep.sequenceTargets.length - 1);
    const nextSequenceTarget = currentStep.sequenceTargets[nextIndex];

    if (nextSequenceTarget?.activateOnNext) {
      targetsRef.current.get(nextSequenceTarget.targetId)?.activate?.();
    }

    setSequenceIndex(nextIndex);
  }, [completeStep, currentStep, sequenceIndex]);

  const handleTabPress = React.useCallback(
    (name: string) => {
      if (!currentStep) return;
      if (name === "friends" && currentStep.targetId === "nav-friends") {
        completeStep(currentStep.id);
      } else if (
        name === "wishlists" &&
        currentStep.id === USER_GUIDE_STEP_IDS.reviewFriendRequests &&
        activeSequenceTarget?.targetId === "nav-wishlists"
      ) {
        completeStep(currentStep.id);
      }
    },
    [activeSequenceTarget?.targetId, completeStep, currentStep],
  );

  const handleFinishGuide = React.useCallback(() => {
    updateGuideStep.mutate(USER_GUIDE_COMPLETE_STEP, {
      onSuccess: () => setConfirmCloseOpen(false),
    });
  }, [updateGuideStep.mutate]);

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
      setGuideSurface,
    }),
    [
      active,
      completedStep,
      completeCurrentStep,
      completeStep,
      currentSegment,
      currentStep,
      handleTabPress,
      setGuideSurface,
    ],
  );

  const shouldRenderGuide = active && currentStep && currentSegment && routeMatchesCurrentSegment;
  const visibleBox = highlightBox?.targetId === activeTargetId ? highlightBox : null;
  const tooltipText =
    !currentSurface && currentStep?.id === USER_GUIDE_STEP_IDS.createWishlist
      ? t("Tap + and choose New Wishlist.")
      : !currentSurface && currentStep?.id === USER_GUIDE_STEP_IDS.createItem
        ? t("Tap + and choose New Wish.")
        : (activeSequenceTarget?.tooltip ?? currentStep?.tooltip ?? "");
  const activeTargetTooltip = React.useMemo(() => {
    if (!shouldRenderGuide || !visibleBox || visibleBox.source !== "target") return null;
    const target = activeTargetId ? targetsRef.current.get(activeTargetId) : null;
    if (target?.attachedTooltip === false) return null;

    return {
      arrowLeft: clamp(
        visibleBox.x + visibleBox.width / 2 - visibleBox.tooltipLeft - 6,
        18,
        GUIDE_TOOLTIP_WIDTH - 30,
      ),
      hasSequence,
      isLastSequence:
        Boolean(currentStep.sequenceTargets) &&
        sequenceIndex >= (currentStep.sequenceTargets?.length ?? 1) - 1,
      left: visibleBox.tooltipLeft - visibleBox.x,
      onNext: advanceSequence,
      pending: updateGuideStep.isPending,
      placement:
        target?.tooltipPlacementOverride ??
        (target?.portalTooltipAnchor === "footer" ? "top" : visibleBox.tooltipPlacement),
      text: tooltipText,
    };
  }, [
    advanceSequence,
    activeTargetId,
    currentStep,
    hasSequence,
    visibleBox,
    sequenceIndex,
    shouldRenderGuide,
    tooltipText,
    updateGuideStep.isPending,
  ]);
  const registrationValue = React.useMemo<UserGuideTargetRegistrationValue>(
    () => ({
      activeTargetId: shouldRenderGuide ? activeTargetId : null,
      registerTarget,
      requestMeasure,
      requestInstantMeasure,
    }),
    [activeTargetId, registerTarget, requestInstantMeasure, requestMeasure, shouldRenderGuide],
  );

  return (
    <UserGuideContext.Provider value={contextValue}>
      <UserGuideTargetRegistrationContext.Provider value={registrationValue}>
        <UserGuideActiveTooltipContext.Provider value={activeTargetTooltip}>
          {children}
        </UserGuideActiveTooltipContext.Provider>
        {shouldRenderGuide ? (
          <Portal name="user-guide-overlay">
            {currentSurface?.mode !== "menu" && currentSurface?.mode !== "hidden" ? (
              <Pressable
                className="absolute inset-0"
                pointerEvents="box-none"
                style={{ zIndex: 9999 }}
              >
                {visibleBox ? (
                  <>
                    {visibleBox.source === "nav" ||
                    targetsRef.current.get(activeTargetId ?? "")?.portalHighlight ? (
                      <GuideHighlight box={visibleBox} />
                    ) : null}
                    {visibleBox.source === "nav" ||
                    targetsRef.current.get(activeTargetId ?? "")?.attachedTooltip === false ? (
                      <GuideTooltip
                        box={visibleBox}
                        text={tooltipText}
                        hasSequence={hasSequence}
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
                {currentSurface?.mode !== "sheet" ? (
                  <GuideCard
                    bottomRight={
                      !activeTargetId?.startsWith("nav-") &&
                      (pathname === "/friends" || pathname.startsWith("/wishlists/"))
                    }
                    lowerCenter={
                      pathname === "/wishlists" || Boolean(activeTargetId?.startsWith("nav-"))
                    }
                    segmentTitle={currentSegment.title}
                    stepTitle={currentStep.title}
                    progressLabel={progress.label}
                    progressPercent={progress.percent}
                    pending={updateGuideStep.isPending}
                    onClose={() => setConfirmCloseOpen(true)}
                    onSkip={skipCurrentStep}
                  />
                ) : null}
              </Pressable>
            ) : null}
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

function GuideHighlight({ box }: { box: GuideHighlightBox }) {
  return (
    <View
      pointerEvents="none"
      className="absolute"
      style={{
        height: box.height,
        left: box.x,
        top: box.y,
        width: box.width,
      }}
    >
      <GuidePulseBorder borderRadius={999} />
    </View>
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
      ? "absolute -bottom-1.25 size-3 rotate-45 border-b border-e border-border bg-card-bg"
      : "absolute -top-1.25 size-3 rotate-45 border-s border-t border-border bg-card-bg";
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
          bottom: Math.max(insets.bottom + 180, 190),
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

export function useUserGuideActiveTooltip() {
  return React.useContext(UserGuideActiveTooltipContext);
}
