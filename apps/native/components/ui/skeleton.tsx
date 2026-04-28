import { cn } from "@/lib/utils";
import { motionDuration } from "@/lib/motion";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import * as React from "react";

function Skeleton({ className, ...props }: React.ComponentProps<typeof View>) {
  const sv = useSharedValue(1);

  React.useEffect(() => {
    sv.value = withRepeat(withTiming(0.5, { duration: motionDuration.loading }), -1, true);
  }, []);

  const style = useAnimatedStyle(
    () => ({
      opacity: sv.value,
    }),
    [sv],
  );
  return (
    <Animated.View
      style={style}
      className={cn("bg-secondary dark:bg-muted rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
