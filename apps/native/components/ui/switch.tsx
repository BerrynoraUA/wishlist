import { motionSpring, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import * as SwitchPrimitives from "@rn-primitives/switch";
import * as React from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedSwitchThumb = Animated.createAnimatedComponent(SwitchPrimitives.Thumb);
const SWITCH_THUMB_TRANSLATE_X = 20;

type SwitchProps = React.ComponentProps<typeof SwitchPrimitives.Root> & {
  staticColors?: boolean;
};

function Switch({ className, staticColors = false, ...props }: SwitchProps) {
  const reduceMotion = useReducedMotion();
  const checked = props.checked === true;
  const thumbTranslateX = useSharedValue(checked ? SWITCH_THUMB_TRANSLATE_X : 0);

  React.useEffect(() => {
    const nextPosition = checked ? SWITCH_THUMB_TRANSLATE_X : 0;
    thumbTranslateX.value = reduceMotion
      ? withTiming(nextPosition, { duration: 0 })
      : withSpring(nextPosition, motionSpring.navPill);
  }, [checked, reduceMotion, thumbTranslateX]);

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbTranslateX.value }],
  }));

  return (
    <SwitchPrimitives.Root
      className={cn(
        "flex h-7 w-12 shrink-0 flex-row items-center rounded-full p-0.5 shadow-inner shadow-black/5",
        !staticColors && checked ? "bg-primary" : "bg-input dark:bg-input/80",
        props.disabled && "opacity-50",
        className,
      )}
      {...props}
    >
      <AnimatedSwitchThumb
        className={cn(
          "size-6 rounded-full shadow-sm shadow-black/20",
          !staticColors && checked ? "bg-primary-foreground" : "bg-brand",
        )}
        style={thumbAnimatedStyle}
      />
    </SwitchPrimitives.Root>
  );
}

export { Switch };
