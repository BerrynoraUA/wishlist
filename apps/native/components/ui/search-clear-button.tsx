import { Icon } from "@/components/ui/icon";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { motionDuration, useReducedMotion } from "@/lib/motion";
import { useGT } from "gt-react-native";
import { X } from "lucide-react-native";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

/**
 * The clear button at the end of a search field, drawn like the system's `xmark.circle.fill`:
 * a soft grey disc with the cross knocked out, sized to the field's magnifying glass and
 * inset like it, inside a full 44pt tap target. Render it only while there is text.
 */
export function SearchClearButton({ onPress }: { onPress: () => void }) {
  const t = useGT();
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(motionDuration.fast)}
      exiting={reduceMotion ? undefined : FadeOut.duration(motionDuration.fast)}
    >
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={t("Clear search")}
        onPress={onPress}
        pressedScale={1}
        pressedOpacity={1}
        className="size-11 shrink-0 items-center justify-center rounded-full android:size-12 android:overflow-hidden"
      >
        {process.env.EXPO_OS === "android" ? (
          <Icon as={X} className="size-5 text-text-muted" />
        ) : (
          <View className="size-[18px] items-center justify-center rounded-full bg-muted-foreground/45">
            <Icon as={X} className="size-3 text-bg" strokeWidth={3} />
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}
