import { loginWithEmail, registerWithEmail } from "@/api/login";
import { AuthWishlistBackground } from "@/components/auth/auth-wishlist-background";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { motionDuration } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { Redirect, useRouter } from "expo-router";
import { ChevronLeftIcon, EyeIcon, EyeOffIcon, GiftIcon } from "lucide-react-native";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";
import { useGT } from "gt-react-native";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const formLayoutTransition = LinearTransition.duration(motionDuration.slow);

type AuthMode = "login" | "register";

type EmailAuthFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

export default function EmailAuthScreen() {
  const t = useGT();
  const router = useRouter();
  const { session } = useAuth();
  const [mode, setMode] = React.useState<AuthMode>("login");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { control, handleSubmit } = useForm<EmailAuthFormValues>({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const isLogin = mode === "login";

  if (session) {
    return <Redirect href={"/(tabs)/wishlists" as never} />;
  }

  async function submitForm(values: EmailAuthFormValues) {
    setError(null);

    const email = values.email.trim();
    if (!email || !values.password) {
      setError(t("Email and password are required."));
      return;
    }

    if (!emailRegex.test(email)) {
      setError(t("Please enter a valid email address."));
      return;
    }

    if (values.password.length < 6) {
      setError(t("Password must be at least 6 characters."));
      return;
    }

    if (!isLogin && values.password !== values.confirmPassword) {
      setError(t("Passwords do not match."));
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, values.password);
      } else {
        await registerWithEmail(email, values.password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Something went wrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-[#16111f]">
      <ScrollView
        className="flex-1 bg-[#16111f]"
        contentContainerClassName="min-h-full flex-grow"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View className="relative min-h-full flex-1 overflow-hidden bg-[#16111f]">
          <AuthWishlistBackground variant="email" />

          <View className="min-h-full flex-1 px-5 py-safe-offset-5">
            <View className="flex-1 justify-center pb-16">
              <Animated.View
                className="w-full max-w-110 self-center"
                layout={formLayoutTransition}
              >
                <Animated.View className="mb-7 items-center gap-3" layout={formLayoutTransition}>
                  <View className="size-14 items-center justify-center rounded-full bg-white/95">
                    <Icon as={GiftIcon} className="size-7 text-[#c0267e]" />
                  </View>
                  <View className="min-h-11 w-full flex-row items-center justify-center gap-2">
                    <Pressable
                      accessibilityLabel={t("Back")}
                      accessibilityRole="button"
                      className="size-10 items-center justify-center rounded-full active:bg-white/10 active:scale-95"
                      hitSlop={12}
                      onPress={() => {
                        if (router.canGoBack()) {
                          router.back();
                          return;
                        }

                        router.replace("/(auth)/sign-in" as never);
                      }}
                    >
                      <Icon as={ChevronLeftIcon} className="size-6 text-white" />
                    </Pressable>
                    <Animated.View
                      key={`email-auth-title-${mode}`}
                      entering={FadeIn.duration(motionDuration.normal)}
                      exiting={FadeOut.duration(motionDuration.fast)}
                    >
                      <Text className="text-center text-[30px] font-extrabold leading-9 text-white">
                        {isLogin ? t("Welcome back") : t("Create your account")}
                      </Text>
                    </Animated.View>
                  </View>
                </Animated.View>

                <Animated.View
                  className="gap-4 rounded-[28px] border border-white/15 bg-[#2a1630]/72 p-5 shadow-lg"
                  layout={formLayoutTransition}
                >
                  <Animated.View className="gap-2" layout={formLayoutTransition}>
                    <FieldLabel>{t("Email")}</FieldLabel>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field: { onChange, value } }) => (
                        <AuthInput
                          autoCapitalize="none"
                          autoComplete="email"
                          keyboardType="email-address"
                          onChangeText={onChange}
                          placeholder={t("you@email.com")}
                          textContentType="emailAddress"
                          value={value}
                        />
                      )}
                    />
                  </Animated.View>

                  <Animated.View className="gap-2" layout={formLayoutTransition}>
                    <FieldLabel>{t("Password")}</FieldLabel>
                    <View className="relative">
                      <Controller
                        control={control}
                        name="password"
                        render={({ field: { onChange, value } }) => (
                          <AuthInput
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            className="pr-12"
                            onChangeText={onChange}
                            placeholder={t("Password")}
                            secureTextEntry={!showPassword}
                            textContentType={isLogin ? "password" : "newPassword"}
                            value={value}
                          />
                        )}
                      />
                      <PasswordToggle
                        label={showPassword ? t("Hide password") : t("Show password")}
                        onPress={() => setShowPassword((visible) => !visible)}
                        visible={showPassword}
                      />
                    </View>
                  </Animated.View>

                  {!isLogin ? (
                    <Animated.View
                      className="gap-2"
                      entering={FadeInDown.duration(motionDuration.normal)}
                      exiting={FadeOutUp.duration(motionDuration.fast)}
                      layout={formLayoutTransition}
                    >
                      <FieldLabel>{t("Confirm password")}</FieldLabel>
                      <View className="relative">
                        <Controller
                          control={control}
                          name="confirmPassword"
                          render={({ field: { onChange, value } }) => (
                            <AuthInput
                              autoComplete="new-password"
                              className="pr-12"
                              onChangeText={onChange}
                              placeholder={t("Confirm password")}
                              secureTextEntry={!showConfirmPassword}
                              textContentType="newPassword"
                              value={value}
                            />
                          )}
                        />
                        <PasswordToggle
                          label={showConfirmPassword ? t("Hide password") : t("Show password")}
                          onPress={() => setShowConfirmPassword((visible) => !visible)}
                          visible={showConfirmPassword}
                        />
                      </View>
                    </Animated.View>
                  ) : null}

                  {error ? (
                    <Text
                      selectable
                      className="rounded-2xl bg-danger-bg px-3 py-2 text-sm text-danger"
                    >
                      {error}
                    </Text>
                  ) : null}

                  <Animated.View layout={formLayoutTransition}>
                    <Button
                      className="h-13 rounded-full bg-[#c0267e] active:bg-[#a91f6e]"
                      disabled={loading}
                      onPress={handleSubmit(submitForm)}
                    >
                      {loading ? (
                        <ActivityIndicator colorClassName="accent-white" size="small" />
                      ) : (
                        <Animated.View
                          key={`email-auth-submit-${mode}`}
                          entering={FadeIn.duration(motionDuration.normal)}
                          exiting={FadeOut.duration(motionDuration.fast)}
                        >
                          <Text className="font-semibold text-white">
                            {isLogin ? t("Log in") : t("Create account")}
                          </Text>
                        </Animated.View>
                      )}
                    </Button>
                  </Animated.View>
                </Animated.View>

                <Animated.View
                  key={`email-auth-switch-${mode}`}
                  className="mt-6 flex-row flex-wrap items-center justify-center gap-1"
                  entering={FadeIn.duration(motionDuration.normal)}
                  exiting={FadeOut.duration(motionDuration.fast)}
                >
                  <Text className="text-sm text-white/75">
                    {isLogin ? t("Don't have an account?") : t("Already have an account?")}
                  </Text>
                  <Pressable
                    accessibilityLabel={isLogin ? t("Create one") : t("Log in")}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => {
                      setError(null);
                      setMode(isLogin ? "register" : "login");
                    }}
                  >
                    <Text className="text-sm font-semibold text-[#f9a8d4]">
                      {isLogin ? t("Create one") : t("Log in")}
                    </Text>
                  </Pressable>
                </Animated.View>
              </Animated.View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-sm font-semibold text-white/82">
      {children}
      <Text className="text-[#f43f5e]"> *</Text>
    </Text>
  );
}

function AuthInput({
  className,
  ...props
}: React.ComponentProps<typeof TextInput> & { className?: string }) {
  return (
    <TextInput
      className={cn(
        "h-13 rounded-full border border-white/16 bg-white/12 px-4 text-base leading-5 text-white",
        className,
      )}
      cursorColorClassName="accent-[#f472b6]"
      placeholderTextColorClassName="accent-white/52"
      selectionColorClassName="accent-[#c0267e]/25"
      {...props}
    />
  );
}

function PasswordToggle({
  label,
  onPress,
  visible,
}: {
  label: string;
  onPress: () => void;
  visible: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      className="absolute right-3 top-0 h-13 items-center justify-center px-2"
      onPress={onPress}
    >
      <Icon as={visible ? EyeOffIcon : EyeIcon} className="size-4.5 text-white/58" />
    </Pressable>
  );
}
