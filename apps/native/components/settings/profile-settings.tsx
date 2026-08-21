import { Button } from "@/components/ui/button";
import {
  ActionBottomSheetMessage,
  type ActionBottomSheetMessagePayload,
} from "@/components/ui/action-bottom-sheet";
import { StyledPressable } from "@/components/ui/styled-pressable";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarPickerSheet } from "@/components/settings/sheets/avatar-picker-sheet";
import { SettingsControlsLabeledInput } from "@/components/settings/settings-controls";
import { SettingsSection } from "@/components/settings/settings-section";
import { useCheckNickname, useProfile, useUpdateProfile } from "@/hooks/use-settings";
import { useImageUploadField } from "@/lib/image-upload";
import { removeOwnedStorageImage } from "@/lib/storage";
import { isDefaultAvatarUrl } from "@wishlist/backend/lib/default-avatars";
import * as ImagePicker from "expo-image-picker";
import * as React from "react";
import { UserRound } from "lucide-react-native";
import { Controller, useForm, useWatch } from "react-hook-form";
import { View } from "react-native";
import { useGT } from "gt-react-native";

const MAX_AVATAR_UPLOAD_BYTES = 5 * 1024 * 1024;

type ProfileFormValues = {
  displayName: string;
  nickname: string;
  height: string;
  shoeSize: string;
  bio: string;
};

