import { BottomSheet, BottomSheetHeader, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StyledPressable } from "@/components/ui/styled-pressable";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { getDefaultAvatarUrls } from "@wishlist/backend/lib/default-avatars";
import { Image } from "expo-image";
import { Check, ImagePlus } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View } from "react-native";

const DEFAULT_AVATAR_URLS = getDefaultAvatarUrls();
const AVATAR_RADIUS = 999;

/**
 * Tapping the profile picture opens this: the ten default avatars to pick from,
 * or the photo library for a picture of your own.
 */
export function AvatarPickerSheet({
  open,
  selectedUrl,
  onSelect,
  onUpload,
  onClose,
}: {
  open: boolean;
  selectedUrl: string | null;
  onSelect: (url: string) => void;
  onUpload: () => void;
  onClose: () => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  // Both choices close the sheet first: the photo library must not be presented
  // over a sheet that is still animating away.
  const pendingChoiceRef = React.useRef<(() => void) | null>(null);

  if (!open) return null;

  function dismissWith(choice: () => void) {
    pendingChoiceRef.current = choice;
    void sheetRef.current?.dismiss();
  }

  function handleDidDismiss() {
    const choice = pendingChoiceRef.current;
    pendingChoiceRef.current = null;
    onClose();
    choice?.();
  }

  return (
    <BottomSheet
      ref={sheetRef}
      detents={["auto"]}
      onDidDismiss={handleDidDismiss}
      header={<BottomSheetHeader title={t("Profile photo")} />}
    >
      <View className="gap-4 px-5">
        <Text className="text-sm leading-5 text-text-muted">
          {t("Pick one of our avatars, or upload a photo of your own.")}
        </Text>
        {/* A fifth of the row each, so the ten always come out as two rows of five
            whatever the screen width is. */}
        <View className="flex-row flex-wrap">
          {DEFAULT_AVATAR_URLS.map((url, index) => {
            const isSelected = url === selectedUrl;

            return (
              <View key={url} className="w-1/5 items-center px-1.5 py-1.5">
                <StyledPressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={t("Avatar {number}", { number: index + 1 })}
                  onPress={() => dismissWith(() => onSelect(url))}
                  className={cn(
                    "w-full rounded-full border-2 active:opacity-80",
                    isSelected ? "border-brand" : "border-transparent",
                  )}
                >
                  <Image
                    source={{ uri: url }}
                    contentFit="cover"
                    style={{ width: "100%", aspectRatio: 1, borderRadius: AVATAR_RADIUS }}
                  />
                  {isSelected ? (
                    <View className="absolute bottom-0 right-0 size-5 items-center justify-center rounded-full bg-brand">
                      <Icon as={Check} className="size-3 text-white" strokeWidth={3} />
                    </View>
                  ) : null}
                </StyledPressable>
              </View>
            );
          })}
        </View>
        <Button variant="outline" onPress={() => dismissWith(onUpload)}>
          <Icon as={ImagePlus} className="size-4 text-text" />
          <Text>{t("Upload a photo")}</Text>
        </Button>
      </View>
    </BottomSheet>
  );
}
