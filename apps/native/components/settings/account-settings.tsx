import {
  ConfirmBottomSheet,
  MessageBottomSheet,
  type SheetMessage,
} from "@/components/ui/action-bottom-sheet";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { InfoRow, LabeledInput } from "@/components/settings/settings-controls";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { useAuthProvider, useChangePassword, useDeleteAccount } from "@/hooks/use-settings";
import { Key, LogOut, Mail, Shield, Trash2, UserCog } from "lucide-react-native";
import * as React from "react";
import { View } from "react-native";

export function AccountSettings({
  email,
  signOut,
}: {
  email: string;
  signOut: () => Promise<void>;
}) {
  const { data: provider } = useAuthProvider();
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [message, setMessage] = React.useState<SheetMessage | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const isOAuth = provider !== "email";

  function handleChangePassword() {
    if (newPassword.length < 6) {
      setMessage({ title: "Password", message: "Password must be at least 6 characters." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ title: "Password", message: "Passwords do not match." });
      return;
    }

    changePassword.mutate(newPassword, {
      onSuccess: () => {
        setNewPassword("");
        setConfirmPassword("");
        setMessage({ title: "Password updated" });
      },
      onError: (error) => setMessage({ title: "Password update failed", message: error.message }),
    });
  }

  function handleDeleteAccount() {
    deleteAccount.mutate(undefined, {
      onError: (error) => {
        setDeleteOpen(false);
        setMessage({ title: "Delete account failed", message: error.message });
      },
    });
  }

  return (
    <>
      <SettingsSection
        title="Account"
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
            <Text>Log out</Text>
          </Button>
        }
      >
        <InfoRow icon={Mail} title={email || "Email unavailable"} />
        <InfoRow icon={Shield} title={isOAuth ? "Google Account" : "Email Account"} />

        {!isOAuth && (
          <View className="gap-3">
            <LabeledInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Enter new password"
            />
            <LabeledInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Confirm new password"
            />
            <Button
              disabled={changePassword.isPending || !newPassword || !confirmPassword}
              onPress={handleChangePassword}
            >
              <Icon as={Key} className="size-4 text-primary-foreground" />
              <Text>{changePassword.isPending ? "Updating..." : "Update Password"}</Text>
            </Button>
          </View>
        )}

        <View className="gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <Text className="font-bold text-destructive">Danger Zone</Text>
          <Text className="text-sm leading-5 text-text-muted">
            This action permanently deletes your account and all associated data.
          </Text>
          <Button
            variant="destructive"
            disabled={deleteAccount.isPending}
            onPress={() => setDeleteOpen(true)}
          >
            <Icon as={Trash2} className="size-4 text-white" />
            <Text>{deleteAccount.isPending ? "Deleting..." : "Delete Account"}</Text>
          </Button>
        </View>
      </SettingsSection>
      <MessageBottomSheet message={message} onClose={() => setMessage(null)} />
      <ConfirmBottomSheet
        open={deleteOpen}
        title="Delete Account"
        message="This will permanently delete your profile, wishlists, items, friend connections, notifications, and subscription. This action cannot be undone."
        confirmLabel="Delete My Account"
        destructive
        isPending={deleteAccount.isPending}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
      />
    </>
  );
}
