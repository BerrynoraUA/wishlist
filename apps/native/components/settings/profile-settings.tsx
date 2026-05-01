import { Button } from "@/components/ui/button";
import { MessageBottomSheet, type SheetMessage } from "@/components/ui/action-bottom-sheet";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { LabeledInput } from "@/components/settings/settings-controls";
import { SettingsSection } from "@/components/settings/settings-section";
import { useCheckNickname, useProfile, useUpdateProfile } from "@/hooks/use-settings";
import * as React from "react";
import { UserRound } from "lucide-react-native";
import { View } from "react-native";

export function ProfileSettings({ profile }: { profile: ReturnType<typeof useProfile>["data"] }) {
  const updateProfile = useUpdateProfile();
  const checkNickname = useCheckNickname();
  const [displayName, setDisplayName] = React.useState("");
  const [nickname, setNickname] = React.useState("");
  const [height, setHeight] = React.useState("");
  const [shoeSize, setShoeSize] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [message, setMessage] = React.useState<SheetMessage | null>(null);
  const [nicknameStatus, setNicknameStatus] = React.useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  React.useEffect(() => {
    if (!profile) return;

    setDisplayName(profile.display_name ?? "");
    setNickname(profile.nickname ?? "");
    setHeight(formatProfileNumber(profile.height));
    setShoeSize(formatProfileNumber(profile.shoe_size));
    setBio(profile.bio ?? "");
  }, [profile]);

  React.useEffect(() => {
    const trimmedNickname = nickname.trim();

    if (!trimmedNickname || trimmedNickname.length < 3 || trimmedNickname === profile?.nickname) {
      setNicknameStatus("idle");
      return;
    }

    setNicknameStatus("checking");
    const timeout = setTimeout(() => {
      checkNickname.mutate(trimmedNickname, {
        onSuccess: (available) => setNicknameStatus(available ? "available" : "taken"),
        onError: () => setNicknameStatus("idle"),
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [checkNickname, nickname, profile?.nickname]);

  const trimmedDisplayName = displayName.trim();
  const trimmedNickname = nickname.trim();
  const displayNameError =
    trimmedDisplayName.length === 0
      ? "Display name is required"
      : trimmedDisplayName.length < 3
        ? "Display name must be at least 3 characters"
        : null;
  const nicknameError =
    trimmedNickname.length === 0
      ? "Nickname is required"
      : trimmedNickname.length < 3
        ? "Nickname must be at least 3 characters"
        : nicknameStatus === "taken"
          ? "This nickname is already taken"
          : null;

  function handleSave() {
    if (displayNameError || nicknameError) return;

    updateProfile.mutate(
      {
        display_name: trimmedDisplayName,
        nickname: trimmedNickname,
        height: parseProfileNumber(height.trim()),
        shoe_size: parseProfileNumber(shoeSize.trim()),
        bio: bio.trim() || null,
      },
      {
        onSuccess: () => setMessage({ title: "Saved", message: "Profile updated." }),
        onError: (error) => setMessage({ title: "Profile update failed", message: error.message }),
      },
    );
  }

  return (
    <>
      <SettingsSection title="Profile" icon={UserRound} defaultOpen>
        <View className="flex-row items-center gap-3">
          <View className="size-14 items-center justify-center rounded-full bg-brand">
            <Text className="text-xl font-bold text-white">
              {(profile?.display_name ?? profile?.nickname ?? "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-text">
              {profile?.display_name ?? "Your profile"}
            </Text>
            <Text className="text-sm text-text-muted">
              {profile?.nickname ? `@${profile.nickname}` : "Choose a nickname"}
            </Text>
          </View>
        </View>

        <LabeledInput
          label="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={50}
          placeholder="Your name"
          error={displayNameError}
        />
        <LabeledInput
          label="Nickname"
          value={nickname}
          onChangeText={(value) => setNickname(value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
          maxLength={30}
          placeholder="your-nickname"
          error={nicknameError}
          hint={
            nicknameStatus === "checking"
              ? "Checking..."
              : nicknameStatus === "available"
                ? "Available"
                : undefined
          }
        />
        <View className="flex-row gap-3">
          <LabeledInput
            className="flex-1"
            label="Height"
            value={height}
            onChangeText={setHeight}
            keyboardType="decimal-pad"
            placeholder="175"
            hint="cm"
          />
          <LabeledInput
            className="flex-1"
            label="Shoe size"
            value={shoeSize}
            onChangeText={setShoeSize}
            keyboardType="decimal-pad"
            placeholder="42"
            hint="EU"
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-text">Bio</Text>
          <Textarea
            value={bio}
            onChangeText={setBio}
            maxLength={160}
            numberOfLines={4}
            placeholder="Tell your friends a little about yourself..."
            className="text-text"
          />
          <Text className="text-right text-xs text-text-muted">{bio.length}/160</Text>
        </View>
        <Button disabled={updateProfile.isPending} onPress={handleSave}>
          <Text>{updateProfile.isPending ? "Saving..." : "Save Changes"}</Text>
        </Button>
      </SettingsSection>
      <MessageBottomSheet message={message} onClose={() => setMessage(null)} />
    </>
  );
}

function formatProfileNumber(value: number | null | undefined) {
  return value == null ? "" : String(value);
}

function parseProfileNumber(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
