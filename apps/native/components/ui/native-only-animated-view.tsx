import Animated from "react-native-reanimated";

/**
 * This component keeps shared overlay animation call sites consistent.
 * @param props - The props for the animated view.
 * @returns The animated view.
 * @example
 * <NativeOnlyAnimatedView entering={FadeIn} exiting={FadeOut}>
 *   <Text>I am only animated on native</Text>
 * </NativeOnlyAnimatedView>
 */
function NativeOnlyAnimatedView(props: React.ComponentProps<typeof Animated.View>) {
  return <Animated.View {...props} />;
}

export { NativeOnlyAnimatedView };
