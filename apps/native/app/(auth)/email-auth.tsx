import { loginWithEmail, registerWithEmail } from "@/api/login";
import { AuthMascot } from "@/components/auth/auth-mascot";
import type { MascotVariant } from "@/components/shared/animated-mascot";
import { AuthGiftWrapBackground } from "@/components/auth/auth-gift-wrap-background";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  AnimatedGlassView,
  GLASS_CAPSULE_STYLE,
  HAS_LIQUID_GLASS,
} from "@/components/ui/liquid-glass";
import { MORPH_EASING, MorphText, morphLayoutTransition } from "@/components/ui/morph-text";
import { Text } from "@/components/ui/text";
import { hapticError, hapticSelection, hapticSuccess } from "@/lib/haptics";
import { motionDuration } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { GlassView } from "expo-glass-effect";
import { Redirect, useRouter } from "expo-router";
import { CheckIcon, ChevronLeftIcon, EyeIcon, EyeOffIcon } from "lucide-react-native";
import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  ActivityIndicator,
  AccessibilityInfo,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  FadeOutUp,
  withDelay,
  withTiming,
  type EntryExitAnimationFunction,
} from "react-native-reanimated";
import { useGT } from "gt-react-native";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const formLayoutTransition = morphLayoutTransition;
const CARD_RADIUS = 28;

/** Confirm password drops in under Password as the card grows to make room for it. */
const confirmFieldEntering: EntryExitAnimationFunction = () => {
  "worklet";
  const timing = { duration: 320, easing: MORPH_EASING };
  return {
    initialValues: { opacity: 0, transform: [{ translateY: -10 }] },
    animations: {
      opacity: withDelay(80, withTiming(1, { duration: 220 })),
      transform: [{ translateY: withDelay(80, withTiming(0, timing)) }],
    },
  };
};

type AuthMode = "login" | "register";
type FieldName = "email" | "password" | "confirmPassword";

type EmailAuthFormValues = Record<FieldName, string>;

/** `field` is the input the message belongs under; `null` for errors from the server. */
type FormError = { field: FieldName | null; message: string };

