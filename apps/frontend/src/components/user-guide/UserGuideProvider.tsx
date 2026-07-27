"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { useProfile, useUpdateUserGuideStep } from "@/hooks/use-settings";
import {
  USER_GUIDE_COMPLETE_STEP,
  USER_GUIDE_LAST_WISHLIST_PATH_KEY,
  USER_GUIDE_SEGMENTS,
  getUserGuideSegmentForStep,
  getUserGuideStep,
  matchesUserGuideRoute,
  type UserGuideRoute,
  type UserGuideSegment,
  type UserGuideStep,
} from "./user-guide-config";
import styles from "./UserGuideProvider.module.scss";

type UserGuideContextValue = {
  active: boolean;
  completedStep: number;
  currentStep: UserGuideStep | null;
  currentSegment: UserGuideSegment | null;
  canNavigateTo: (href: string) => boolean;
  completeStep: (step: number) => void;
  completeCurrentStep: () => void;
};

type GuideHighlightBox = {
  top: number;
  left: number;
  width: number;
  height: number;
  tooltipTop: number;
  tooltipLeft: number;
  tooltipPlacement: "top" | "bottom";
};

// Temporarily disabled on web. Flip to true to re-enable the user guide.

const USER_GUIDE_ENABLED = false;

const UserGuideContext = createContext<UserGuideContextValue>({
  active: false,
  completedStep: 0,
  currentStep: null,
  currentSegment: null,
  canNavigateTo: () => true,
  completeStep: () => {},
  completeCurrentStep: () => {},
});

function normalizeCompletedStep(step: number | null | undefined): number {
  if (!Number.isFinite(step)) return 0;
  return Math.max(0, Math.min(USER_GUIDE_COMPLETE_STEP, Number(step)));
}

function hrefToPathname(href: string): string {
  try {
    return new URL(href, "https://wishlane.local").pathname;
  } catch {
    return href.split("?")[0] || href;
  }
}

function getGuideTarget(step: UserGuideStep): HTMLElement | null {
  const menuTarget = step.menuTargetId
    ? document.querySelector<HTMLElement>(`[data-guide-target="${step.menuTargetId}"]`)
    : null;
  if (menuTarget) return menuTarget;

  return document.querySelector<HTMLElement>(`[data-guide-target="${step.targetId}"]`);
}

