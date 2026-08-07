import {
  createContext,
  createElement,
  forwardRef,
  isValidElement,
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
import { useRouter } from "expo-router";
import { ReanimatedTrueSheet } from "@lodev09/react-native-true-sheet/reanimated";
import { useCSSVariable } from "uniwind";
import { useBottomSafeAreaPadding } from "@/lib/layout";

type ReanimatedBottomSheetProps = ComponentProps<typeof ReanimatedTrueSheet>;
type BottomSheetDetents = NonNullable<ReanimatedBottomSheetProps["detents"]>;
const DEFAULT_DETENTS: BottomSheetDetents = ["auto", 1];
const DEFAULT_SCROLLABLE_DETENTS: BottomSheetDetents = [0.75, 1];
const FOOTER_CONTENT_GAP = 12;

export type BottomSheetRef = ComponentRef<typeof ReanimatedTrueSheet>;

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
      cornerRadius = 30,
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
    const bottomSafeAreaPadding = useBottomSafeAreaPadding();
    const { width: windowWidth } = useWindowDimensions();

    const resolvedDetents = detents ?? (scrollable ? DEFAULT_SCROLLABLE_DETENTS : DEFAULT_DETENTS);

    const [footerHeight, setFooterHeight] = useState(0);
    const footerControlHeight = Math.max(0, footerHeight - bottomSafeAreaPadding);
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
          paddingBottom: bottomSafeAreaPadding,
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
        cornerRadius={cornerRadius}
        header={header}
        footer={resolvedFooter}
        footerOptions={{ keyboardOffset: -bottomSafeAreaPadding }}
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
                  : bottomSafeAreaPadding,
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
