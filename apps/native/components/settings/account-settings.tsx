import {
  ActionBottomSheetConfirm,
  ActionBottomSheetMessage,
  type ActionBottomSheetMessagePayload,
} from "@/components/ui/action-bottom-sheet";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  SettingsControlsInfoRow,
  SettingsControlsLabeledInput,
} from "@/components/settings/settings-controls";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { useAuthProvider, useChangePassword, useDeleteAccount } from "@/hooks/use-settings";
import { Key, LogOut, Mail, Shield, Trash2, UserCog } from "lucide-react-native";
import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { View } from "react-native";
import { useGT } from "gt-react-native";

type PasswordFormValues = {
  newPassword: string;
  confirmPassword: string;
};

export function AccountSettings({
  email,
  signOut,
}: {
  email: string;
  signOut: () => Promise<void>;
}) {
  const t = useGT();
  const { data: provider } = useAuthProvider();
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
  const isOAuth = provider !== "email";

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
    </>
  );
}