export function ProfileSettings({ profile }: { profile: ReturnType<typeof useProfile>["data"] }) {
  const t = useGT();
  const updateProfile = useUpdateProfile();
  const avatarUpload = useImageUploadField("avatar");
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
  // The form starts blank and is filled from the profile once it arrives, so validation
  // stays quiet until then — otherwise every field reads as "required" while it loads.
  const [hasInitializedForm, setHasInitializedForm] = React.useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = React.useState(false);
  // A default avatar chosen in the picker, applied on save like every other field.
  const [selectedDefaultAvatarUrl, setSelectedDefaultAvatarUrl] = React.useState<string | null>(
    null,
  );
  const [nicknameStatus, setNicknameStatus] = React.useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const latestNicknameRef = React.useRef("");

  React.useEffect(() => {
    if (!profile) return;

    reset({
      displayName: profile.display_name ?? "",
      nickname: profile.nickname ?? "",
      height: formatProfileNumber(profile.height),
      shoeSize: formatProfileNumber(profile.shoe_size),
      bio: profile.bio ?? "",
    });
    setHasInitializedForm(true);
  }, [profile, reset]);

  React.useEffect(() => {
    const trimmedNickname = values.nickname.trim();
    latestNicknameRef.current = trimmedNickname;

    if (!trimmedNickname || trimmedNickname.length < 3 || trimmedNickname === profile?.nickname) {
      setNicknameStatus("idle");
      return;
    }

    setNicknameStatus((current) => (current === "checking" ? current : "checking"));
    const timeout = setTimeout(() => {
      checkNickname.mutate(trimmedNickname, {
        onSuccess: (available) => {
          if (latestNicknameRef.current !== trimmedNickname) return;
          setNicknameStatus(available ? "available" : "taken");
        },
        onError: () => {
          if (latestNicknameRef.current !== trimmedNickname) return;
          setNicknameStatus("idle");
        },
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [values.nickname, profile?.nickname]);

  // Whatever was chosen this session wins over the stored one, so a fresh choice is
  // visible before it is saved.
  const avatarPreviewUri =
    avatarUpload.pickedImage?.uri ?? selectedDefaultAvatarUrl ?? profile?.avatar_url ?? null;
  const trimmedDisplayName = values.displayName.trim();
  const trimmedNickname = values.nickname.trim();
  const displayNameError = React.useMemo(() => {
    if (!hasInitializedForm) return null;
    if (trimmedDisplayName.length === 0) return t("Display name is required");
    if (trimmedDisplayName.length < 3) return t("Display name must be at least 3 characters");
    return null;
  }, [hasInitializedForm, trimmedDisplayName, t]);

  const nicknameError = React.useMemo(() => {
    if (!hasInitializedForm) return null;
    if (trimmedNickname.length === 0) return t("Nickname is required");
    if (trimmedNickname.length < 3) return t("Nickname must be at least 3 characters");
    if (nicknameStatus === "taken") return t("This nickname is already taken");
    return null;
  }, [hasInitializedForm, trimmedNickname, nicknameStatus, t]);

  async function submitForm(formValues: ProfileFormValues) {
    // Saving before the profile lands would write the blank form over it.
    if (!hasInitializedForm || displayNameError || nicknameError) return;

    const previousAvatarUrl = profile?.avatar_url ?? null;
    let avatarUrl: string | null | undefined;

    if (avatarUpload.pickedImage) {
      // Waits on the background upload started when the image was picked; usually already
      // resolved. `undefined` means it failed and the error is on the field.
      avatarUrl = await avatarUpload.resolveImageUrl(previousAvatarUrl ?? "");

      if (avatarUrl === undefined) {
        setMessage({
          title: t("Image upload failed"),
          message: avatarUpload.error ?? t("Could not save image."),
        });
        return;
      }
    } else if (selectedDefaultAvatarUrl) {
      avatarUrl = selectedDefaultAvatarUrl;
    }

    updateProfile.mutate(
      {
        display_name: formValues.displayName.trim(),
        nickname: formValues.nickname.trim(),
        height: parseProfileNumber(formValues.height.trim()),
        shoe_size: parseProfileNumber(formValues.shoeSize.trim()),
        bio: formValues.bio.trim() || null,
        // Only sent when the user picked a new image, so saving other fields never
        // touches the existing avatar.
        ...(avatarUrl !== undefined && { avatar_url: avatarUrl }),
      },
      {
        onSuccess: () => {
          void avatarUpload.commitPendingUpload(previousAvatarUrl);
          // Swapping an uploaded photo for a default leaves the old file behind.
          if (
            selectedDefaultAvatarUrl &&
            avatarUrl === selectedDefaultAvatarUrl &&
            !isDefaultAvatarUrl(previousAvatarUrl)
          ) {
            void removeOwnedStorageImage("avatars", previousAvatarUrl);
          }
          // The picked image stays as the preview on purpose: `useUpdateProfile` only
          // invalidates, so clearing it here would flash the old avatar until the refetch.
          setMessage({ title: t("Saved"), message: t("Profile updated.") });
        },
        onError: (error) => {
          void avatarUpload.discardPendingUpload();

          if (isNicknameDuplicateError(error)) {
            setNicknameStatus("taken");
            return;
          }

          setMessage({ title: t("Profile update failed"), message: error.message });
        },
      },
    );
  }

  async function handlePickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setMessage({
        title: t("Permission required"),
        message: t("Allow photo library access to choose a profile image."),
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      // Round crop overlay, matching how the avatar is rendered. Android only — iOS's
      // native crop UI is always a square and exposes no option for this. `aspect` still
      // has to be 1:1, otherwise the oval comes out as an ellipse.
      shape: "oval",
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    if (!asset) return;

    if (asset.fileSize && asset.fileSize > MAX_AVATAR_UPLOAD_BYTES) {
      setMessage({
        title: t("Image too large"),
        message: t("Choose an image that is 5 MB or less."),
      });
      return;
    }

    // Shows immediately and uploads in the background. Nothing is written to the profile
    // until Save, so backing out of the screen leaves the current avatar untouched.
    setSelectedDefaultAvatarUrl(null);
    avatarUpload.onPick({
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
    });
  }

  return (
    <>
      <SettingsSection id="profile" title={t("Profile")} icon={UserRound} defaultOpen>
        <View className="flex-row items-center gap-3">
          <StyledPressable
            accessibilityRole="button"
            accessibilityLabel={t("Change profile photo")}
            onPress={() => setIsAvatarPickerOpen(true)}
            className="size-14 overflow-hidden rounded-full active:opacity-80"
          >
            <Avatar
              alt={profile?.display_name ?? profile?.nickname ?? t("Your profile")}
              className="size-14"
            >
              {avatarPreviewUri ? <AvatarImage source={{ uri: avatarPreviewUri }} /> : null}
              <AvatarFallback className="bg-brand" initialsClassName="text-xl text-white" />
            </Avatar>
          </StyledPressable>
          <View className="flex-1 justify-center">
            <Text className="font-semibold text-text">
              {profile?.display_name ?? t("Your profile")}
            </Text>
            <Text className="text-sm text-text-muted">
              {profile?.nickname ? `@${profile.nickname}` : t("Choose a nickname")}
            </Text>
          </View>
        </View>

        <Controller
          control={control}
          name="displayName"
          render={({ field: { onChange, value } }) => (
            <SettingsControlsLabeledInput
              label={t("Display Name")}
              value={value}
              onChangeText={onChange}
              maxLength={50}
              placeholder={t("Your name")}
              error={displayNameError}
            />
          )}
        />
        <Controller
          control={control}
          name="nickname"
          render={({ field: { value } }) => (
            <SettingsControlsLabeledInput
              label={t("Nickname")}
              value={value}
              onChangeText={(nextValue) =>
                setValue("nickname", nextValue.toLowerCase().replace(/[^a-z0-9._-]/g, ""))
              }
              maxLength={30}
              placeholder={t("your-nickname")}
              error={nicknameError}
              hint={
                nicknameStatus === "checking"
                  ? t("Checking...")
                  : nicknameStatus === "available"
                    ? t("Available")
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
                label={t("Height")}
                value={value}
                onChangeText={onChange}
                keyboardType="decimal-pad"
                placeholder="175"
                hint={t("cm")}
              />
            )}
          />
          <Controller
            control={control}
            name="shoeSize"
            render={({ field: { onChange, value } }) => (
              <SettingsControlsLabeledInput
                className="flex-1"
                label={t("Shoe size")}
                value={value}
                onChangeText={onChange}
                keyboardType="decimal-pad"
                placeholder="42"
                hint={t("EU")}
              />
            )}
          />
        </View>
        <View className="gap-2">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-sm font-semibold text-text">{t("Bio")}</Text>
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
                placeholder={t("Tell your friends a little about yourself...")}
                className="text-text"
              />
            )}
          />
        </View>
        <Button
          disabled={updateProfile.isPending || avatarUpload.isUploading}
          onPress={handleSubmit(submitForm)}
        >
          <Text>
            {updateProfile.isPending || avatarUpload.isUploading
              ? t("Saving...")
              : t("Save Changes")}
          </Text>
        </Button>
      </SettingsSection>
      <AvatarPickerSheet
        open={isAvatarPickerOpen}
        selectedUrl={avatarPreviewUri}
        onSelect={(url) => {
          avatarUpload.onClear();
          setSelectedDefaultAvatarUrl(url);
        }}
        onUpload={handlePickAvatar}
        onClose={() => setIsAvatarPickerOpen(false)}
      />
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

function isNicknameDuplicateError(error: Error) {
  const code = "code" in error ? String(error.code) : "";
  const message = error.message.toLowerCase();

  return (
    code === "23505" &&
    (message.includes("profiles_nickname_unique") || message.includes("nickname"))
  );
}
