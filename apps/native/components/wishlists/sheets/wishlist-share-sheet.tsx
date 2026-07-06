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
import { Linking, Platform, Share, View } from "react-native";
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
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (wishlist && link) setCopied(false);
  }, [wishlist, link]);

  if (!wishlist || !link) return null;

  const activeWishlist = wishlist;
  const activeLink = link;
  const shareMessage = t("Take a look at my wishlist: {link}", { link: activeLink });
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
      iconClassName: "text-white",
      tileClassName: "bg-slate-700",
    },
    {
      key: "more",
      label: t("More"),
      icon: MoreHorizontal,
      iconClassName: "text-white",
      tileClassName: "bg-slate-700",
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
      dismissOnBack={false}
      cornerRadius={28}
      onDidDismiss={() => onOpenChange(false)}
      backgroundColor="#282c32"
    >
      <View className="gap-8 px-6 pb-8 pt-5">
        <View className="flex-row items-center justify-center">
          <Text className="text-xl font-extrabold text-white">{t("Share your wishlist")}</Text>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={t("Close")}
            className="absolute right-0 size-10 items-center justify-center rounded-full"
            onPress={dismiss}
          >
            <Icon as={X} className="size-8 text-white" />
          </AnimatedPressable>
        </View>

        <View className="overflow-hidden rounded-[28px] bg-neutral-100">
          <View className="aspect-[1.04] items-center justify-center bg-[#fbf2e4]">
            {wishlist.image_url ? (
              <StyledImage
                source={{ uri: wishlist.image_url }}
                contentFit="cover"
                className="size-full"
              />
            ) : (
              <Text className="px-10 text-center text-lg text-neutral-600">
                {t("No pictures? Maybe the wishes are simply invisible!")}
              </Text>
            )}
          </View>

          <View className="gap-4 p-5">
            <Text className="text-2xl font-extrabold text-neutral-900" numberOfLines={2}>
              {wishlist.title}
            </Text>
            <View className="flex-row items-center gap-4">
              <View
                className={cn(
                  "size-24 items-center justify-center rounded-2xl",
                  getWishlistAccentClass(wishlist.accent_type),
                )}
              >
                <Icon as={Gift} className="size-9 text-white" />
              </View>
              <View className="gap-2">
                <View className="rounded-xl bg-white px-4 py-2">
                  <Text className="text-base text-neutral-700">
                    {t("open wishes")}{" "}
                    <Text className="font-extrabold text-neutral-900">{wishlist.items_count}</Text>
                  </Text>
                </View>
                <View className="rounded-xl bg-white px-4 py-2">
                  <Text className="text-base text-neutral-700">{t("ready to share")}</Text>
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
              <Text className="text-center text-base font-extrabold text-white">
                {target.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}
