import { AnimatedMascot, type MascotVariant } from "@/components/shared/animated-mascot";
import { motionDuration } from "@/lib/motion";
import * as React from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig } from "react-native-reanimated";

/** The feet sit at ~86% of every mascot canvas; everything below them is empty. */
const FEET = 0.86;

/**
 * The mascot above the screen title. Changing `variant` crossfades to the new pose.
 */
export function AuthMascot({ variant, size }: { variant: MascotVariant; size: number }) {
  // Only the first pose gets the entrance; every pose after it, even a return to the first
  // one, just crossfades in.
  const [firstVariant] = React.useState(variant);
  const [swapped, setSwapped] = React.useState(false);
  if (!swapped && variant !== firstVariant) setSwapped(true);

  return (
    // Trimmed at the feet, so the empty canvas below them doesn't push the title down.
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="items-center overflow-hidden"
      style={{ height: size * FEET }}
    >
      <View style={{ height: size, width: size }}>
        <LayoutAnimationConfig skipEntering>
          <Animated.View
            key={variant}
            className="absolute inset-0"
            entering={FadeIn.duration(motionDuration.normal)}
            exiting={FadeOut.duration(motionDuration.normal)}
          >
            <AnimatedMascot
              size={size}
              skipEntrance={swapped || variant !== firstVariant}
              subtle
              variant={variant}
            />
          </Animated.View>
        </LayoutAnimationConfig>
      </View>
    </View>
  );
}
