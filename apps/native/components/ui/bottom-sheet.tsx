import {
  createElement,
  forwardRef,
  isValidElement,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  Keyboard,
  View,
  type ColorValue,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { ReanimatedTrueSheet } from "@lodev09/react-native-true-sheet/reanimated";
import { useCSSVariable } from "uniwind";

type ReanimatedBottomSheetProps = ComponentProps<typeof ReanimatedTrueSheet>;
type BottomSheetDetents = NonNullable<ReanimatedBottomSheetProps["detents"]>;
const DEFAULT_DETENTS: BottomSheetDetents = ["auto", 1];
const DEFAULT_SCROLLABLE_DETENTS: BottomSheetDetents = [0.75, 1];

export type BottomSheetRef = ComponentRef<typeof ReanimatedTrueSheet>;

export interface BottomSheetProps extends Omit<
  ReanimatedBottomSheetProps,
  "children" | "detents" | "footerStyle" | "onDidDismiss"
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
  header?: ReanimatedBottomSheetProps["header"];
  footer?: ReanimatedBottomSheetProps["footer"];
  footerStyle?: ReanimatedBottomSheetProps["footerStyle"];
  footerPaddingBottom?: number;
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
      dismissOnBack = true,
      header,
      footer,
      footerStyle,
      footerPaddingBottom = 15,
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

    const calculatedFooterPadding = footer ? (footerPaddingBottom ?? 0) : undefined;
    const resolvedDetents = detents ?? (scrollable ? DEFAULT_SCROLLABLE_DETENTS : DEFAULT_DETENTS);

    const [footerHeight, setFooterHeight] = useState(0);

    useEffect(() => {
      if (!footer) {
        setFooterHeight(0);
      }
    }, [footer]);

    const bodyMarginBottom = footer ? footerHeight : 0;

    const handleFooterLayout = (event: LayoutChangeEvent) => {
      setFooterHeight(event.nativeEvent.layout.height);
    };

    const footerChild =
      footer == null
        ? null
        : isValidElement(footer)
          ? footer
          : createElement(footer as ComponentType<object>);

    const footerWithMeasure = footerChild ? (
      <View
        className="w-full"
        collapsable={false}
        onLayout={handleFooterLayout}
        style={[
          { backgroundColor: backgroundColor ?? sheetBackground },
          calculatedFooterPadding !== undefined && { paddingBottom: calculatedFooterPadding },
        ]}
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

    const handleSheetTouchCapture = (event: GestureResponderEvent) => {
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
        detents={resolvedDetents}
        scrollable={scrollable}
        scrollableOptions={scrollableOptions}
        dimmed={dimmed}
        cornerRadius={cornerRadius}
        header={header}
        footer={footerWithMeasure}
        footerStyle={footerStyle}
        backgroundColor={backgroundColor ?? sheetBackground}
        grabberOptions={{
          color: grabberColor,
          ...grabberOptions,
        }}
        initialDetentIndex={initialDetentIndex}
        initialDetentAnimated={initialDetentAnimated}
        onTouchEndCapture={handleSheetTouchCapture}
        onDidDismiss={handleDidDismiss}
        className={className}
        {...props}
      >
        {bodyMarginBottom > 0 ? (
          <View style={{ marginBottom: bodyMarginBottom }}>{children}</View>
        ) : (
          children
        )}
      </ReanimatedTrueSheet>
    );
  },
);

BottomSheet.displayName = "BottomSheet";