function getGuideTargetById(targetId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-guide-target="${targetId}"]`);
}

function getTopModalContent(): HTMLElement | null {
  const modals = document.querySelectorAll<HTMLElement>("[data-ui-modal-content]");
  return modals[modals.length - 1] ?? null;
}

function getHighlightBox(element: HTMLElement): GuideHighlightBox {
  const rect = element.getBoundingClientRect();
  const padding = 6;
  const gap = 10;
  const tooltipWidth = 220;
  const tooltipHeight = 74;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const top = Math.max(8, rect.top - padding);
  const left = Math.max(8, rect.left - padding);
  const width = Math.min(viewportWidth - left - 8, rect.width + padding * 2);
  const height = Math.min(viewportHeight - top - 8, rect.height + padding * 2);
  const canPlaceTop = top >= tooltipHeight + gap + 8;
  const tooltipPlacement = canPlaceTop ? "top" : "bottom";
  const rawTooltipTop = canPlaceTop ? top - tooltipHeight - gap : top + height + gap;
  const tooltipTop = Math.max(8, Math.min(rawTooltipTop, viewportHeight - tooltipHeight - 8));
  const targetCenter = left + width / 2;
  const tooltipLeft = Math.max(
    8,
    Math.min(targetCenter - tooltipWidth / 2, viewportWidth - tooltipWidth - 8),
  );

  return {
    top,
    left,
    width,
    height,
    tooltipTop,
    tooltipLeft,
    tooltipPlacement,
  };
}

function isElementVisibleForGuide(element: HTMLElement): boolean {
  const topModalContent = getTopModalContent();
  if (topModalContent && !topModalContent.contains(element)) return false;

  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const isInViewport =
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= viewportHeight &&
    rect.right <= viewportWidth;

  if (!isInViewport) return false;

  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    const clipsContent = /(auto|scroll|hidden|clip)/.test(
      `${style.overflow}${style.overflowX}${style.overflowY}`,
    );

    if (clipsContent) {
      const parentRect = parent.getBoundingClientRect();
      const isInsideParent =
        rect.top >= parentRect.top &&
        rect.left >= parentRect.left &&
        rect.bottom <= parentRect.bottom &&
        rect.right <= parentRect.right;

      if (!isInsideParent) return false;
    }

    parent = parent.parentElement;
  }

  return true;
}

function boxesEqual(a: GuideHighlightBox | null, b: GuideHighlightBox | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    Math.round(a.top) === Math.round(b.top) &&
    Math.round(a.left) === Math.round(b.left) &&
    Math.round(a.width) === Math.round(b.width) &&
    Math.round(a.height) === Math.round(b.height) &&
    Math.round(a.tooltipTop) === Math.round(b.tooltipTop) &&
    Math.round(a.tooltipLeft) === Math.round(b.tooltipLeft) &&
    a.tooltipPlacement === b.tooltipPlacement
  );
}

export function UserGuideProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shouldLoadGuide =
    USER_GUIDE_ENABLED && pathname !== "/" && pathname !== "/login" && pathname !== "/register";
  const { data: profile } = useProfile({ enabled: shouldLoadGuide });
  const updateGuideStep = useUpdateUserGuideStep();
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [highlightBox, setHighlightBox] = useState<GuideHighlightBox | null>(null);
  const [highlightInstant, setHighlightInstant] = useState(false);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const currentStepRef = useRef<UserGuideStep | null>(null);
  const highlightFrameRef = useRef<number | null>(null);
  const highlightScrollTimerRef = useRef<number | null>(null);

  const completedStep = normalizeCompletedStep(profile?.userGuideStep);
  const active = USER_GUIDE_ENABLED && Boolean(profile) && completedStep < USER_GUIDE_COMPLETE_STEP;
  const currentStep = active ? (getUserGuideStep(completedStep + 1) ?? null) : null;
  const currentSegment = currentStep ? (getUserGuideSegmentForStep(currentStep.id) ?? null) : null;
  const routeMatchesCurrentSegment = Boolean(
    currentSegment && matchesUserGuideRoute(pathname, currentSegment.route),
  );

  currentStepRef.current =
    active && currentStep && currentSegment && routeMatchesCurrentSegment ? currentStep : null;

  const activeSequenceTarget = currentStep?.sequenceTargets?.[sequenceIndex] ?? null;

  useEffect(() => {
    if (pathname.startsWith("/wishlist/")) {
      window.sessionStorage.setItem(USER_GUIDE_LAST_WISHLIST_PATH_KEY, pathname);
    }
  }, [pathname]);

  const completeStep = useCallback(
    (step: number) => {
      if (!active || step <= completedStep || step > USER_GUIDE_COMPLETE_STEP) return;
      updateGuideStep.mutate(step);
    },
    [active, completedStep, updateGuideStep],
  );

  const completeCurrentStep = useCallback(() => {
    if (!currentStep || currentStep.actionRequired || currentStep.sequenceTargets) return;
    completeStep(currentStep.id);
  }, [completeStep, currentStep]);

  const skipCurrentStep = useCallback(() => {
    if (!currentStep) return;
    completeStep(currentStep.id);
  }, [completeStep, currentStep]);

  useEffect(() => {
    setSequenceIndex(0);
  }, [currentStep?.id]);

  const advanceSequence = useCallback(() => {
    if (!currentStep?.sequenceTargets?.length) return;

    const sequenceTarget = currentStep.sequenceTargets[sequenceIndex];
    if (sequenceTarget?.activateOnNext) {
      getGuideTargetById(sequenceTarget.targetId)?.click();
    }

    if (sequenceIndex >= currentStep.sequenceTargets.length - 1) {
      completeStep(currentStep.id);
      return;
    }

    setSequenceIndex((value) => Math.min(value + 1, currentStep.sequenceTargets!.length - 1));
  }, [completeStep, currentStep, sequenceIndex]);

  const canNavigateTo = useCallback(() => true, []);

  const handleFinishGuide = useCallback(() => {
    updateGuideStep.mutate(USER_GUIDE_COMPLETE_STEP, {
      onSuccess: () => setConfirmCloseOpen(false),
    });
  }, [updateGuideStep]);

  const pageProgress = useMemo(() => {
    if (!currentSegment || !currentStep) {
      return {
        label: "",
        percent: 0,
      };
    }

    const currentIndex = currentSegment.stepIds.indexOf(currentStep.id);
    const localStep = currentIndex === -1 ? 1 : currentIndex + 1;
    const total = currentSegment.stepIds.length;

    return {
      label: `Step ${localStep} of ${total}`,
      percent: Math.max(0, Math.min(100, (localStep / total) * 100)),
    };
  }, [currentSegment, currentStep]);

  useEffect(() => {
    function commitHighlight(nextBox: GuideHighlightBox | null) {
      setHighlightBox((currentBox) => (boxesEqual(currentBox, nextBox) ? currentBox : nextBox));
    }

    function updateHighlightNow() {
      const step = currentStepRef.current;
      if (!step || typeof window === "undefined") {
        commitHighlight(null);
        return;
      }

      const sequenceTarget = step.sequenceTargets?.[sequenceIndex] ?? null;
      const target = sequenceTarget
        ? getGuideTargetById(sequenceTarget.targetId)
        : getGuideTarget(step);
      commitHighlight(target && isElementVisibleForGuide(target) ? getHighlightBox(target) : null);
    }

    function updateHighlight() {
      if (highlightFrameRef.current !== null) return;
      highlightFrameRef.current = window.requestAnimationFrame(() => {
        highlightFrameRef.current = null;
        updateHighlightNow();
      });
    }

    function updateHighlightAfterScroll() {
      if (highlightFrameRef.current !== null) {
        window.cancelAnimationFrame(highlightFrameRef.current);
        highlightFrameRef.current = null;
      }

      setHighlightInstant(true);
      updateHighlightNow();

      if (highlightScrollTimerRef.current !== null) {
        window.clearTimeout(highlightScrollTimerRef.current);
      }

      highlightScrollTimerRef.current = window.setTimeout(() => {
        highlightScrollTimerRef.current = null;
        setHighlightInstant(false);
      }, 120);
    }

    updateHighlightNow();

    if (!currentStepRef.current) return;

    const observer = new MutationObserver(updateHighlight);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", updateHighlight);
    document.addEventListener("scroll", updateHighlightAfterScroll, true);

    return () => {
      if (highlightFrameRef.current !== null) {
        window.cancelAnimationFrame(highlightFrameRef.current);
        highlightFrameRef.current = null;
      }
      if (highlightScrollTimerRef.current !== null) {
        window.clearTimeout(highlightScrollTimerRef.current);
        highlightScrollTimerRef.current = null;
      }
      observer.disconnect();
      window.removeEventListener("resize", updateHighlight);
      document.removeEventListener("scroll", updateHighlightAfterScroll, true);
    };
  }, [active, currentSegment, currentStep, routeMatchesCurrentSegment, sequenceIndex]);

  const value = useMemo<UserGuideContextValue>(
    () => ({
      active,
      completedStep,
      currentStep,
      currentSegment,
      canNavigateTo,
      completeStep,
      completeCurrentStep,
    }),
    [
      active,
      completedStep,
      currentStep,
      currentSegment,
      canNavigateTo,
      completeStep,
      completeCurrentStep,
    ],
  );

  return (
    <UserGuideContext.Provider value={value}>
      {children}
      {active && currentStep && currentSegment && routeMatchesCurrentSegment && (
        <>
          {highlightBox && (
            <>
              <div
                className={`${styles.highlight} ${highlightInstant ? styles.instant : ""}`}
                style={{
                  top: highlightBox.top,
                  left: highlightBox.left,
                  width: highlightBox.width,
                  height: highlightBox.height,
                }}
                aria-hidden="true"
              />
              <div
                className={`${styles.tooltip} ${styles[highlightBox.tooltipPlacement]} ${highlightInstant ? styles.instant : ""}`}
                style={{
                  top: highlightBox.tooltipTop,
                  left: highlightBox.tooltipLeft,
                }}
                role="tooltip"
              >
                <span>{activeSequenceTarget?.tooltip ?? currentStep.tooltip}</span>
                {currentStep.sequenceTargets && (
                  <button
                    type="button"
                    className={styles.tooltipButton}
                    onClick={advanceSequence}
                    disabled={updateGuideStep.isPending}
                  >
                    {sequenceIndex >= currentStep.sequenceTargets.length - 1 ? "Done" : "Next"}
                  </button>
                )}
              </div>
            </>
          )}

          <aside className={styles.card} aria-live="polite">
            <div className={styles.header}>
              <div>
                <span className={styles.section}>{currentSegment.title}</span>
                <span className={styles.progressLabel}>{pageProgress.label}</span>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setConfirmCloseOpen(true)}
                aria-label="Close user guide"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.track} aria-hidden="true">
              <div className={styles.fill} style={{ width: `${pageProgress.percent}%` }} />
            </div>

            <div className={styles.footer}>
              <Button
                size="sm"
                variant="secondary"
                onClick={skipCurrentStep}
                disabled={updateGuideStep.isPending}
              >
                Skip
              </Button>
            </div>
          </aside>
        </>
      )}

      <Modal open={confirmCloseOpen} onClose={() => setConfirmCloseOpen(false)}>
        <div className={styles.confirm}>
          <h2>Finish user guide?</h2>
          <p>
            Are you sure you want to finish the user guide? You can continue using Wishlane without
            guide steps.
          </p>
          <div className={styles.confirmActions}>
            <Button variant="secondary" onClick={() => setConfirmCloseOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFinishGuide} disabled={updateGuideStep.isPending}>
              Finish guide
            </Button>
          </div>
        </div>
      </Modal>
    </UserGuideContext.Provider>
  );
}

export function useUserGuide() {
  return useContext(UserGuideContext);
}

export function useUserGuideStepCompletion(step: number) {
  const { completeStep } = useUserGuide();
  return useCallback(() => completeStep(step), [completeStep, step]);
}

export function useCanNavigateWithUserGuide(href: string) {
  const { canNavigateTo } = useUserGuide();
  return canNavigateTo(href);
}

export function getGuideRouteForHref(href: string): UserGuideRoute | null {
  const pathname = hrefToPathname(href);
  const segment = USER_GUIDE_SEGMENTS.find((item) => matchesUserGuideRoute(pathname, item.route));
  return segment?.route ?? null;
}
