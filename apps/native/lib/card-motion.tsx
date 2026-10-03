import * as React from "react";
import { LayoutAnimation, UIManager } from "react-native";
import Animated, {
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useReducedMotion } from "@/lib/motion";

type CardKind = "wishlist" | "item" | "request" | "blocked";
type RemovalListener = (id: string, accepted: boolean) => Promise<void> | void;
const removalListeners = new Map<CardKind, Set<RemovalListener>>();
const newCards = new Map<CardKind, Set<string>>();
const itemFadeIn = FadeIn.duration(180);
const NEW_CARD_HOLD_MS = 1200;
const NEW_CARD_FADE_MS = 1600;

export function markNewCard(kind: CardKind, id: string) {
  const ids = newCards.get(kind) ?? new Set<string>();
  ids.add(id);
  newCards.set(kind, ids);
}

function consumeNewCard(kind: CardKind, id: string) {
  const ids = newCards.get(kind);
  if (!ids?.has(id)) return false;
  ids.delete(id);
  return true;
}

export async function animateCardRemoval(kind: CardKind, id: string, accepted = false) {
  await Promise.all(Array.from(removalListeners.get(kind) ?? [], (listener) => listener(id, accepted)));
}

export function useListCardRemoval(
  kind: CardKind,
  prepareForLayoutAnimationRender: () => void,
  visibleIds: readonly string[],
) {
  const reduceMotion = useReducedMotion();
  const [exitingIds, setExitingIds] = React.useState<Set<string>>(() => new Set());
  const [acceptedIds, setAcceptedIds] = React.useState<Set<string>>(() => new Set());
  const [removedIds, setRemovedIds] = React.useState<Set<string>>(() => new Set());
  const visibleRef = React.useRef(visibleIds);
  const prepareRef = React.useRef(prepareForLayoutAnimationRender);
  const reducedMotionRef = React.useRef(reduceMotion);
  visibleRef.current = visibleIds;
  prepareRef.current = prepareForLayoutAnimationRender;
  reducedMotionRef.current = reduceMotion;

  React.useEffect(() => {
    let active = true;
    const listener: RemovalListener = async (id, accepted) => {
      if (!visibleRef.current.includes(id)) return;
      if (accepted && !reducedMotionRef.current) {
        setAcceptedIds((current) => new Set(current).add(id));
        await new Promise<void>((resolve) => setTimeout(resolve, 360));
        if (!active) return;
      }
      if (!reducedMotionRef.current) {
        setExitingIds((current) => new Set(current).add(id));
        await new Promise<void>((resolve) => setTimeout(resolve, 180));
        if (!active) return;
        UIManager.setLayoutAnimationEnabledExperimental?.(true);
        prepareRef.current();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setRemovedIds((current) => new Set(current).add(id));
    };
    const listeners = removalListeners.get(kind) ?? new Set<RemovalListener>();
    listeners.add(listener);
    removalListeners.set(kind, listeners);
    return () => {
      active = false;
      listeners.delete(listener);
    };
  }, [kind]);

  return { acceptedIds, exitingIds, removedIds };
}

export function AnimatedListCard({
  kind,
  id,
  exiting = false,
  style,
  children,
}: {
  kind: CardKind;
  id: string;
  exiting?: boolean;
  style?: { width?: number };
  children: React.ReactNode;
}) {
  const [highlight] = React.useState(() => consumeNewCard(kind, id));
  const progress = useSharedValue(1);
  const borderOpacity = useSharedValue(highlight ? 1 : 0);

  React.useEffect(() => {
    if (highlight) {
      borderOpacity.value = withDelay(
        NEW_CARD_HOLD_MS,
        withTiming(0, { duration: NEW_CARD_FADE_MS, reduceMotion: ReduceMotion.System }),
        ReduceMotion.System,
      );
    }
  }, [borderOpacity, highlight]);

  React.useEffect(() => {
    progress.value = withTiming(exiting ? 0 : 1, {
      duration: 180,
      reduceMotion: ReduceMotion.System,
    });
  }, [exiting, progress]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.92 + progress.value * 0.08 }],
  }));
  const highlightStyle = useAnimatedStyle(() => ({ opacity: borderOpacity.value }));

  return (
    <Animated.View entering={kind === "item" ? itemFadeIn : undefined} style={[style, cardStyle]}>
      {children}
      {highlight ? (
        <Animated.View
          pointerEvents="none"
          className="absolute inset-0 rounded-xl border-2 border-brand"
          style={highlightStyle}
        />
      ) : null}
    </Animated.View>
  );
}
