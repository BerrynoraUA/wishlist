import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import { MAX_IMAGE_UPLOAD_BYTES, type NativePickedImage } from "@/lib/image-upload";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImagePlus, X } from "lucide-react-native";
import * as React from "react";
import { View } from "react-native";
import { useGT } from "gt-react-native";

export function SingleImagePicker({
  previewUri,
  aspect = [1, 1],
  pickLabel,
  changeLabel,
  onPick,
  onClear,
  onError,
  showChangeButton = true,
}: {
  previewUri?: string | null;
  aspect?: [number, number];
  pickLabel: string;
  changeLabel: string;
  onPick: (image: NativePickedImage) => void;
  onClear: () => void;
  onError: (message: string) => void;
  showChangeButton?: boolean;
}) {
  const t = useGT();

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
      <View className="overflow-hidden rounded-xl border border-border-subtle bg-bg-muted">
        {previewUri ? (
          <View className="relative h-40">
            <StyledImage
              source={{ uri: previewUri }}
              contentFit="cover"
              className="absolute inset-0 size-full"
            />
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={changeLabel}
              onPress={pickImage}
              className="absolute inset-0"
            />
            <Button
              variant="secondary"
              size="icon"
              accessibilityLabel={t("Remove image")}
              onPress={onClear}
              className="absolute right-3 top-3 rounded-full"
            >
              <Icon as={X} className="size-4 text-text" />
            </Button>
          </View>
        ) : (
          <Button variant="ghost" onPress={pickImage} className="h-32 flex-col gap-2">
            <Icon as={ImagePlus} className="size-7 text-brand" />
            <Text>{pickLabel}</Text>
          </Button>
        )}
      </View>
      {previewUri && showChangeButton ? (
        <Button variant="outline" onPress={pickImage} className="self-start">
          <Icon as={Camera} className="size-4 text-text" />
          <Text>{changeLabel}</Text>
        </Button>
      ) : null}
    </View>
  );
}
