import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  Alert,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/auth-provider";
import {
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
  useSettings,
  useUpdateSettings,
  useAuthProvider,
  useChangePassword,
  useDeleteAccount,
} from "@/hooks/use-settings";
import { useSubscription } from "@/hooks/use-subscription";
import type { ThemePreference } from "@/types/settings";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: Colors.primary, false: Colors.border }}
        thumbColor={Colors.white}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { data: profile, refetch: refetchProfile } = useProfile();
  const { data: settings, refetch: refetchSettings } = useSettings();
  const { data: provider } = useAuthProvider();
  const { data: subscription } = useSubscription();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const updateSettings = useUpdateSettings();
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const startEditing = useCallback(() => {
    setDisplayName(profile?.display_name || "");
    setNickname(profile?.nickname || "");
    setBio(profile?.bio || "");
    setEditing(true);
  }, [profile]);

  const handleSaveProfile = async () => {
    await updateProfile.mutateAsync({
      display_name: displayName,
      nickname: nickname || null,
      bio: bio || null,
    });
    setEditing(false);
  };

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadAvatar.mutateAsync(result.assets[0].uri);
    }
  };

  const handleChangePassword = () => {
    Alert.prompt("Change Password", "Enter your new password", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Update",
        onPress: (newPw: string | undefined) => {
          if (newPw && newPw.length >= 6) {
            changePassword.mutate(newPw, {
              onSuccess: () => Alert.alert("Success", "Password updated"),
              onError: () => Alert.alert("Error", "Failed to update password"),
            });
          } else {
            Alert.alert("Error", "Password must be at least 6 characters");
          }
        },
      },
    ], "secure-text");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is permanent and cannot be undone. All your data will be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteAccount.mutate(undefined, {
              onSuccess: () => signOut(),
              onError: () => Alert.alert("Error", "Failed to delete account"),
            });
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchSettings()]);
    setRefreshing(false);
  };

  const handleToggleSetting = (key: string, value: boolean) => {
    updateSettings.mutate({ [key]: value });
  };

  const planLabel = subscription?.plan === "pro" ? "Pro" : "Free";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.title}>Settings</Text>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Profile Section */}
        <SectionHeader title="Profile" />
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.avatarRow}
            onPress={handlePickAvatar}
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>
            )}
            <Text style={styles.changeAvatarText}>Change Photo</Text>
          </TouchableOpacity>

          {editing ? (
            <View style={styles.editForm}>
              <TextInput
                style={styles.input}
                placeholder="Display Name"
                placeholderTextColor={Colors.textTertiary}
                value={displayName}
                onChangeText={setDisplayName}
              />
              <TextInput
                style={styles.input}
                placeholder="Nickname"
                placeholderTextColor={Colors.textTertiary}
                value={nickname}
                onChangeText={setNickname}
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Bio"
                placeholderTextColor={Colors.textTertiary}
                value={bio}
                onChangeText={setBio}
                multiline
              />
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setEditing(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={startEditing} style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile?.display_name || "—"}
              </Text>
              {profile?.nickname && (
                <Text style={styles.profileNickname}>@{profile.nickname}</Text>
              )}
              {profile?.bio && (
                <Text style={styles.profileBio}>{profile.bio}</Text>
              )}
              <Text style={styles.editHint}>Tap to edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Subscription */}
        <SectionHeader title="Subscription" />
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push("/subscription" as any)}
          >
            <Text style={styles.settingLabel}>Current Plan</Text>
            <Text style={styles.settingValue}>{planLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View style={styles.card}>
          <ToggleRow
            label="Friend Requests"
            value={settings?.notify_friend_requests ?? true}
            onToggle={(v) => handleToggleSetting("notify_friend_requests", v)}
          />
          <ToggleRow
            label="Reservations"
            value={settings?.notify_reservations ?? true}
            onToggle={(v) => handleToggleSetting("notify_reservations", v)}
          />
          <ToggleRow
            label="Sale Alerts"
            value={settings?.notify_sale_alerts ?? true}
            onToggle={(v) => handleToggleSetting("notify_sale_alerts", v)}
          />
          <ToggleRow
            label="Email Digest"
            value={settings?.email_digest ?? false}
            onToggle={(v) => handleToggleSetting("email_digest", v)}
          />
        </View>

        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          {provider === "email" && (
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleChangePassword}
            >
              <Text style={styles.settingLabel}>Change Password</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.settingRow} onPress={handleSignOut}>
            <Text style={[styles.settingLabel, { color: Colors.warning }]}>
              Sign Out
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomWidth: 0 }]}
            onPress={handleDeleteAccount}
          >
            <Text style={[styles.settingLabel, { color: Colors.error }]}>
              Delete Account
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  sectionHeader: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.primary },
  changeAvatarText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: "600",
    marginLeft: Spacing.lg,
  },
  profileInfo: { padding: Spacing.lg },
  profileName: { fontSize: FontSize.lg, fontWeight: "600", color: Colors.text },
  profileNickname: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  profileBio: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  editHint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },
  editForm: { padding: Spacing.lg },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  bioInput: { height: 80, textAlignVertical: "top" },
  editButtons: { flexDirection: "row", justifyContent: "flex-end", marginTop: Spacing.sm },
  cancelButton: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  cancelButtonText: { fontSize: FontSize.md, color: Colors.textSecondary },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  saveButtonText: { fontSize: FontSize.md, color: Colors.white, fontWeight: "600" },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingLabel: { fontSize: FontSize.md, color: Colors.text },
  settingValue: { fontSize: FontSize.md, color: Colors.textSecondary },
  chevron: { fontSize: FontSize.xl, color: Colors.textTertiary },
});
