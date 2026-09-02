import {
  createContext,
  createElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useContext,
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  Keyboard,
  ScrollView,
  useWindowDimensions,
  View,
  type ColorValue,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  TextInput,
} from "react-native";
import { initialWindowMetrics } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ReanimatedTrueSheet } from "@lodev09/react-native-true-sheet/reanimated";
import { useCSSVariable } from "uniwind";
import { Text } from "@/components/ui/text";

type ReanimatedBottomSheetProps = ComponentProps<typeof ReanimatedTrueSheet>;
type BottomSheetDetents = NonNullable<ReanimatedBottomSheetProps["detents"]>;
const DEFAULT_DETENTS: BottomSheetDetents = ["auto", 1];
const DEFAULT_SCROLLABLE_DETENTS: BottomSheetDetents = [0.75, 1];
const FOOTER_CONTENT_GAP = 12;
/** iOS's standard content margin, used under every sheet's last row. */
const SHEET_CONTENT_BOTTOM_MARGIN = 16;
/**
 * iOS sizes a sheet's corners concentrically with the display it sits on, so its own radius is
 * both larger than anything we would pick and device-specific — `undefined` hands the choice
 * back to UIKit. Android has no system default and squares the corners when none is given, so
 * it keeps an explicit one.
 */
const ANDROID_CORNER_RADIUS = 30;
/** Detent used for the very first frame, before the content has reported its height. */
const INITIAL_CONTENT_DETENT = 0.75;
const MIN_CONTENT_DETENT = 0.35;
const MAX_CONTENT_DETENT = 0.94;

export type BottomSheetRef = ComponentRef<typeof ReanimatedTrueSheet>;

/**
 * Sizes a scrollable sheet to its content.
 *
 * The native `auto` detent cannot do this: it has to measure the whole content, which a
 * scrollable sheet clips, so a sheet that mixes the two opens at its maximum height and
 * leaves dead space under short content. Measuring the scroll content ourselves and
 * handing the sheet a single fractional detent keeps a short item compact and still lets
 * a long one fill the screen and scroll.
 *
 * Wire `onHeaderLayout` to a view wrapping the sheet header and `onContentSizeChange` to
 * the BottomSheetScrollView; the scroll content already carries the footer inset, so the
 * header and the footer's own bottom padding are all that is left to add.
 */
export function useSheetContentDetent({
  initial = INITIAL_CONTENT_DETENT,
  min = MIN_CONTENT_DETENT,
  max = MAX_CONTENT_DETENT,
}: { initial?: number; min?: number; max?: number } = {}) {
  const { height: windowHeight } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const bottomSafeAreaInset = initialWindowMetrics?.insets.bottom ?? 0;
  const chromeHeight = headerHeight + Math.max(bottomSafeAreaInset, SHEET_CONTENT_BOTTOM_MARGIN);

  const onContentSizeChange = useCallback((_width: number, height: number) => {
    setContentHeight(height);
  }, []);

  const onHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    setHeaderHeight(event.nativeEvent.layout.height);
  }, []);

  // Rounded to whole percents so a one-pixel reflow does not retrigger a resize.
  const detent =
    contentHeight > 0
      ? Math.round(
          Math.min(max, Math.max(min, (contentHeight + chromeHeight) / windowHeight)) * 100,
        ) / 100
      : initial;

  return { detent, onContentSizeChange, onHeaderLayout };
}

const FooterContentInsetContext = createContext(0);

/** Scroll view that keeps its final content clear of a BottomSheet footer. */
export const BottomSheetScrollView = forwardRef<
  ComponentRef<typeof ScrollView>,
  ComponentProps<typeof ScrollView>
>(({ contentContainerStyle, ...props }, ref) => {
  const footerContentInset = useContext(FooterContentInsetContext);

  return (
    <ScrollView
      ref={ref}
      contentContainerStyle={[contentContainerStyle, { paddingBottom: footerContentInset }]}
      {...props}
    />
  );
});

