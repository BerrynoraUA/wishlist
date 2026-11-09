import { forwardRef, type ComponentProps, type ComponentRef, type ReactNode } from "react";
import { ScrollView, useWindowDimensions, View, type ColorValue } from "react-native";
import { useRouter } from "expo-router";
import { ReanimatedTrueSheet } from "@lodev09/react-native-true-sheet/reanimated";
import { useCSSVariable } from "uniwind";
import { Text } from "@/components/ui/text";

type ReanimatedBottomSheetProps = ComponentProps<typeof ReanimatedTrueSheet>;
export type BottomSheetRef = ComponentRef<typeof ReanimatedTrueSheet>;
export const BottomSheetScrollView = ScrollView;

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

export interface BottomSheetProps extends ReanimatedBottomSheetProps {
  autoPresent?: boolean;
  dismissOnBack?: boolean;
}

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  (
    {
      autoPresent = true,
      dismissOnBack = false,
      onDidDismiss,
      detents = ["auto", 1],
      initialDetentIndex,
      initialDetentAnimated = true,
      backgroundColor,
      grabberOptions,
      footerOptions,
      footerStyle,
      style,
      ...props
    },
    ref,
  ) => {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const sheetBackground = useCSSVariable("--color-bg-elevated") as ColorValue | undefined;
    const grabberColor = useCSSVariable("--color-border-light") as ColorValue | undefined;

    return (
      <ReanimatedTrueSheet
        ref={ref}
        presentation="page"
        maxContentWidth={width}
        cornerRadius={process.env.EXPO_OS === "ios" ? undefined : 30}
        {...props}
        detents={detents}
        style={[detents.includes("auto") ? { flexShrink: 1 } : { flex: 1 }, style]}
        backgroundColor={backgroundColor ?? sheetBackground}
        grabberOptions={{ color: grabberColor, ...grabberOptions }}
        // The keyboard covers the footer's safe-area inset, so this padding is what keeps its
        // actions off the keyboard, and off the screen edge on devices with no inset.
        footerStyle={[
          { backgroundColor: backgroundColor ?? sheetBackground, paddingBottom: 12 },
          footerStyle,
        ]}
        footerOptions={{
          position: props.scrollableRef ? "absolute" : "relative",
          ...footerOptions,
        }}
        initialDetentIndex={initialDetentIndex ?? (autoPresent ? 0 : -1)}
        initialDetentAnimated={initialDetentAnimated}
        onDidDismiss={(event) => {
          if (dismissOnBack) router.back();
          onDidDismiss?.(event);
        }}
      />
    );
  },
);
BottomSheet.displayName = "BottomSheet";
