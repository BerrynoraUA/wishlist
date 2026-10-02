import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  clampAspect,
  FittedImage,
  IMAGE_ASPECT_RANGE,
  useImageAspect,
} from "@/components/ui/fitted-image";
import { Text } from "@/components/ui/text";
import { MAX_IMAGE_UPLOAD_BYTES, type NativePickedImage } from "@/lib/image-upload";
import { cn } from "@/lib/utils";
import { motionDuration, useReducedMotion } from "@/lib/motion";
import type { ImageLoadEventData } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, Pencil, X } from "lucide-react-native";
import * as React from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useGT } from "gt-react-native";

export function SingleImagePicker({
  previewUri,
  borderColor,
  aspect = [1, 1],
  pickLabel,
  changeLabel,
  onPick,
  onClear,
  onError,
}: {
  previewUri?: string | null;
  borderColor?: string | null;
  aspect?: [number, number];
  pickLabel: string;
  changeLabel: string;
  onPick: (image: NativePickedImage) => void;
  onClear: () => void;
  onError: (message: string) => void;
}) {
  const t = useGT();
  const reduceMotion = useReducedMotion();
  const previewBorderColor = useSharedValue(borderColor ?? "transparent");

  React.useEffect(() => {
    const nextColor = borderColor ?? "transparent";
    previewBorderColor.value = reduceMotion
      ? nextColor
      : withTiming(nextColor, { duration: motionDuration.normal });
  }, [borderColor, reduceMotion, previewBorderColor]);

  const borderStyle = useAnimatedStyle(() => ({ borderColor: previewBorderColor.value }));

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      onError(t("Allow photo library access to choose an image."));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      allowsMultipleSelection: false,
      aspect,
      quality: 0.85,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) return;

    if (asset.fileSize && asset.fileSize > MAX_IMAGE_UPLOAD_BYTES) {
      onError(t("Choose an image that is 5 MB or less."));
      return;
    }

    onPick({
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
    });
  }

  return (
    <View className="gap-3">
      <View
        className={cn(
          "overflow-hidden rounded-xl border border-border-subtle",
          // A letterboxed photo sits on the screen itself, not on a grey card.
          !previewUri && "bg-bg-muted",
        )}
      >
        {previewUri ? (
          <PreviewFrame uri={previewUri}>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={changeLabel}
              onPress={pickImage}
              className="absolute inset-0"
            />
            <Button
              variant="destructive"
              size="icon"
              accessibilityLabel={t("Remove image")}
              onPress={onClear}
              className="absolute end-3 top-3 rounded-full bg-destructive/85 dark:bg-destructive/85"
            >
              <Icon as={X} className="size-4 text-white" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              accessibilityLabel={changeLabel}
              onPress={pickImage}
              className="absolute bottom-3 end-3 rounded-full bg-secondary/85"
            >
              <Icon as={Pencil} className="size-4 text-text" />
            </Button>
          </PreviewFrame>
        ) : (
          <Button variant="ghost" onPress={pickImage} className="h-32 flex-col gap-2">
            <Icon as={ImagePlus} className="size-7 text-brand" />
            <Text>{pickLabel}</Text>
          </Button>
        )}
        <Animated.View
          pointerEvents="none"
          className="absolute inset-0 rounded-xl border-2"
          style={borderStyle}
        />
      </View>
    </View>
  );
}

const IMAGE_FADE_MS = 450;
/** Frame height while the photo's shape is still unknown. */
const PREVIEW_PLACEHOLDER_HEIGHT = 160;

/**
 * The preview frame, shaped like the photo it shows: it opens at a placeholder height and
 * grows (or shrinks) to the photo's aspect ratio once that is known, animating its height so
 * the fields below slide along rather than jump.
 */
function PreviewFrame({ uri, children }: { uri: string; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const image = useImageAspect(uri);
  const targetAspect = image.aspect ? clampAspect(image.aspect, IMAGE_ASPECT_RANGE.hero) : null;
  const width = useSharedValue(0);
  const height = useSharedValue(PREVIEW_PLACEHOLDER_HEIGHT);

  const fitHeight = React.useCallback(
    (animate: boolean) => {
      if (!width.value || !targetAspect) return;
      const next = width.value / targetAspect;
      height.value =
        animate && !reduceMotion
          ? withTiming(next, { duration: motionDuration.slow, easing: Easing.out(Easing.cubic) })
          : next;
    },
    [height, reduceMotion, targetAspect, width],
  );

  React.useEffect(() => fitHeight(true), [fitHeight]);

  const style = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <Animated.View
      className="relative"
      style={style}
      onLayout={({ nativeEvent }) => {
        // Height changes as it animates; only a new width should re-fit it.
        if (nativeEvent.layout.width === width.value) return;
        width.value = nativeEvent.layout.width;
        fitHeight(false);
      }}
    >
      <FadeInImage uri={uri} onLoad={image.onLoad} />
      {children}
    </Animated.View>
  );
}

/** Fades the photo in and settles it from a slight zoom once it has actually loaded. */
function FadeInImage({
  uri,
  onLoad,
}: {
  uri: string;
  onLoad: (event: ImageLoadEventData) => void;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = 0;
  }, [progress, uri]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: reduceMotion ? 1 : 1.04 - 0.04 * progress.value }],
  }));

  return (
    <Animated.View className="absolute inset-0" style={style}>
      <FittedImage
        uri={uri}
        className="size-full"
        onLoad={(event) => {
          onLoad(event);
          progress.value = withTiming(1, {
            duration: IMAGE_FADE_MS,
            easing: Easing.out(Easing.cubic),
          });
        }}
      />
    </Animated.View>
  );
}
