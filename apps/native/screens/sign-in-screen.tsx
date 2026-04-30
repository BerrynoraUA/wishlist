import { loginWithApple, loginWithEmail, loginWithGoogle } from "@/api/login";
import { AnimatedShadowButton } from "@/components/ui/buttons/AnimatedShadowButton";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { EyeIcon, EyeOffIcon, GiftIcon } from "lucide-react-native";
import * as React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const testimonials = [
  {
    quote: '"Wishlane made birthday planning with our whole family effortless."',
    name: "Maya",
    role: "Gift organizer",
    initial: "M",
    avatarClassName: "bg-[#fde7f3] text-[#c0267e]",
  },
  {
    quote: '"I always know what friends actually want now. No more guessing."',
    name: "Noah",
    role: "Friend group hero",
    initial: "N",
    avatarClassName: "bg-[#e0f2fe] text-[#2563eb]",
  },
  {
    quote: '"Shared wishlists turned our holidays from chaotic to calm."',
    name: "Ava",
    role: "Holiday planner",
    initial: "A",
    avatarClassName: "bg-[#fef3c7] text-[#d97706]",
  },
] as const;

export function SignInScreen() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [socialLoading, setSocialLoading] = React.useState<"apple" | "google" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [testimonialIndex, setTestimonialIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIndex((index) => (index + 1) % testimonials.length);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const testimonial = testimonials[testimonialIndex];
  const isBusy = loading || socialLoading !== null;
  const showAppleSignIn = Platform.OS === "ios";

  async function handleSubmit() {
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(trimmedEmail, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setSocialLoading("google");

    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Social login failed");
    } finally {
      setSocialLoading(null);
    }
  }

  async function handleAppleSignIn() {
    setError(null);
    setSocialLoading("apple");

    try {
      await loginWithApple();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apple login failed");
    } finally {
      setSocialLoading(null);
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1">
      <ScrollView
        className="flex-1 bg-[#faf7f8] dark:bg-[#0c0c0f]"
        contentContainerClassName="min-h-full flex-grow md:flex-row"
        keyboardShouldPersistTaps="handled"
      >
        <VisualPanel testimonial={testimonial} />

        <View className="relative min-h-full flex-1 justify-center overflow-hidden bg-gradient-to-b from-[#fffafa] to-[#faf7f8] px-4 py-safe-offset-6 dark:from-[#121215] dark:to-[#0c0c0f] sm:px-6 md:bg-[#faf7f8] md:px-10 dark:md:bg-[#0c0c0f]">
          <View className="absolute -right-20 -top-28 size-80 rounded-full bg-[#c0267e]/10" />
          <View className="absolute -bottom-28 -left-16 size-96 rounded-full bg-[#c0267e]/10" />

          <View className="relative z-10 w-full max-w-[420px] self-center">
            <View className="mb-7 gap-2">
              <View className="self-start rounded-full bg-[#fde7f3] px-3.5 py-1.5 dark:bg-[#e052a0]/15">
                <Text className="text-[13px] font-semibold text-[#c0267e] dark:text-[#e052a0]">
                  Welcome back
                </Text>
              </View>
              <Text className="text-[32px] font-extrabold leading-9 tracking-[-1px] text-[#111827] dark:text-[#f0f0f2]">
                Sign in to your account
              </Text>
              <Text className="text-[15px] leading-6 text-[#6b7280] dark:text-[#9ca3af]">
                Enter your credentials to continue where you left off.
              </Text>
            </View>

            <View className="gap-0 rounded-[24px] border border-[#f3e8ee]/70 bg-white/75 p-5 shadow-lg dark:border-[#27272d]/70 dark:bg-[#161619]/75 sm:p-7">
              <View className="gap-3">
                <FieldLabel>Email</FieldLabel>
                <AuthInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="you@email.com"
                  textContentType="emailAddress"
                  value={email}
                />

                <FieldLabel>Password</FieldLabel>
                <View className="relative">
                  <AuthInput
                    autoComplete="current-password"
                    onChangeText={setPassword}
                    placeholder="Password"
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    value={password}
                    className="pr-12"
                  />
                  <Pressable
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    accessibilityRole="button"
                    className="absolute right-3 top-0 h-12 items-center justify-center px-1"
                    onPress={() => setShowPassword((visible) => !visible)}
                  >
                    <Icon
                      as={showPassword ? EyeOffIcon : EyeIcon}
                      className="size-[18px] text-[#9ca3af]"
                    />
                  </Pressable>
                </View>

                {error ? (
                  <Text selectable className="mt-1 text-[13px] text-[#dc2626]">
                    {error}
                  </Text>
                ) : null}

                <View className="mt-2">
                  <AnimatedShadowButton
                    accessibilityLabel="Sign in"
                    isDisabled={isBusy}
                    isLoading={loading}
                    onPress={handleSubmit}
                    title="Sign in"
                  />
                </View>
              </View>

              <View className="mt-7 gap-[18px]">
                <View className="flex-row items-center gap-3">
                  <View className="h-px flex-1 bg-[#e5e7eb] dark:bg-[#374151]" />
                  <Text className="text-xs uppercase tracking-[1px] text-[#9ca3af] dark:text-[#6b7280]">
                    or
                  </Text>
                  <View className="h-px flex-1 bg-[#e5e7eb] dark:bg-[#374151]" />
                </View>

                <View className="flex-row justify-center gap-5">
                  <SocialIconButton
                    accessibilityLabel="Continue with Google"
                    disabled={isBusy}
                    onPress={handleGoogleSignIn}
                  >
                    {socialLoading === "google" ? (
                      <ActivityIndicator colorClassName="accent-[#111827]" size="small" />
                    ) : (
                      <GoogleLogo />
                    )}
                  </SocialIconButton>
                  {showAppleSignIn ? (
                    <SocialIconButton
                      accessibilityLabel="Continue with Apple"
                      buttonClassName="border-black bg-black dark:border-white dark:bg-white"
                      disabled={isBusy}
                      onPress={handleAppleSignIn}
                    >
                      {socialLoading === "apple" ? (
                        <ActivityIndicator colorClassName="accent-white" size="small" />
                      ) : (
                        <AppleLogo />
                      )}
                    </SocialIconButton>
                  ) : null}
                </View>
              </View>
            </View>

            <View className="mt-6 flex-row flex-wrap justify-center gap-1">
              <Text className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                Don't have an account?
              </Text>
              <Text className="text-sm font-semibold text-[#c0267e] dark:text-[#e052a0]">
                Create one
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mt-1 text-xs font-medium text-[#6b7280] dark:text-[#9ca3af]">
      {children}
      <Text className="text-[#dc2626]"> *</Text>
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
        "h-12 rounded-xl border-[1.5px] border-[#e5e7eb] bg-white px-3.5 text-base leading-5 text-[#111827] focus:border-[#c0267e] dark:border-[#374151] dark:bg-[#1c1c20] dark:text-[#f0f0f2] dark:focus:border-[#e052a0]",
        className,
      )}
      cursorColorClassName="accent-[#c0267e] dark:accent-[#e052a0]"
      placeholderTextColorClassName="accent-[#9ca3af] dark:accent-[#6b7280]"
      selectionColorClassName="accent-[#c0267e]/20 dark:accent-[#e052a0]/20"
      {...props}
    />
  );
}

