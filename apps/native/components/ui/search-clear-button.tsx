import { Icon } from "@/components/ui/icon";
import { motionDuration, useReducedMotion } from "@/lib/motion";
import { useGT } from "gt-react-native";
import { X } from "lucide-react-native";
import { Pressable, View } from "react-native";
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Clear search")}
        onPress={onPress}
        className="size-11 shrink-0 items-center justify-center"
      >
        <View className="size-[18px] items-center justify-center rounded-full bg-muted-foreground/45">
          <Icon as={X} className="size-3 text-bg" strokeWidth={3} />
        </View>
      </Pressable>
    </Animated.View>
  );
}