BottomSheetScrollView.displayName = "BottomSheetScrollView";

/**
 * The one header every sheet gets: fixed above the content, a single centered line naming
 * what the sheet does. Deliberately has no room for a subtitle — sheets that need to explain
 * themselves do it in their content, so the chrome stays identical everywhere.
 *
 * Pass it to `BottomSheet`'s `header` prop, never as a child.
 */
export function BottomSheetHeader({ title, action }: { title: string; action?: ReactNode }) {
  // A trailing action would pull the title off-centre, so it is mirrored by an invisible
  // copy on the leading side — the two slots always measure the same, whatever the action is.
  const actionSpacer = action ? (
    <View
      className="opacity-0"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {action}
    </View>
  ) : null;

  return (
    // `pt-5` clears the grabber.
    <View className="flex-row items-center gap-2 px-5 pb-3 pt-5">
      {actionSpacer}
      <Text
        numberOfLines={1}
        className="min-w-0 flex-1 text-center text-lg font-extrabold text-text"
      >
        {title}
      </Text>
      {action}
    </View>
  );
}

export interface BottomSheetProps extends Omit<
  ReanimatedBottomSheetProps,
  | "children"
  | "detents"
  | "footerOptions"
  | "footerStyle"
  | "insetAdjustment"
  | "maxContentWidth"
  | "onDidDismiss"
  | "presentation"