function VisualPanel({ testimonial }: { testimonial: (typeof testimonials)[number] }) {
  return (
    <View className="relative hidden flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-[#fffafa] via-[#fdf2f8] to-[#fde7f3] px-10 py-10 dark:from-[#18141a] dark:via-[#1c1320] dark:to-[#201527] md:flex">
      <View className="absolute -right-24 -top-28 size-[500px] rounded-full bg-[#fde7f3] opacity-50 dark:bg-[#e052a0]/15" />
      <View className="absolute -bottom-20 -left-16 size-[350px] rounded-full bg-[#e0f2fe] opacity-50 dark:bg-[#60a5fa]/15" />
      <View className="absolute left-1/2 top-1/2 size-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fef3c7] opacity-50 dark:bg-[#fdba74]/10" />

      <View className="z-10 w-full max-w-[400px] items-center">
        <View className="mb-6 flex-row items-center gap-2">
          <Icon as={GiftIcon} className="size-5 text-[#c0267e] dark:text-[#e052a0]" />
          <Text className="text-2xl font-bold text-[#111827] dark:text-[#f0f0f2]">Wishlane</Text>
        </View>

        <Text className="text-center text-[40px] font-extrabold leading-[46px] tracking-[-1px] text-[#111827] dark:text-[#f0f0f2]">
          Welcome back to{"\n"}
          <Text className="text-[40px] font-extrabold italic text-[#c0267e] dark:text-[#e052a0]">
            Wishlane
          </Text>
        </Text>

        <Text className="mb-8 mt-3 text-center text-base leading-7 text-[#6b7280] dark:text-[#9ca3af]">
          Sign in to manage your wishlists, see what friends are wishing for, and never miss the
          perfect gift.
        </Text>

        <View className="relative w-full max-w-[340px]">
          <View className="rounded-[24px] border border-[#f3e8ee] bg-white p-[18px] shadow-lg dark:border-[#27272d] dark:bg-[#161619]">
            <View className="mb-3.5 flex-row items-center gap-3">
              <View className="size-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#c0267e] to-[#dd5ba4] shadow-brand">
                <Icon as={GiftIcon} className="size-[18px] text-white" />
              </View>
              <View>
                <Text className="text-[15px] font-bold text-[#111827] dark:text-[#f0f0f2]">
                  Birthday Wishes
                </Text>
                <Text className="text-[11px] text-[#6b7280] dark:text-[#9ca3af]">
                  8 items - March 15
                </Text>
              </View>
            </View>

            <View className="gap-1.5">
              <MockupItem
                icon="HP"
                iconClassName="bg-[#fde7f3]"
                name="Wireless Headphones"
                price="$149.99"
              />
              <MockupItem
                icon="BK"
                iconClassName="bg-[#e0f2fe]"
                name="Design Anthology"
                price="$34.00"
              />
              <MockupItem
                icon="CF"
                iconClassName="bg-[#fef3c7]"
                name="Ceramic Pour-Over"
                price="$62.00"
              />
            </View>
          </View>

          <FloatingBadge className="-right-3.5 -top-2.5" icon="♡" label="Item reserved!" />
          <FloatingBadge className="-left-5 bottom-3.5" icon="↗" label="Link shared" />
        </View>

        <View className="mt-7 items-center">
          <Text className="mb-1.5 text-sm tracking-[2px] text-[#f59e0b]">★★★★★</Text>
          <Text className="text-center text-sm italic leading-6 text-[#374151] dark:text-[#d1d5db]">
            {testimonial.quote}
          </Text>
          <View className="mt-2.5 flex-row items-center justify-center gap-2.5">
            <View
              className={cn(
                "size-7 items-center justify-center rounded-full",
                testimonial.avatarClassName,
              )}
            >
              <Text className="text-xs font-bold">{testimonial.initial}</Text>
            </View>
            <Text className="text-xs font-semibold text-[#111827] dark:text-[#f0f0f2]">
              {testimonial.name}
            </Text>
            <Text className="text-[11px] text-[#6b7280] dark:text-[#9ca3af]">
              {testimonial.role}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function MockupItem({
  icon,
  iconClassName,
  name,
  price,
}: {
  icon: string;
  iconClassName: string;
  name: string;
  price: string;
}) {
  return (
    <View className="flex-row items-center gap-2.5 rounded-md bg-[#faf7f8] p-2 dark:bg-[#1c1c20]">
      <View className={cn("size-8 items-center justify-center rounded-md", iconClassName)}>
        <Text className="text-[10px] font-bold text-[#111827]">{icon}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-xs font-semibold text-[#111827] dark:text-[#f0f0f2]">{name}</Text>
        <Text className="text-[11px] text-[#6b7280] dark:text-[#9ca3af]">{price}</Text>
      </View>
    </View>
  );
}

function FloatingBadge({
  className,
  icon,
  label,
}: {
  className: string;
  icon: string;
  label: string;
}) {
  return (
    <View
      className={cn(
        "absolute flex-row items-center gap-2 rounded-2xl border border-[#f3e8ee] bg-white px-3.5 py-2 shadow-lg dark:border-[#27272d] dark:bg-[#161619]",
        className,
      )}
    >
      <Text className="text-xs font-semibold text-[#111827] dark:text-[#f0f0f2]">{icon}</Text>
      <Text className="text-xs font-semibold text-[#111827] dark:text-[#f0f0f2]">{label}</Text>
    </View>
  );
}

function SocialIconButton({
  accessibilityLabel,
  buttonClassName,
  children,
  disabled,
  onPress,
}: {
  accessibilityLabel: string;
  buttonClassName?: string;
  children: React.ReactNode;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className={cn(
        "size-[52px] items-center justify-center rounded-full border-[1.5px] border-[#e5e7eb] bg-white active:scale-95 dark:border-[#374151] dark:bg-[#1c1c20]",
        disabled && "opacity-45",
        buttonClassName,
      )}
      disabled={disabled}
      onPress={onPress}
    >
      {children}
    </Pressable>
  );
}

function GoogleLogo() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function AppleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
        fill="white"
      />
    </Svg>
  );
}
