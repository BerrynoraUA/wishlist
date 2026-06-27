import {
  ActionBottomSheetConfirm,
  ActionBottomSheetMessage,
  type ActionBottomSheetMessagePayload,
} from "@/components/ui/action-bottom-sheet";
import { loginWithGoogle } from "@/api/login";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  SettingsControlsInfoRow,
  SettingsControlsLabeledInput,
} from "@/components/settings/settings-controls";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { useKnownAccounts } from "@/hooks/use-known-accounts";
import { useAuthProvider, useChangePassword, useDeleteAccount } from "@/hooks/use-settings";
import { switchAccount } from "@/lib/account-switch";
import type { KnownAccount } from "@wishlist/backend/types/known-accounts";
import { useRouter } from "expo-router";
import { Key, LogOut, Mail, Shield, Trash2, UserCog, UserPlus, X } from "lucide-react-native";
import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ActivityIndicator, View } from "react-native";
import { useGT } from "gt-react-native";

type PasswordFormValues = {
  newPassword: string;
  confirmPassword: string;
};

export function AccountSettings({
  email,
  userId,
  signOut,
}: {
  email: string;
  userId: string;
  signOut: () => Promise<void>;
}) {
  const t = useGT();
  const router = useRouter();
  const { data: provider } = useAuthProvider();
  const { accounts, removeAccount, refresh } = useKnownAccounts();
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();
  const { control, handleSubmit, reset } = useForm<PasswordFormValues>({
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });
  const values = useWatch({ control }) as PasswordFormValues;
  const [message, setMessage] = React.useState<ActionBottomSheetMessagePayload | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [accountPendingRemoval, setAccountPendingRemoval] = React.useState<KnownAccount | null>(
    null,
  );
  const [switchingUserId, setSwitchingUserId] = React.useState<string | null>(null);
  const [addingAccount, setAddingAccount] = React.useState(false);
  const isOAuth = provider !== "email";
  const googleAccounts = accounts.filter(
    (account) =>
      account.userId !== userId &&
      (account.provider === "google" || account.providers?.includes("google")),
  );

  function submitPassword(formValues: PasswordFormValues) {
    if (formValues.newPassword.length < 6) {
      setMessage({ title: t("Password"), message: t("Password must be at least 6 characters.") });
      return;
    }

    if (formValues.newPassword !== formValues.confirmPassword) {
      setMessage({ title: t("Password"), message: t("Passwords do not match.") });
      return;
    }

    changePassword.mutate(formValues.newPassword, {
      onSuccess: () => {
        reset();
        setMessage({ title: t("Password updated") });
      },
      onError: (error) =>
        setMessage({ title: t("Password update failed"), message: error.message }),
    });
  }

  function handleDeleteAccount() {
    deleteAccount.mutate(undefined, {
      onError: (error) => {
        setDeleteOpen(false);
        setMessage({ title: t("Delete account failed"), message: error.message });
      },
    });
  }

  async function handleSwitchAccount(account: KnownAccount) {
    if (switchingUserId || addingAccount) return;
    setSwitchingUserId(account.userId);
    try {
      await switchAccount(account);
      setSwitchingUserId(null);
      router.replace("/(tabs)/wishlists" as never);
    } catch (error) {
      setMessage({
        title: t("Switch account failed"),
        message: error instanceof Error ? error.message : t("Could not switch account."),
      });
      setSwitchingUserId(null);
    }
  }

  async function handleAddAccount() {
    if (switchingUserId || addingAccount) return;
    setAddingAccount(true);
    try {
      await loginWithGoogle();
      await refresh();
      setAddingAccount(false);
      router.replace("/(tabs)/wishlists" as never);
    } catch (error) {
      setMessage({
        title: t("Add account failed"),
        message: error instanceof Error ? error.message : t("Could not add account."),
      });
      setAddingAccount(false);
    }
  }

  async function confirmRemoveAccount() {
    if (!accountPendingRemoval) return;
    await removeAccount(accountPendingRemoval.userId);
    setAccountPendingRemoval(null);
  }

  const emailUnavailable = t("Email unavailable");

  return (
    <>
      <SettingsSection
        title={t("Account")}
        icon={UserCog}
        headerAction={
          <Button
            variant="destructive"
            size="sm"
            className="h-8 px-3"
            onPress={(event) => {
              event.stopPropagation();
              void signOut();
            }}
            onPressIn={(event) => event.stopPropagation()}
          >
            <Icon as={LogOut} className="size-4 text-white" />
            <Text>{t("Log out")}</Text>
          </Button>
        }
      >
        <SettingsControlsInfoRow icon={Mail} title={email || emailUnavailable} />
        <SettingsControlsInfoRow
          icon={Shield}
          title={isOAuth ? t("Google Account") : t("Email Account")}
        />

        {!isOAuth && (
          <View className="gap-3">
            <Controller
              control={control}
              name="newPassword"
              render={({ field: { onChange, value } }) => (
                <SettingsControlsLabeledInput
                  label={t("New Password")}
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  placeholder={t("Enter new password")}
                />
              )}
            />
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <SettingsControlsLabeledInput
                  label={t("Confirm Password")}
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  placeholder={t("Confirm new password")}
                />
              )}
            />
            <Button
              disabled={changePassword.isPending || !values.newPassword || !values.confirmPassword}
              onPress={handleSubmit(submitPassword)}
            >
              <Icon as={Key} className="size-4 text-primary-foreground" />
              <Text>{changePassword.isPending ? t("Updating...") : t("Update Password")}</Text>
            </Button>
          </View>
        )}

        <View className="gap-3 rounded-lg border border-border-subtle bg-bg-subtle p-4">
          <View className="gap-1">
            <Text className="font-bold text-text">{t("Switch account")}</Text>
            <Text className="text-sm leading-5 text-text-muted">
              {t("Saved Google accounts on this device.")}
            </Text>
          </View>

          <View className="gap-2">
            {googleAccounts.map((account) => {
              const label = account.displayName?.trim() || account.email || account.userId;
              const initial = label.charAt(0).toUpperCase();
              const isSwitching = switchingUserId === account.userId;

              return (
                <View
                  key={account.userId}
                  className="flex-row items-center gap-2 rounded-xl border border-border-subtle bg-card-bg p-2"
                >
                  <Button
                    variant="ghost"
                    disabled={Boolean(switchingUserId) || addingAccount}
                    onPress={() => void handleSwitchAccount(account)}
                    className="h-auto min-w-0 flex-1 justify-start rounded-lg px-2 py-1.5"
                  >
                    <View className="size-9 items-center justify-center rounded-full bg-brand-lighter">
                      <Text className="text-sm font-extrabold text-brand">{initial}</Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="font-bold text-text" numberOfLines={1}>
                        {label}
                      </Text>
                      <Text className="text-xs font-semibold text-text-muted" numberOfLines={1}>
                        {isSwitching ? t("Switching...") : account.email}
                      </Text>
                    </View>
                    {isSwitching ? <ActivityIndicator colorClassName="accent-brand" /> : null}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={Boolean(switchingUserId) || addingAccount}
                    accessibilityLabel={t("Remove saved account")}
                    onPress={() => setAccountPendingRemoval(account)}
                    className="rounded-full"
                  >
                    <Icon as={X} className="size-4 text-text-muted" />
                  </Button>
                </View>
              );
            })}

            <Button
              variant="outline"
              disabled={Boolean(switchingUserId) || addingAccount}
              onPress={() => void handleAddAccount()}
              className="justify-start rounded-xl"
            >
              {addingAccount ? (
                <ActivityIndicator colorClassName="accent-brand" />
              ) : (
                <Icon as={UserPlus} className="size-4 text-text" />
              )}
              <Text>{addingAccount ? t("Opening Google...") : t("Add Google account")}</Text>
            </Button>
          </View>
        </View>

        <View className="gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <Text className="font-bold text-destructive">{t("Danger Zone")}</Text>
          <Text className="text-sm leading-5 text-text-muted">
            {t("This action permanently deletes your account and all associated data.")}
          </Text>
          <Button
            variant="destructive"
            disabled={deleteAccount.isPending}
            onPress={() => setDeleteOpen(true)}
          >
            <Icon as={Trash2} className="size-4 text-white" />
            <Text>{deleteAccount.isPending ? t("Deleting...") : t("Delete Account")}</Text>
          </Button>
        </View>
      </SettingsSection>
      <ActionBottomSheetMessage message={message} onClose={() => setMessage(null)} />
      <ActionBottomSheetConfirm
        open={deleteOpen}
        title={t("Delete Account")}
        message={t(
          "This will permanently delete your profile, wishlists, items, friend connections, notifications, and subscription. This action cannot be undone.",
        )}
        confirmLabel={t("Delete My Account")}
        destructive
        isPending={deleteAccount.isPending}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
      />
      <ActionBottomSheetConfirm
        open={!!accountPendingRemoval}
        title={t("Remove saved account")}
        message={t(
          "Remove this account from saved accounts on this device? You can add it again later by signing in with Google.",
        )}
        confirmLabel={t("Remove account")}
        destructive
        onClose={() => setAccountPendingRemoval(null)}
        onConfirm={() => void confirmRemoveAccount()}
      />
    </>
  );
}