export default function EmailAuthScreen() {
  const t = useGT();
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const { session } = useAuth();
  const [mode, setMode] = React.useState<AuthMode>("login");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<FormError | null>(null);
  const [focusedField, setFocusedField] = React.useState<FieldName | null>(null);
  const emailRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);
  const confirmPasswordRef = React.useRef<TextInput>(null);
  const scrollRef = React.useRef<ScrollView>(null);
  const scrollContentRef = React.useRef<View>(null);
  const scrollViewHeight = React.useRef(0);
  const scrollY = React.useRef(0);
  const passwordSectionRef = React.useRef<View>(null);
  const confirmSectionRef = React.useRef<View>(null);
  const submitRef = React.useRef<View>(null);
  const blurTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboardShowSubscription = React.useRef<ReturnType<typeof Keyboard.addListener> | null>(
    null,
  );
  const { control, handleSubmit } = useForm<EmailAuthFormValues>({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const [password, confirmPassword] = useWatch({
    control,
    name: ["password", "confirmPassword"],
  });
  const isLogin = mode === "login";
  const mascotSize = height < 700 ? 96 : 120;

  React.useEffect(
    () => () => {
      if (blurTimeout.current) clearTimeout(blurTimeout.current);
      keyboardShowSubscription.current?.remove();
    },
    [],
  );

  React.useEffect(() => {
    if (error && process.env.EXPO_OS === "ios") {
      AccessibilityInfo.announceForAccessibility(error.message);
    }
  }, [error]);

  if (session) {
    return <Redirect href={"/(tabs)/wishlists" as never} />;
  }

  function switchMode() {
    hapticSelection();
    setError(null);
    setMode(isLogin ? "register" : "login");
  }

  /**
   * Scrolls just enough to show `target` — the field after the focused one, or the submit
   * button — above the keyboard, so the next step is always in view and one tap away.
   */
  function revealAboveKeyboard(target: React.RefObject<View | null>) {
    const reveal = () =>
      requestAnimationFrame(() => {
        const content = scrollContentRef.current;
        if (!content) return;
        target.current?.measureLayout(content, (_x, y, _width, targetHeight) => {
          const bottom = y + targetHeight + 16;
          if (bottom > scrollY.current + scrollViewHeight.current) {
            scrollRef.current?.scrollTo({ y: bottom - scrollViewHeight.current, animated: true });
          }
        });
      });

    keyboardShowSubscription.current?.remove();
    keyboardShowSubscription.current = null;
    if (Keyboard.isVisible()) {
      reveal();
      return;
    }
    // Wait until the keyboard is up and the screen has shrunk to make room for it.
    keyboardShowSubscription.current = Keyboard.addListener("keyboardDidShow", () => {
      keyboardShowSubscription.current?.remove();
      keyboardShowSubscription.current = null;
      reveal();
    });
  }

  function focusField(field: FieldName) {
    // Moving between fields blurs one just before focusing the next: cancel the pending
    // blur, so nothing tied to focus (like the mascot's pose) flickers in between.
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setFocusedField(field);
    revealAboveKeyboard(
      field === "email"
        ? passwordSectionRef
        : field === "password" && !isLogin
          ? confirmSectionRef
          : submitRef,
    );
  }

  function blurField() {
    blurTimeout.current = setTimeout(() => setFocusedField(null), 100);
  }

  function fieldError(field: FieldName) {
    return error?.field === field ? error.message : null;
  }

  /** Typing into the field an error points at means the user is fixing it: clear it. */
  function clearErrorFor(field: FieldName) {
    if (error && (error.field === field || error.field === null)) setError(null);
  }

  function fail(field: FieldName | null, message: string) {
    hapticError();
    setError({ field, message });
    const refs = { email: emailRef, password: passwordRef, confirmPassword: confirmPasswordRef };
    if (field) refs[field].current?.focus();
  }

  async function submitForm(values: EmailAuthFormValues) {
    setError(null);

    const email = values.email.trim();
    if (!email) return fail("email", t("Enter your email."));
    if (!emailRegex.test(email)) return fail("email", t("Please enter a valid email address."));
    if (!values.password) return fail("password", t("Enter your password."));
    if (values.password.length < MIN_PASSWORD_LENGTH) {
      return fail("password", t("Password must be at least 6 characters."));
    }
    if (!isLogin && values.password !== values.confirmPassword) {
      return fail("confirmPassword", t("Passwords do not match."));
    }

    setLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, values.password);
      } else {
        await registerWithEmail(email, values.password);
      }
      hapticSuccess();
    } catch (err) {
      fail(null, err instanceof Error ? err.message : t("Something went wrong"));
    } finally {
      setLoading(false);
    }
  }

  const submit = handleSubmit(submitForm);
  // The password field being typed in, once it has at least one character.
  const typedPassword =
    focusedField === "password" && password.length > 0
      ? { visible: showPassword }
      : focusedField === "confirmPassword" && confirmPassword.length > 0
        ? { visible: showConfirmPassword }
        : null;
  // Covers its eyes once a password is being typed, and sneaks a look when it's shown.
  const mascotPose: MascotVariant = error
    ? "sad-alone"
    : typedPassword
      ? typedPassword.visible
        ? "peeking"
        : "hands-over-eyes"
      : isLogin
        ? "welcome-wave"
        : "excited-cheer";

  const fields = (
    <>
      <Animated.View className="gap-2" layout={formLayoutTransition}>
        <FieldLabel>{t("Email")}</FieldLabel>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <AuthInput
              ref={emailRef}
              accessibilityLabel={t("Email")}
              autoCapitalize="none"
              autoComplete="email"
              invalid={fieldError("email") != null}
              keyboardType="email-address"
              onBlur={blurField}
              onChangeText={(text) => {
                clearErrorFor("email");
                onChange(text);
              }}
              onFocus={() => focusField("email")}
              onSubmitEditing={() => passwordRef.current?.focus()}
              placeholder={t("you@email.com")}
              returnKeyType="next"
              submitBehavior="submit"
              textContentType="emailAddress"
              value={value}
            />
          )}
        />
        <FieldMessage error={fieldError("email")} />
      </Animated.View>

      <Animated.View layout={formLayoutTransition}>
        <View ref={passwordSectionRef} className="gap-2">
          <FieldLabel>{t("Password")}</FieldLabel>
          <View className="relative">
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <AuthInput
                  ref={passwordRef}
                  accessibilityLabel={t("Password")}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="pe-12"
                  invalid={fieldError("password") != null}
                  onBlur={blurField}
                  onChangeText={(text) => {
                    clearErrorFor("password");
                    onChange(text);
                  }}
                  onFocus={() => focusField("password")}
                  onSubmitEditing={() => {
                    if (isLogin) void submit();
                    else confirmPasswordRef.current?.focus();
                  }}
                  placeholder={t("Password")}
                  returnKeyType={isLogin ? "go" : "next"}
                  secureTextEntry={!showPassword}
                  submitBehavior={isLogin ? "blurAndSubmit" : "submit"}
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
          <FieldMessage
            error={fieldError("password")}
            hint={isLogin ? null : t("At least 6 characters")}
            hintMet={password.length >= MIN_PASSWORD_LENGTH}
          />
        </View>
      </Animated.View>

      {!isLogin ? (
        <Animated.View
          entering={confirmFieldEntering}
          exiting={FadeOutUp.duration(motionDuration.fast)}
          layout={formLayoutTransition}
        >
          <View ref={confirmSectionRef} className="gap-2">
            <FieldLabel>{t("Confirm password")}</FieldLabel>
            <View className="relative">
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, value } }) => (
                  <AuthInput
                    ref={confirmPasswordRef}
                    accessibilityLabel={t("Confirm password")}
                    autoComplete="new-password"
                    className="pe-12"
                    invalid={fieldError("confirmPassword") != null}
                    onBlur={blurField}
                    onChangeText={(text) => {
                      clearErrorFor("confirmPassword");
                      onChange(text);
                    }}
                    onFocus={() => focusField("confirmPassword")}
                    onSubmitEditing={() => void submit()}
                    placeholder={t("Confirm password")}
                    returnKeyType="go"
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
            <FieldMessage
              error={fieldError("confirmPassword")}
              hint={t("Passwords match")}
              hintMet={confirmPassword.length > 0 && confirmPassword === password}
            />
          </View>
        </Animated.View>
      ) : null}

      {error && error.field === null ? (
        <Animated.View
          entering={FadeIn.duration(motionDuration.normal)}
          exiting={FadeOut.duration(motionDuration.fast)}
          layout={formLayoutTransition}
        >
          <Text
            selectable
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            className="rounded-2xl bg-danger-bg px-3 py-2 text-sm text-danger"
          >
            {error.message}
          </Text>
        </Animated.View>
      ) : null}

      <Animated.View layout={formLayoutTransition}>
        <View ref={submitRef}>
          <Button
            accessibilityLabel={isLogin ? t("Log in") : t("Create account")}
            accessibilityState={{ busy: loading, disabled: loading }}
            className="h-auto min-h-13 rounded-full bg-[#c0267e] active:bg-[#a91f6e]"
            disabled={loading}
            onPress={submit}
          >
            {loading ? (
              <ActivityIndicator colorClassName="accent-white" size="small" />
            ) : (
              <MorphText
                className="font-semibold text-white"
                text={isLogin ? t("Log in") : t("Create account")}
              />
            )}
          </Button>
        </View>
      </Animated.View>
    </>
  );

  return (
    <View className="flex-1 bg-[#16111f]">
      {/* Pinned to the full screen, outside the keyboard-avoiding tree: when the keyboard opens
          the form shrinks and scrolls, but the backdrop keeps its size and never re-lays out —
          no flash, and no bare strip where the keyboard is. */}
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, width, height }}>
        <AuthGiftWrapBackground variant="email" />
      </View>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="min-h-full flex-grow"
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          onLayout={(event) => {
            scrollViewHeight.current = event.nativeEvent.layout.height;
          }}
          onScroll={(event) => {
            scrollY.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          <View ref={scrollContentRef} className="relative min-h-full flex-1">
            <View className="min-h-full flex-1 px-5 py-safe-offset-5">
              <View className="flex-1 justify-center pb-16">
                <Animated.View
                  className="w-full max-w-110 self-center"
                  layout={formLayoutTransition}
                >
                  <Animated.View className="mb-2" layout={formLayoutTransition}>
                    <AuthMascot size={mascotSize} variant={mascotPose} />
                  </Animated.View>

                  <Animated.View className="mb-7 items-center gap-3" layout={formLayoutTransition}>
                    <View className="min-h-11 w-full flex-row items-center justify-center gap-2">
                      <Animated.View layout={formLayoutTransition}>
                        <BackButton
                          label={t("Back")}
                          onPress={() => {
                            if (router.canGoBack()) {
                              router.back();
                              return;
                            }

                            router.replace("/(auth)/sign-in" as never);
                          }}
                        />
                      </Animated.View>
                      <MorphText
                        accessible
                        accessibilityLabel={isLogin ? t("Welcome back") : t("Create your account")}
                        accessibilityRole="header"
                        className="text-center text-[30px] font-extrabold leading-9 text-white"
                        text={isLogin ? t("Welcome back") : t("Create your account")}
                        wordGap={8}
                      />
                    </View>
                  </Animated.View>

                  {HAS_LIQUID_GLASS ? (
                    <AnimatedGlassView
                      colorScheme="dark"
                      glassEffectStyle="regular"
                      layout={formLayoutTransition}
                      style={{ borderRadius: CARD_RADIUS }}
                    >
                      <View className="gap-4 p-5">{fields}</View>
                    </AnimatedGlassView>
                  ) : (
                    <Animated.View
                      className="gap-4 rounded-[28px] border border-white/15 bg-[#2a1630]/72 p-5 shadow-lg"
                      layout={formLayoutTransition}
                    >
                      {fields}
                    </Animated.View>
                  )}

                  <Animated.View
                    className="mt-6 flex-row flex-wrap items-center justify-center gap-1"
                    layout={formLayoutTransition}
                  >
                    <MorphText
                      accessible
                      accessibilityLabel={
                        isLogin ? t("Don't have an account?") : t("Already have an account?")
                      }
                      className="text-sm text-white/75"
                      text={isLogin ? t("Don't have an account?") : t("Already have an account?")}
                    />
                    <Animated.View layout={formLayoutTransition}>
                      <Pressable
                        accessibilityLabel={isLogin ? t("Create one") : t("Log in")}
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={switchMode}
                      >
                        <MorphText
                          className="text-sm font-semibold text-[#f9a8d4]"
                          text={isLogin ? t("Create one") : t("Log in")}
                        />
                      </Pressable>
                    </Animated.View>
                  </Animated.View>
                </Animated.View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** On iOS 26 a liquid glass circle, like the system's own back button. */
function BackButton({ label, onPress }: { label: string; onPress: () => void }) {
  if (HAS_LIQUID_GLASS) {
    return (
      <GlassView
        isInteractive
        colorScheme="dark"
        glassEffectStyle="regular"
        style={GLASS_CAPSULE_STYLE}
      >
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="button"
          className="size-11 items-center justify-center"
          hitSlop={8}
          onPress={onPress}
        >
          <Icon as={ChevronLeftIcon} className="size-6 text-white" />
        </Pressable>
      </GlassView>
    );
  }

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      className="size-10 items-center justify-center rounded-full active:bg-white/10 active:scale-95"
      hitSlop={12}
      onPress={onPress}
    >
      <Icon as={ChevronLeftIcon} className="size-6 text-white" />
    </Pressable>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text className="text-sm font-semibold text-white/82">{children}</Text>;
}

/**
 * The line under a field: its error when it has one, otherwise an optional live requirement
 * that ticks green once it's met.
 */
function FieldMessage({
  error,
  hint,
  hintMet = false,
}: {
  error: string | null;
  hint?: string | null;
  hintMet?: boolean;
}) {
  if (error) {
    return (
      <Animated.View
        entering={FadeIn.duration(motionDuration.normal)}
        exiting={FadeOut.duration(motionDuration.fast)}
        layout={formLayoutTransition}
      >
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          className="px-4 text-[13px] text-[#fda4af]"
        >
          {error}
        </Text>
      </Animated.View>
    );
  }

  if (!hint) return null;

  return (
    <Animated.View
      accessible
      accessibilityLabel={hint}
      accessibilityState={{ checked: hintMet }}
      className="flex-row items-center gap-1.5 px-4"
      entering={FadeIn.duration(motionDuration.normal)}
      exiting={FadeOut.duration(motionDuration.fast)}
      layout={formLayoutTransition}
    >
      <View
        className={cn(
          "size-4 items-center justify-center rounded-full border",
          hintMet ? "border-[#4ade80] bg-[#4ade80]" : "border-white/35",
        )}
      >
        {hintMet ? <Icon as={CheckIcon} className="size-3 text-[#16111f]" strokeWidth={3} /> : null}
      </View>
      <Text className={cn("text-[13px]", hintMet ? "text-[#86efac]" : "text-white/60")}>
        {hint}
      </Text>
    </Animated.View>
  );
}

function AuthInput({
  className,
  invalid = false,
  ref,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  className?: string;
  invalid?: boolean;
  ref?: React.Ref<TextInput>;
}) {
  const inputRef = React.useRef<TextInput>(null);
  React.useImperativeHandle(ref, () => inputRef.current as TextInput, []);

  // The pill centers a field only as tall as its text: a taller iOS field draws its text
  // below center. Tapping anywhere on the pill still focuses it.
  return (
    <Pressable
      accessible={false}
      className={cn(
        "min-h-13 justify-center rounded-full border bg-white/12",
        invalid ? "border-[#fb7185]" : "border-white/16",
      )}
      onPress={() => inputRef.current?.focus()}
    >
      <TextInput
        ref={inputRef}
        className={cn(
          // No line height (so `text-[16px]`, not `text-base`, which sets one too): on a
          // single-line iOS field a line height wraps overflowing text, like a long password,
          // onto a second line instead of scrolling it.
          "px-4 py-0 text-[16px] text-white",
          className,
        )}
        cursorColorClassName="accent-[#f472b6]"
        placeholderTextColorClassName="accent-white/52"
        selectionColorClassName="accent-[#c0267e]/25"
        {...props}
      />
    </Pressable>
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
      className="absolute end-1 inset-y-0 min-h-13 min-w-11 items-center justify-center px-2"
      onPress={onPress}
    >
      <Icon as={visible ? EyeOffIcon : EyeIcon} className="size-4.5 text-white/58" />
    </Pressable>
  );
}
