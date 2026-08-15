import { hapticSuccess } from "@/lib/haptics";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Icon } from "@/components/ui/icon";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { getWishlistAccentClass } from "@/lib/wishlists";
import type { Wishlist } from "@wishlist/backend/types/wishlist";
import { useGT } from "gt-react-native";
import { Copy, Gift, MoreHorizontal, X, type LucideIcon } from "lucide-react-native";
import * as React from "react";
import { Linking, Platform, Share, useWindowDimensions, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import type ReactNativeShare from "react-native-share";
import { captureRef } from "react-native-view-shot";
import Svg, { Circle, Path, Rect } from "react-native-svg";

type ShareTarget = "whatsapp" | "copy" | "more" | "message" | "story" | "telegram";

const INSTAGRAM_ICON_SOURCE = require("@/assets/images/Instagram_icon.png");

// Meta requires a Facebook App ID to share to Stories (mandatory since January 2023);
// without one Instagram refuses the intent and shows "app doesn't support this".
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? "";

// Brand gradient behind the shared card. Instagram only accepts hex, while the theme
// defines `--color-brand` in oklch — these are that token converted, dark shade on top.
const STORY_BACKGROUND_TOP = "#E052A0";
const STORY_BACKGROUND_BOTTOM = "#C0267E";

type NativeShare = { default: typeof ReactNativeShare; Social: { InstagramStories: string } };
let nativeShare: NativeShare | null | undefined;

/**
 * `react-native-share` calls `TurboModuleRegistry.getEnforcing("RNShare")` while its
 * module body runs, which throws outright when the native side is missing. Importing it
 * at the top of this file would therefore take down the whole wishlist screen, not just
 * the share sheet — and an OTA update can legitimately land on a binary built before the
 * dependency existed. Resolve it lazily so that case degrades to the system share sheet.
 */
function getNativeShare(): NativeShare | null {
  if (nativeShare === undefined) {
    try {
      nativeShare = require("react-native-share") as NativeShare;
    } catch {
      nativeShare = null;
    }
  }

  return nativeShare;
}

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
  const previewRef = React.useRef<View>(null);
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
    icon?: LucideIcon;
    brandIcon?: ShareTarget;
    iconClassName: string;
    tileClassName: string;
  }> = [
    {
      key: "whatsapp",
      label: t("WhatsApp"),
      brandIcon: "whatsapp",
      iconClassName: "text-white",
      tileClassName: "bg-transparent",
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
      brandIcon: "message",
      iconClassName: "text-white",
      tileClassName: "bg-transparent",
    },
    {
      key: "story",
      label: t("Story"),
      brandIcon: "story",
      iconClassName: "text-white",
      tileClassName: "bg-transparent",
    },
    {
      key: "telegram",
      label: t("Telegram"),
      brandIcon: "telegram",
      iconClassName: "text-white",
      tileClassName: "bg-transparent",
    },
  ];
  const targetRows = [targets.slice(0, 3), targets.slice(3)];

  async function dismiss() {
    await sheetRef.current?.dismiss();
  }

  /**
   * Deliberately does not use `Linking.canOpenURL` as a gate. Custom schemes have to be
   * allow-listed to be *queried* (`LSApplicationQueriesSchemes` on iOS, `<queries>` on
   * Android 11+), so `canOpenURL` reports false for installed apps like Telegram and
   * Instagram. Launching is not filtered, so opening and catching the rejection is both
   * accurate and free of native config.
   */
  async function openUrl(url: string, fallback?: string) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // No app registered for the scheme — fall through.
    }

    if (fallback) {
      await Linking.openURL(fallback);
    } else {
      await Share.share({ title: activeWishlist.title, message: shareMessage, url: activeLink });
    }
  }

  /**
   * Opens the Instagram Stories composer with the preview card placed as a sticker over
   * the brand gradient, rather than as a full-bleed background — the card is card-shaped,
   * and a background image would be cropped to 9:16.
   *
   * Stories cannot carry a tappable link unless the account is verified, so the wishlist
   * URL goes to the clipboard for the user to drop in as a link sticker.
   */
  async function shareToInstagramStory() {
    const share = getNativeShare();

    if (!FACEBOOK_APP_ID || !share) {
      await Share.share({ title: activeWishlist.title, message: shareMessage, url: activeLink });
      return;
    }

    try {
      const stickerImage = await captureRef(previewRef, {
        format: "png",
        quality: 1,
        result: "data-uri",
      });

      await Clipboard.setStringAsync(activeLink);
      await share.default.shareSingle({
        social: share.Social.InstagramStories as never,
        appId: FACEBOOK_APP_ID,
        stickerImage,
        backgroundTopColor: STORY_BACKGROUND_TOP,
        backgroundBottomColor: STORY_BACKGROUND_BOTTOM,
      });
    } catch {
      // Instagram missing, or the user backed out of the composer. Neither deserves an
      // error, but falling back keeps the tile from feeling dead when the app is absent.
      await Share.share({ title: activeWishlist.title, message: shareMessage, url: activeLink });
    }
  }

  async function handleTargetPress(target: ShareTarget) {
    const encodedLink = encodeURIComponent(activeLink);
    const encodedMessage = encodeURIComponent(shareMessage);

    switch (target) {
      case "copy":
        await Clipboard.setStringAsync(activeLink);
        hapticSuccess();
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
        await shareToInstagramStory();
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
      <View className="gap-5 px-4 pt-8">
        <View className="flex-row items-center justify-center">
          <View className="items-center gap-1 px-12">
            <Text className="text-xl font-extrabold text-text">{t("Share this wishlist")}</Text>
          </View>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={t("Close")}
            className="absolute end-0 size-10 items-center justify-center rounded-full"
            onPress={dismiss}
          >
            <Icon as={X} className="size-8 text-text" />
          </AnimatedPressable>
        </View>

        <View
          ref={previewRef}
          collapsable={false}
          className="overflow-hidden rounded-[24px] border border-border-subtle bg-card-bg"
        >
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
                    {t("Gift ideas")}{" "}
                    <Text className="font-extrabold text-text">{wishlist.items_count}</Text>
                  </Text>
                </View>
                <View className="rounded-xl bg-bg-elevated px-3 py-2">
                  <Text className="text-sm text-text-muted">{t("View and reserve")}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className="gap-y-7">
          {targetRows.map((row) => (
            <View
              key={row.map((target) => target.key).join("-")}
              className="flex-row justify-center gap-x-8"
            >
              {row.map((target) => (
                <View key={target.key} className="w-20 items-center gap-2">
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
                    {target.brandIcon ? (
                      <ShareBrandIcon target={target.brandIcon} />
                    ) : target.icon ? (
                      <Icon as={target.icon} className={cn("size-9", target.iconClassName)} />
                    ) : null}
                  </AnimatedPressable>
                  <Text
                    className="text-center text-base font-extrabold text-text"
                    numberOfLines={1}
                  >
                    {target.label}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}

function ShareBrandIcon({ target }: { target: ShareTarget }) {
  switch (target) {
    case "whatsapp":
      return (
        <Svg width={64} height={64} viewBox="0 0 64 64" fill="none">
          <Rect width={64} height={64} rx={18} fill="#25D366" />
          <Path
            d="M16.9 48.55l2.25-8.14A16.78 16.78 0 0116.9 32c0-9.09 6.9-16.47 15.4-16.47 8.52 0 15.42 7.38 15.42 16.47s-6.9 16.47-15.42 16.47a14.87 14.87 0 01-7.37-1.96l-8.03 2.04z"
            fill="none"
            stroke="white"
            strokeWidth={4.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M27.52 23.55c-.34-.75-.7-.77-1.02-.78h-.9c-.31 0-.82.12-1.25.58-.43.47-1.63 1.6-1.63 3.88 0 2.29 1.67 4.5 1.9 4.82.24.31 3.24 5.16 8.03 7.02 3.98 1.56 4.8 1.25 5.66 1.16.86-.08 2.8-1.14 3.19-2.25.4-1.1.4-2.05.28-2.25-.13-.2-.46-.31-.95-.55-.48-.24-2.86-1.41-3.3-1.57-.44-.16-.76-.24-1.08.24-.32.47-1.25 1.57-1.54 1.88-.28.32-.56.36-1.05.12-.49-.24-2.03-.74-3.86-2.37-1.43-1.27-2.39-2.83-2.67-3.31-.29-.47-.04-.74.2-.98.23-.21.49-.55.73-.84.24-.28.32-.47.49-.79.16-.31.08-.59-.04-.83-.12-.24-1.08-2.6-1.47-3.54z"
            fill="white"
          />
        </Svg>
      );
    case "message":
      return (
        <Svg width={64} height={64} viewBox="0 0 64 64" fill="none">
          <Rect width={64} height={64} rx={18} fill="#34C759" />
          <Path
            d="M32 15.4c-11.16 0-20.2 7.49-20.2 16.72 0 5.19 2.88 9.84 7.44 12.87l-1.01 4.91c-.13.64.58 1.12 1.12.74l5.62-3.73A24.42 24.42 0 0032 47.88c11.16 0 20.2-7.49 20.2-16.72S43.16 15.4 32 15.4z"
            fill="white"
          />
          <Circle cx={25.25} cy={31.75} r={1.95} fill="#34C759" />
          <Circle cx={32} cy={31.75} r={1.95} fill="#34C759" />
          <Circle cx={38.75} cy={31.75} r={1.95} fill="#34C759" />
        </Svg>
      );
    case "story":
      return <StyledImage source={INSTAGRAM_ICON_SOURCE} contentFit="cover" className="size-16" />;
    case "telegram":
      return (
        <Svg width={64} height={64} viewBox="0 0 64 64" fill="none">
          <Circle cx={32} cy={32} r={32} fill="#2AABEE" />
          <Path
            d="M48.15 18.12c.9-.36 1.76.43 1.5 1.36L42.9 45.37c-.24.92-1.38 1.26-2.08.62L30.55 36.5l-5.3 5.11c-.69.67-1.84.31-2.04-.63l-2.02-9.06-7.78-2.43c-.95-.3-1.04-1.62-.14-2.03l34.88-9.34z"
            fill="white"
          />
          <Path
            d="M23.72 31.92l18.45-10.76c.36-.21.73.27.42.55L28.5 35.47l-.5 6.24-4.28-9.79z"
            fill="#BFE9FF"
          />
        </Svg>
      );
    default:
      return null;
  }
}
