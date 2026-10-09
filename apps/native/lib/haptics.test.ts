import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { preferencesStorage } from "@/lib/storage";
import {
  hapticError,
  hapticImpact,
  hapticLongPress,
  hapticPoke,
  hapticSelection,
  hapticSuccess,
  hapticToggle,
  hapticWarning,
} from "./haptics";

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("@/lib/storage", () => ({
  PREFERENCE_KEYS: { hapticsEnabled: "preferences.hapticsEnabled" },
  preferencesStorage: { getBoolean: vi.fn() },
}));
vi.mock("expo-haptics", () => ({
  selectionAsync: vi.fn().mockResolvedValue(undefined),
  impactAsync: vi.fn().mockResolvedValue(undefined),
  notificationAsync: vi.fn().mockResolvedValue(undefined),
  performAndroidHapticsAsync: vi.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Soft: "soft" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
  AndroidHaptics: {
    Clock_Tick: "clock-tick",
    Virtual_Key: "virtual-key",
    Toggle_On: "toggle-on",
    Toggle_Off: "toggle-off",
    Long_Press: "long-press",
    Context_Click: "context-click",
    Confirm: "confirm",
    Reject: "reject",
  },
}));

function fireAll() {
  hapticSelection();
  hapticImpact();
  hapticToggle(true);
  hapticToggle(false);
  hapticLongPress();
  hapticPoke();
  hapticSuccess();
  hapticWarning();
  hapticError();
}

describe("haptic preferences and platform behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Platform.OS = "ios";
    vi.mocked(preferencesStorage.getBoolean).mockReturnValue(undefined);
  });

  it("defaults to enabled when the preference has never been saved", () => {
    hapticSuccess();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success,
    );
    expect(Haptics.performAndroidHapticsAsync).not.toHaveBeenCalled();
  });

  it.each(["ios", "android"] as const)("mutes every effect on %s", (platform) => {
    Platform.OS = platform;
    vi.mocked(preferencesStorage.getBoolean).mockReturnValue(false);
    fireAll();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(Haptics.performAndroidHapticsAsync).not.toHaveBeenCalled();
  });

  it("reads preference changes without remounting or restarting", () => {
    vi.mocked(preferencesStorage.getBoolean).mockReturnValue(false);
    hapticSelection();
    vi.mocked(preferencesStorage.getBoolean).mockReturnValue(true);
    hapticSelection();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it("uses a neutral impact rather than outcome feedback for presses", () => {
    hapticImpact();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it("falls back when the Android constant is unavailable", async () => {
    Platform.OS = "android";
    vi.mocked(Haptics.performAndroidHapticsAsync).mockRejectedValueOnce(new Error("Unsupported"));
    hapticSuccess();
    await Promise.resolve();
    expect(
      vi.mocked(Haptics.performAndroidHapticsAsync).mock.calls.map(([effect]) => effect),
    ).toEqual([Haptics.AndroidHaptics.Confirm, Haptics.AndroidHaptics.Virtual_Key]);
  });

  it("does not play a delayed fallback after haptics are muted", async () => {
    Platform.OS = "android";
    vi.mocked(Haptics.performAndroidHapticsAsync).mockRejectedValueOnce(new Error("Unsupported"));
    hapticSuccess();
    vi.mocked(preferencesStorage.getBoolean).mockReturnValue(false);
    await Promise.resolve();
    expect(Haptics.performAndroidHapticsAsync).toHaveBeenCalledTimes(1);
  });

  it("swallows failures from both the preferred effect and fallback", async () => {
    Platform.OS = "android";
    vi.mocked(Haptics.performAndroidHapticsAsync)
      .mockRejectedValueOnce(new Error("Unsupported"))
      .mockRejectedValueOnce(new Error("No motor"));
    expect(hapticError).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(Haptics.performAndroidHapticsAsync).toHaveBeenCalledTimes(2);
  });

  it("does not invoke native effects on web", () => {
    Platform.OS = "web";
    fireAll();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(Haptics.performAndroidHapticsAsync).not.toHaveBeenCalled();
  });
});
