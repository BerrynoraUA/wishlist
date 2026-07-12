import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Icon } from "@/components/ui/icon";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { getWishlistAccentClass } from "@/lib/wishlists";
import type { Wishlist } from "@wishlist/backend/types/wishlist";
import { useGT } from "gt-react-native";
import {
  Copy,
  Gift,
  Instagram,
  MessageCircle,
  MoreHorizontal,
  Send,
  X,
  type LucideIcon,
} from "lucide-react-native";
import * as React from "react";
import { Linking, Platform, Share, useWindowDimensions, View } from "react-native";
import * as Clipboard from "expo-clipboard";

type ShareTarget = "whatsapp" | "copy" | "more" | "message" | "story" | "telegram";

export function WishlistShareSheet({
  wishlist,
  link,
  onOpenChange,
}: {
  wishlist: Wishlist | null;
  link: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useGT();
  const { height } = useWindowDimensions();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (wishlist && link) setCopied(false);
  }, [wishlist, link]);

  if (!wishlist || !link) return null;

  const activeWishlist = wishlist;
  const activeLink = link;
  const previewImageHeight = Math.max(116, Math.min(190, Math.round(height * 0.22)));
  const shareMessage = t(
    "Here's my wishlist. You can view gift ideas and reserve one here: {link}",
    {
      link: activeLink,
    },
  );
  const targets: Array<{
    key: ShareTarget;
    label: string;
    icon: LucideIcon;
    iconClassName: string;
    tileClassName: string;
  }> = [
    {
      key: "whatsapp",
      label: t("WhatsApp"),
      icon: MessageCircle,
      iconClassName: "text-white",
      tileClassName: "bg-[#25D366]",
    },
    {
      key: "copy",
      label: copied ? t("Copied") : t("Copy Link"),
      icon: Copy,
      iconClassName: "text-text",
      tileClassName: "bg-bg-muted",
    },
    {
      key: "more",
      label: t("More"),
      icon: MoreHorizontal,
      iconClassName: "text-text",
      tileClassName: "bg-bg-muted",
    },
    {
      key: "message",
      label: Platform.OS === "ios" ? t("iMessage") : t("Messages"),
      icon: MessageCircle,
      iconClassName: "text-white",
      tileClassName: "bg-[#34C759]",
    },
    {
      key: "story",
      label: t("Story"),
      icon: Instagram,
      iconClassName: "text-white",
      tileClassName: "bg-pink-500",
    },
    {
      key: "telegram",
      label: t("Telegram"),
      icon: Send,
      iconClassName: "text-white",
      tileClassName: "bg-sky-500",
    },
  ];

  async function dismiss() {
    await sheetRef.current?.dismiss();
  }

  async function openUrl(url: string, fallback?: string) {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return;
    }

    if (fallback) {
      await Linking.openURL(fallback);
    } else {
      await Share.share({ title: activeWishlist.title, message: shareMessage, url: activeLink });
    }
  }

  async function handleTargetPress(target: ShareTarget) {
    const encodedLink = encodeURIComponent(activeLink);
    const encodedMessage = encodeURIComponent(shareMessage);

    switch (target) {
      case "copy":
        await Clipboard.setStringAsync(activeLink);
        setCopied(true);
        return;
      case "whatsapp":
        await Linking.openURL(`https://wa.me/?text=${encodedMessage}`);
        return;
      case "message":
        await Linking.openURL(
          Platform.OS === "ios" ? `sms:&body=${encodedMessage}` : `sms:?body=${encodedMessage}`,
        );
        return;
      case "story":
        await openUrl("instagram://story-camera", undefined);
        return;
      case "telegram":
        await openUrl(
          `tg://msg?text=${encodedMessage}`,
          `https://t.me/share/url?url=${encodedLink}&text=${encodeURIComponent(activeWishlist.title)}`,
        );
        return;
      case "more":
        await Share.share({ title: activeWishlist.title, message: shareMessage, url: activeLink });
        return;
    }
  }

  return (
    <BottomSheet
      ref={sheetRef}
      detents={["auto"]}
      cornerRadius={28}
      onDidDismiss={() => onOpenChange(false)}
    >
      <View className="gap-5 px-4 pb-8 pt-4">
        <View className="flex-row items-center justify-center">
          <View className="items-center gap-1 px-12">
            <Text className="text-xl font-extrabold text-text">{t("Share this wishlist")}</Text>
            <Text className="text-center text-sm font-semibold text-text-muted">
              {t("Send one link so people can view ideas and reserve gifts.")}
            </Text>
          </View>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={t("Close")}
            className="absolute right-0 size-10 items-center justify-center rounded-full"
            onPress={dismiss}
          >
            <Icon as={X} className="size-8 text-text" />
          </AnimatedPressable>
        </View>

        <View className="overflow-hidden rounded-[24px] border border-border-subtle bg-card-bg">
          <View
            className="items-center justify-center bg-bg-subtle"
            style={{ height: previewImageHeight }}
          >
            {wishlist.image_url ? (
              <StyledImage
                source={{ uri: wishlist.image_url }}
                contentFit="cover"
                className="size-full"
              />
            ) : (
              <Text className="px-10 text-center text-lg text-text-muted">
                {t("No pictures? Maybe the wishes are simply invisible!")}
              </Text>
            )}
          </View>

          <View className="gap-3 p-4">
            <Text className="text-xl font-extrabold text-text" numberOfLines={1}>
              {wishlist.title}
            </Text>
            <View className="flex-row items-center gap-3">
              <View
                className={cn(
                  "size-16 items-center justify-center rounded-2xl",
                  getWishlistAccentClass(wishlist.accent_type),
                )}
              >
                <Icon as={Gift} className="size-7 text-white" />
              </View>
              <View className="flex-1 gap-2">
                <View className="rounded-xl bg-bg-elevated px-3 py-2">
                  <Text className="text-sm text-text-muted">
                    {t("gift ideas")}{" "}
                    <Text className="font-extrabold text-text">{wishlist.items_count}</Text>
                  </Text>
                </View>
                <View className="rounded-xl bg-bg-elevated px-3 py-2">
                  <Text className="text-sm text-text-muted">{t("view and reserve")}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-7">
          {targets.map((target) => (
            <View key={target.key} className="w-1/3 items-center gap-2">
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={target.label}
                className={cn(
                  "size-16 items-center justify-center rounded-2xl",
                  target.tileClassName,
                )}
                onPress={() => {
                  void handleTargetPress(target.key);
                }}
              >
                <Icon as={target.icon} className={cn("size-9", target.iconClassName)} />
              </AnimatedPressable>
              <Text className="text-center text-base font-extrabold text-text">{target.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}
