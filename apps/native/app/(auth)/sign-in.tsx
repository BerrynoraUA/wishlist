import { loginWithApple, loginWithFacebook, loginWithGoogle } from "@/api/login";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { Image } from "expo-image";
import { Redirect, useRouter } from "expo-router";
import { MailIcon } from "lucide-react-native";
import * as React from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useGT } from "gt-react-native";

type SocialProvider = "apple" | "facebook" | "google";

export default function SignInScreen() {
  const t = useGT();
  const router = useRouter();
  const { session } = useAuth();
  const [loadingProvider, setLoadingProvider] = React.useState<SocialProvider | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const showAppleSignIn = process.env.EXPO_OS === "ios";

  if (session) {
    return <Redirect href={"/(tabs)/wishlists" as never} />;
  }

  async function handleSocialSignIn(provider: SocialProvider) {
    setError(null);
    setLoadingProvider(provider);

    try {
      if (provider === "apple") {
        await loginWithApple();
      } else if (provider === "facebook") {
        await loginWithFacebook();
      } else {
        await loginWithGoogle();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Social login failed"));
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-[#16111f]"
      contentContainerClassName="min-h-full flex-grow"
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="relative min-h-full flex-1 overflow-hidden bg-[#16111f]">
        <View className="absolute inset-0 bg-linear-[160deg,#16111f_0%,#321633_56%,#641c50_100%]" />
        <View className="min-h-full flex-1 justify-center px-7 py-safe-offset-8">
          <View className="w-full max-w-105 self-center">
            <View className="mb-9 items-center">
              <View className="mb-4 items-center justify-center">
                <Image
                  accessibilityLabel={t("Happy Wishlane mascot pointing to sign-in options")}
                  contentFit="contain"
                  source={require("@/assets/images/mascot/happy-pointing-down.png")}
                  style={{ height: 232, width: 232 }}
                />
              </View>
              <View className="items-center gap-1.5">
                <Text className="text-center text-[36px] font-extrabold leading-10 tracking-tight text-white">
                  {t("Wishlane")}
                </Text>
                <Text className="max-w-80 text-center text-lg font-semibold leading-6 text-white/88">
                  {t("Gifts your people actually want")}
                </Text>
              </View>
            </View>

            <View className="gap-3">
              <AuthChoiceButton
                disabled={loadingProvider !== null}
                icon={<GoogleMark />}
                isLoading={loadingProvider === "google"}
                label={t("Continue with Google")}
                onPress={() => handleSocialSignIn("google")}
                className="bg-[#ea4335]"
              />

              {showAppleSignIn ? (
                <AuthChoiceButton
                  disabled={loadingProvider !== null}
                  icon={<AppleLogo color="#111827" />}
                  indicatorClassName="accent-[#111827]"
                  isLoading={loadingProvider === "apple"}
                  label={t("Continue with Apple")}
                  labelClassName="text-[#111827]"
                  onPress={() => handleSocialSignIn("apple")}
                  className="bg-white"
                />
              ) : null}

              <AuthChoiceButton
                disabled={loadingProvider !== null}
                icon={<FacebookLogo />}
                isLoading={loadingProvider === "facebook"}
                label={t("Continue with Facebook")}
                onPress={() => handleSocialSignIn("facebook")}
                className="bg-[#4267b2]"
              />

              <AuthChoiceButton
                disabled={loadingProvider !== null}
                icon={<Icon as={MailIcon} className="size-5 text-white" />}
                label={t("Sign up with email")}
                onPress={() => router.push("/email-auth" as never)}
                className="bg-white/30"
              />
            </View>

            {error ? (
              <Text
                selectable
                className="mt-5 rounded-2xl bg-white/90 px-4 py-3 text-sm text-danger"
              >
                {error}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function AuthChoiceButton({
  className,
  disabled,
  icon,
  indicatorClassName = "accent-white",
  isLoading = false,
  label,
  labelClassName,
  onPress,
}: {
  className?: string;
  disabled: boolean;
  icon: React.ReactNode;
  indicatorClassName?: string;
  isLoading?: boolean;
  label: string;
  labelClassName?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: isLoading, disabled }}
      className={cn(
        "h-14 flex-row items-center justify-center gap-3 rounded-full px-5 shadow-lg active:scale-[0.98]",
        disabled && "opacity-60",
        className,
      )}
      disabled={disabled}
      onPress={onPress}
    >
      <View className="w-6 items-center">
        {isLoading ? <ActivityIndicator colorClassName={indicatorClassName} size="small" /> : icon}
      </View>
      <Text className={cn("text-base font-semibold text-white", labelClassName)}>{label}</Text>
    </Pressable>
  );
}

function GoogleMark() {
  return <Text className="text-[24px] font-bold leading-6 text-white">G</Text>;
}

function FacebookLogo() {
  return <Text className="text-[24px] font-bold leading-6 text-white">f</Text>;
}

function AppleLogo({ color }: { color: string }) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24">
      <Path
        d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
        fill={color}
      />
    </Svg>
  );
}
