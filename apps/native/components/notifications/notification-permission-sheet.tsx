import {
  NotificationPreferenceToggles,
  type NotificationPreferences,
} from "@/components/settings/notification-preference-toggles";
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetScrollView,
  type BottomSheetRef,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { getNotificationPermission, registerPushNotifications } from "@/hooks/use-notifications";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import {
  getNotificationPermissionPromptDecision,
  setNotificationPermissionPromptDecision,
} from "@/lib/notification-permission-prompt";
import { debugError } from "@/lib/debug-log";
import { Bell, ShieldCheck } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

export function NotificationPermissionSheet({ userId }: { userId: string }) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const promptDecisionRef = React.useRef<"allowed" | "skipped" | null>(null);
  const settingsQuery = useSettings();
  const updateSettings = useUpdateSettings();
  const [eligible, setEligible] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [preferences, setPreferences] = React.useState<NotificationPreferences>(() =>
    getPreferences(null),
  );

  React.useEffect(() => {
    let cancelled = false;

    void Promise.all([
      getNotificationPermission(),
      getNotificationPermissionPromptDecision(userId),
    ]).then(([permission, promptDecision]) => {
      if (cancelled) return;
      const nextEligible =
        promptDecision === null && (permission.status === "granted" || permission.canAskAgain);

      setEligible(nextEligible);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  React.useEffect(() => {
    if (!eligible || settingsQuery.isLoading) return;
    setPreferences(getPreferences(settingsQuery.data));
    setOpen(true);
  }, [eligible, settingsQuery.data, settingsQuery.isLoading]);

  function setPreference(key: keyof NotificationPreferences, value: boolean) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  async function dismiss() {
    promptDecisionRef.current = "skipped";
    await setNotificationPermissionPromptDecision(userId, "skipped");
    await sheetRef.current?.dismiss();
  }

  async function allowNotifications() {
    setError(null);

    try {
      await updateSettings.mutateAsync(preferences);
      await setNotificationPermissionPromptDecision(userId, "allowed");
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : t("Could not save notification preferences."),
      );
      return;
    }

    promptDecisionRef.current = "allowed";
    await sheetRef.current?.dismiss();

    try {
      await registerPushNotifications({ requestPermission: true });
    } catch (registrationError) {
      debugError("[push] registration after pre-permission prompt failed", registrationError);
    }
  }

  function handleDismissed() {
    const promptDecision = promptDecisionRef.current;
    promptDecisionRef.current = null;
    setOpen(false);
    setEligible(false);

    if (promptDecision === null) {
      void setNotificationPermissionPromptDecision(userId, "skipped");
    }
  }

  if (!open) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      initialDetentIndex={0}
      initialDetentAnimated
      scrollable
      footerInsetMode="scroll-content"
      scrollableOptions={{ scrollingExpandsSheet: false }}
      onDidDismiss={handleDismissed}
      header={<BottomSheetHeader title={t("Stay in the loop")} />}
      footer={
        <View className="w-full gap-2 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
          <Button disabled={updateSettings.isPending} onPress={() => void allowNotifications()}>
            {updateSettings.isPending ? (
              <ActivityIndicator colorClassName="accent-primary-foreground" />
            ) : (
              <Icon as={Bell} className="size-4 text-primary-foreground" />
            )}
            <Text>{t("Allow notifications")}</Text>
          </Button>
          <Button
            variant="ghost"
            disabled={updateSettings.isPending}
            onPress={() => void dismiss()}
          >
            <Text>{t("Not now")}</Text>
          </Button>
        </View>
      }
    >
      <BottomSheetScrollView
        className="max-h-full"
        contentContainerClassName="gap-4 px-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-start gap-2 rounded-xl border border-border-subtle bg-bg-muted p-3">
          <Icon as={Bell} className="mt-0.5 size-4 text-brand" />
          <Text className="min-w-0 flex-1 text-sm leading-5 text-text-muted">
            {t("Get updates about invitations, reservations, and important wishlist activity.")}
          </Text>
        </View>

        <View className="flex-row items-start gap-2 rounded-xl border border-border-subtle bg-bg-muted p-3">
          <Icon as={ShieldCheck} className="mt-0.5 size-4 text-brand" />
          <Text className="min-w-0 flex-1 text-sm leading-5 text-text-muted">
            {t("Choose what matters to you. You can change these options anytime in Settings.")}
          </Text>
        </View>

        <View className="gap-4 rounded-xl border border-border-subtle bg-card-bg p-4">
          <NotificationPreferenceToggles preferences={preferences} onChange={setPreference} />
        </View>

        {error ? <Text className="text-sm font-semibold text-destructive">{error}</Text> : null}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

function getPreferences(
  settings: ReturnType<typeof useSettings>["data"] | null,
): NotificationPreferences {
  return {
    notify_friend_requests: settings?.notify_friend_requests ?? true,
    notify_secret_santa: settings?.notify_secret_santa ?? true,
    notify_reservations: settings?.notify_reservations ?? true,
    notify_new_wishlists: settings?.notify_new_wishlists ?? true,
    notify_upcoming_events: settings?.notify_upcoming_events ?? true,
    notify_group_added: settings?.notify_group_added ?? true,
    notify_wishlist_access: settings?.notify_wishlist_access ?? true,
    notify_reserved_item_updates: settings?.notify_reserved_item_updates ?? true,
  };
}
