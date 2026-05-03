import { Button } from "@/components/ui/button";
import {
  ActionBottomSheetMessage,
  type ActionBottomSheetMessagePayload,
} from "@/components/ui/action-bottom-sheet";
import { StyledImage } from "@/components/ui/styled-image";
import { StyledPressable } from "@/components/ui/styled-pressable";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { SettingsControlsLabeledInput } from "@/components/settings/settings-controls";
import { SettingsSection } from "@/components/settings/settings-section";
import {
  useCheckNickname,
  useProfile,
  useUpdateProfile,
  useUploadProfileAvatar,
} from "@/hooks/use-settings";
import * as ImagePicker from "expo-image-picker";
import * as React from "react";
import { UserRound } from "lucide-react-native";
import { Controller, useForm, useWatch } from "react-hook-form";
import { View } from "react-native";

const MAX_AVATAR_UPLOAD_BYTES = 5 * 1024 * 1024;

type ProfileFormValues = {
  displayName: string;
  nickname: string;
  height: string;
  shoeSize: string;
  bio: string;
};

export function ProfileSettings({ profile }: { profile: ReturnType<typeof useProfile>["data"] }) {
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadProfileAvatar();
  const checkNickname = useCheckNickname();
  const { control, handleSubmit, reset, setValue } = useForm<ProfileFormValues>({
    defaultValues: {
      displayName: "",
      nickname: "",
      height: "",
      shoeSize: "",
      bio: "",
    },
  });
  const values = useWatch({ control }) as ProfileFormValues;
  const [message, setMessage] = React.useState<ActionBottomSheetMessagePayload | null>(null);
  const [nicknameStatus, setNicknameStatus] = React.useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  React.useEffect(() => {
    if (!profile) return;

    reset({
      displayName: profile.display_name ?? "",
      nickname: profile.nickname ?? "",
      height: formatProfileNumber(profile.height),
      shoeSize: formatProfileNumber(profile.shoe_size),
      bio: profile.bio ?? "",
    });
  }, [profile, reset]);

  React.useEffect(() => {
    const trimmedNickname = values.nickname.trim();

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
  }, [checkNickname, values.nickname, profile?.nickname]);

  const trimmedDisplayName = values.displayName.trim();
  const trimmedNickname = values.nickname.trim();
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

  function submitForm(formValues: ProfileFormValues) {
    if (displayNameError || nicknameError) return;

    updateProfile.mutate(
      {
        display_name: formValues.displayName.trim(),
        nickname: formValues.nickname.trim(),
        height: parseProfileNumber(formValues.height.trim()),
        shoe_size: parseProfileNumber(formValues.shoeSize.trim()),
        bio: formValues.bio.trim() || null,
      },
      {
        onSuccess: () => setMessage({ title: "Saved", message: "Profile updated." }),
        onError: (error) => setMessage({ title: "Profile update failed", message: error.message }),
      },
    );
  }

  async function handlePickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setMessage({
        title: "Permission required",
        message: "Allow photo library access to choose a profile image.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    if (!asset) return;

    if (asset.fileSize && asset.fileSize > MAX_AVATAR_UPLOAD_BYTES) {
      setMessage({ title: "Image too large", message: "Choose an image that is 5 MB or less." });
      return;
    }

    uploadAvatar.mutate(
      {
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      },
      {
        onSuccess: () => setMessage({ title: "Saved", message: "Profile image updated." }),
        onError: (error) => setMessage({ title: "Image upload failed", message: error.message }),
      },
    );
  }

  return (
    <>
      <SettingsSection title="Profile" icon={UserRound} defaultOpen>
        <View className="flex-row items-center gap-3">
          <StyledPressable
            accessibilityRole="button"
            accessibilityLabel={
              uploadAvatar.isPending ? "Uploading profile photo" : "Change profile photo"
            }
            disabled={uploadAvatar.isPending}
            onPress={handlePickAvatar}
            className="size-14 overflow-hidden rounded-full active:opacity-80"
          >
            {profile?.avatar_url ? (
              <StyledImage
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                source={{ uri: profile.avatar_url }}
                contentFit="cover"
                className="size-14 rounded-full bg-muted"
              />
            ) : (
              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                className="size-14 items-center justify-center rounded-full bg-brand"
              >
                <Text className="text-xl font-bold text-white">
                  {(profile?.display_name ?? profile?.nickname ?? "U").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </StyledPressable>
          <View className="flex-1 gap-2">
            <View>
              <Text className="font-semibold text-text">
                {profile?.display_name ?? "Your profile"}
              </Text>
              <Text className="text-sm text-text-muted">
                {profile?.nickname ? `@${profile.nickname}` : "Choose a nickname"}
              </Text>
            </View>
            <Button
              variant="outline"
              size="sm"
              disabled={uploadAvatar.isPending}
              onPress={handlePickAvatar}
              className="self-start"
            >
              <Text>{uploadAvatar.isPending ? "Uploading..." : "Change photo"}</Text>
            </Button>
          </View>
        </View>

        <Controller
          control={control}
          name="displayName"
          render={({ field: { onChange, value } }) => (
            <SettingsControlsLabeledInput
              label="Display Name"
              value={value}
              onChangeText={onChange}
              maxLength={50}
              placeholder="Your name"
              error={displayNameError}
            />
          )}
        />
        <Controller
          control={control}
          name="nickname"
          render={({ field: { value } }) => (
            <SettingsControlsLabeledInput
              label="Nickname"
              value={value}
              onChangeText={(nextValue) =>
                setValue("nickname", nextValue.toLowerCase().replace(/[^a-z0-9._-]/g, ""))
              }
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
          )}
        />
        <View className="flex-row gap-3">
          <Controller
            control={control}
            name="height"
            render={({ field: { onChange, value } }) => (
              <SettingsControlsLabeledInput
                className="flex-1"
                label="Height"
                value={value}
                onChangeText={onChange}
                keyboardType="decimal-pad"
                placeholder="175"
                hint="cm"
              />
            )}
          />
          <Controller
            control={control}
            name="shoeSize"
            render={({ field: { onChange, value } }) => (
              <SettingsControlsLabeledInput
                className="flex-1"
                label="Shoe size"
                value={value}
                onChangeText={onChange}
                keyboardType="decimal-pad"
                placeholder="42"
                hint="EU"
              />
            )}
          />
        </View>
        <View className="gap-2">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-sm font-semibold text-text">Bio</Text>
            <Text className="text-xs text-text-muted">{values.bio.length}/160</Text>
          </View>
          <Controller
            control={control}
            name="bio"
            render={({ field: { onChange, value } }) => (
              <Textarea
                value={value}
                onChangeText={onChange}
                maxLength={160}
                numberOfLines={4}
                placeholder="Tell your friends a little about yourself..."
                className="text-text"
              />
            )}
          />
        </View>
        <Button disabled={updateProfile.isPending} onPress={handleSubmit(submitForm)}>
          <Text>{updateProfile.isPending ? "Saving..." : "Save Changes"}</Text>
        </Button>
      </SettingsSection>
      <ActionBottomSheetMessage message={message} onClose={() => setMessage(null)} />
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
