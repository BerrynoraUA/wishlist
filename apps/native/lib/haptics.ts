import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Semantic haptics for the app. Call these instead of `expo-haptics` directly —
 * each one picks the right effect per platform.
 *
 * iOS uses the Taptic Engine APIs (`impactAsync` / `selectionAsync` /
 * `notificationAsync`). Android goes through `performAndroidHapticsAsync`,
 * which maps to the system's `HapticFeedbackConstants`: unlike the `Vibrator`
 * fallback it needs no `VIBRATE` permission, respects the user's touch-feedback
 * setting, and feels like the rest of the OS instead of a buzz.
 *
 * Some Android constants only exist on newer API levels (Confirm/Reject need
 * API 30, Toggle_* need 34) while the app ships minSdk 24, so every Android
 * effect declares a fallback that has been around since the early API levels.
 *
 * Haptics are decoration: every call is fire-and-forget and swallows failures,
 * so an unsupported device or a missing motor can never break an interaction.
 */

type AndroidEffect = {
  preferred: Haptics.AndroidHaptics;
  fallback: Haptics.AndroidHaptics;
};

function fire(ios: () => Promise<void>, android: AndroidEffect) {
  if (Platform.OS === "ios") {
    void ios().catch(() => {});
    return;
  }

  if (Platform.OS !== "android") return;

  void Haptics.performAndroidHapticsAsync(android.preferred).catch(() => {
    void Haptics.performAndroidHapticsAsync(android.fallback).catch(() => {});
  });
}

/** Moving between choices: tabs, filter chips, segmented controls, pickers. */
export function hapticSelection() {
  fire(() => Haptics.selectionAsync(), {
    preferred: Haptics.AndroidHaptics.Clock_Tick,
    fallback: Haptics.AndroidHaptics.Virtual_Key,
  });
}

/** Flipping a switch on or off. */
export function hapticToggle(enabled: boolean) {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), {
    preferred: enabled ? Haptics.AndroidHaptics.Toggle_On : Haptics.AndroidHaptics.Toggle_Off,
    fallback: Haptics.AndroidHaptics.Virtual_Key,
  });
}

/** A long press that opened something — a context menu or a drag. */
export function hapticLongPress() {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), {
    preferred: Haptics.AndroidHaptics.Long_Press,
    fallback: Haptics.AndroidHaptics.Virtual_Key,
  });
}

/** An action landed: reserved, bought, created, saved. */
export function hapticSuccess() {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), {
    preferred: Haptics.AndroidHaptics.Confirm,
    fallback: Haptics.AndroidHaptics.Virtual_Key,
  });
}

/** A destructive step the user confirmed, or something that needs attention. */
export function hapticWarning() {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning), {
    preferred: Haptics.AndroidHaptics.Reject,
    fallback: Haptics.AndroidHaptics.Long_Press,
  });
}

/** The action failed. */
export function hapticError() {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), {
    preferred: Haptics.AndroidHaptics.Reject,
    fallback: Haptics.AndroidHaptics.Long_Press,
  });
}