> {
  children?: ReactNode;
  detents?: BottomSheetDetents;
  initialDetentIndex?: number;
  initialDetentAnimated?: boolean;
  scrollable?: boolean;
  dimmed?: boolean;
  cornerRadius?: number;
  onDidDismiss?: () => void;
  autoPresent?: boolean;
  dismissOnBack?: boolean;
  dismissKeyboardOnTouch?: boolean;
  header?: ReanimatedBottomSheetProps["header"];
  footer?: ReanimatedBottomSheetProps["footer"];
  footerStyle?: ReanimatedBottomSheetProps["footerStyle"];
  /** Use with BottomSheetScrollView when the footer inset must scroll with the content. */
  footerInsetMode?: "container" | "scroll-content";
  backgroundColor?: ColorValue;
}

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  (
    {
      children,
      detents,
      scrollable,
      dimmed = true,
      cornerRadius,
      onDidDismiss,
      autoPresent = true,
      dismissOnBack = false,
      dismissKeyboardOnTouch = true,
      header,
      footer,
      footerStyle,
      footerInsetMode = "container",
      backgroundColor,
      grabberOptions,
      className,
      initialDetentIndex,
      initialDetentAnimated,
      scrollableOptions,
      ...props
    },
    ref,
  ) => {
    const router = useRouter();
    const sheetRef = useRef<BottomSheetRef>(null);
    const sheetBackground = useCSSVariable("--color-bg-elevated") as ColorValue | undefined;
    const grabberColor = useCSSVariable("--color-border-light") as ColorValue | undefined;
    // A sheet can remain in a tab screen's React tree after TrueSheet presents it in a
    // window-level native container. The contextual inset then includes the iOS tab bar,
    // so use the physical window inset for sheet layout instead.
    const bottomSafeAreaInset = initialWindowMetrics?.insets.bottom ?? 0;
    // Only the footer insets itself. TrueSheet already grows the sheet past its detent by the
    // bottom safe area, and the content sits above that growth — but the footer is pinned to
    // the sheet's bottom edge, underneath it, so it has to clear the home indicator on its own.
    // Padding the content by the inset as well is what doubles the gap under a sheet.
    const footerBottomPadding = Math.max(bottomSafeAreaInset, SHEET_CONTENT_BOTTOM_MARGIN);
    const { width: windowWidth } = useWindowDimensions();

    const resolvedDetents = detents ?? (scrollable ? DEFAULT_SCROLLABLE_DETENTS : DEFAULT_DETENTS);

    const [footerHeight, setFooterHeight] = useState(0);
    const footerControlHeight = Math.max(0, footerHeight - footerBottomPadding);
    const footerContentInset = footer ? footerControlHeight + FOOTER_CONTENT_GAP : 0;
    const scrollContentHandlesFooterInset = footerInsetMode === "scroll-content";

    const handleFooterLayout = (event: LayoutChangeEvent) => {
      setFooterHeight(event.nativeEvent.layout.height);
    };

    const footerChild =
      footer == null
        ? null
        : isValidElement(footer)
          ? footer
          : createElement(footer as ComponentType<object>);

    const resolvedFooter = footerChild ? (
      <View
        className="w-full"
        collapsable={false}
        onLayout={handleFooterLayout}
        style={{
          backgroundColor: backgroundColor ?? sheetBackground,
          paddingBottom: footerBottomPadding,
        }}
      >
        {footerChild}
      </View>
    ) : undefined;

    useImperativeHandle(ref, () => sheetRef.current as BottomSheetRef);

    const libraryPresentsOnMount = initialDetentIndex !== undefined && initialDetentIndex >= 0;

    useEffect(() => {
      if (!autoPresent) {
        return;
      }
      // `initialDetentIndex >= 0` already shows the sheet on mount; a second `present()` warns
      // ("sheet is already presented. Use resize() to change detent.").
      if (libraryPresentsOnMount) {
        return;
      }
      void sheetRef.current?.present();
    }, [autoPresent, libraryPresentsOnMount]);

    const handleSheetTouch = (event: GestureResponderEvent) => {
      // Nested sheets remain in their parent's React tree even though TrueSheet presents
      // them in a separate native container. Stop opted-out touches here so they cannot
      // bubble to an ancestor sheet that still dismisses the keyboard by default.
      if (!dismissKeyboardOnTouch) {
        event.stopPropagation();
        return false;
      }

      const focusedInput = TextInput.State.currentlyFocusedInput?.();

      if (focusedInput && event.target !== focusedInput) {
        Keyboard.dismiss();
      }

      return false;
    };

    const handleDidDismiss = () => {
      if (dismissOnBack) {
        router.back();
      }
      onDidDismiss?.();
    };

    return (
      <ReanimatedTrueSheet
        ref={sheetRef}
        {...props}
        detents={resolvedDetents}
        scrollable={scrollable}
        scrollableOptions={scrollableOptions}
        presentation="page"
        maxContentWidth={windowWidth}
        insetAdjustment="automatic"
        dimmed={dimmed}
        cornerRadius={
          cornerRadius ?? (process.env.EXPO_OS === "ios" ? undefined : ANDROID_CORNER_RADIUS)
        }
        header={header}
        footer={resolvedFooter}
        footerOptions={{ keyboardOffset: -bottomSafeAreaInset }}
        footerStyle={footerStyle}
        backgroundColor={backgroundColor ?? sheetBackground}
        grabberOptions={{
          color: grabberColor,
          ...grabberOptions,
        }}
        initialDetentIndex={initialDetentIndex}
        initialDetentAnimated={initialDetentAnimated}
        onTouchEnd={handleSheetTouch}
        onDidDismiss={handleDidDismiss}
        className={className}
      >
        <View
          style={{
            flexGrow: scrollable ? 1 : undefined,
            marginBottom:
              footer && !scrollable && !scrollContentHandlesFooterInset ? footerContentInset : 0,
            paddingBottom:
              footer && scrollable && !scrollContentHandlesFooterInset
                ? footerContentInset
                : footer
                  ? 0
                  : SHEET_CONTENT_BOTTOM_MARGIN,
            width: "100%",
          }}
        >
          <FooterContentInsetContext.Provider
            value={scrollContentHandlesFooterInset ? footerContentInset : 0}
          >
            {children}
          </FooterContentInsetContext.Provider>
        </View>
      </ReanimatedTrueSheet>
    );
  },
);

BottomSheet.displayName = "BottomSheet";
