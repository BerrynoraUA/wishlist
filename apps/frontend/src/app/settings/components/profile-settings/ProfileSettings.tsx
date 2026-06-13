"use client";

import { useEffect, useRef, useState } from "react";
import { useGT } from "gt-next";
import { Camera, Check, AlertCircle } from "lucide-react";
import { FileSizeBadge } from "@/components/ui/FileSizeBadge/FileSizeBadge";
import { UploadErrorText } from "@/components/ui/UploadErrorText/UploadErrorText";
import { validateImageUploadFile } from "@/lib/image-upload";
import styles from "./ProfileSettings.module.scss";
import { SettingsSection } from "../settings-section/SettingsSection";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { Button } from "@/components/ui/Button/Button";
import {
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
  useCheckNickname,
} from "@/hooks/use-settings";

export function ProfileSettings() {
  const t = useGT();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const checkNickname = useCheckNickname();

  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [height, setHeight] = useState("");
  const [shoeSize, setShoeSize] = useState("");
  const [bio, setBio] = useState("");
  const [hasInitializedForm, setHasInitializedForm] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "taken">(
    "idle",
  );

  const fileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync form with loaded profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setNickname(profile.nickname ?? "");
      setHeight(formatProfileNumber(profile.height));
      setShoeSize(formatProfileNumber(profile.shoe_size));
      setBio(profile.bio ?? "");
      setHasInitializedForm(true);
    }
  }, [profile]);

  // Debounced nickname uniqueness check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmedNickname = nickname.trim();

    if (!trimmedNickname || trimmedNickname.length < 3 || trimmedNickname === profile?.nickname) {
      setNicknameStatus("idle");
      return;
    }

    setNicknameStatus("checking");
    debounceRef.current = setTimeout(() => {
      checkNickname.mutate(trimmedNickname, {
        onSuccess: (available) => {
          setNicknameStatus(available ? "available" : "taken");
        },
      });
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nickname, profile?.nickname]);

  const trimmedDisplayName = displayName.trim();
  const trimmedNickname = nickname.trim();
  const trimmedHeight = height.trim();
  const trimmedShoeSize = shoeSize.trim();
  const trimmedBio = bio.trim();
  const initialDisplayName = profile?.display_name?.trim() ?? "";
  const initialNickname = profile?.nickname?.trim() ?? "";
  const initialHeight = formatProfileNumber(profile?.height ?? null);
  const initialShoeSize = formatProfileNumber(profile?.shoe_size ?? null);
  const initialBio = profile?.bio?.trim() ?? "";
  const displayNameError = !hasInitializedForm
    ? null
    : trimmedDisplayName.length === 0
      ? t("Display name is required", {
          $id: "settings.profile.displayNameRequired",
        })
      : trimmedDisplayName.length < 3
        ? t("Display name must be at least 3 characters", {
            $id: "settings.profile.displayNameMinLength",
          })
        : null;
  const nicknameError = !hasInitializedForm
    ? null
    : trimmedNickname.length === 0
      ? t("Nickname is required", {
          $id: "settings.profile.nicknameRequired",
        })
      : trimmedNickname.length < 3
        ? t("Nickname must be at least 3 characters", {
            $id: "settings.profile.nicknameMinLength",
          })
        : nicknameStatus === "taken"
          ? t("This nickname is already taken", {
              $id: "settings.profile.nicknameTaken",
            })
          : null;
  const isNicknameTaken = nicknameStatus === "taken" && trimmedNickname.length >= 3;
  const hasProfileValidationError = Boolean(displayNameError || nicknameError);
  const hasProfileChanges =
    trimmedDisplayName !== initialDisplayName ||
    trimmedNickname !== initialNickname ||
    trimmedHeight !== initialHeight ||
    trimmedShoeSize !== initialShoeSize ||
    trimmedBio !== initialBio;

  function handleSave() {
    if (hasProfileValidationError || !hasProfileChanges) return;

    updateProfile.mutate({
      display_name: trimmedDisplayName,
      nickname: trimmedNickname,
      height: parseProfileNumber(trimmedHeight),
      shoe_size: parseProfileNumber(trimmedShoeSize),
      bio: trimmedBio || null,
    });
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const nextAvatarError = validateImageUploadFile(file);
    if (nextAvatarError) {
      setAvatarError(nextAvatarError);
      e.target.value = "";
      return;
    }

    setAvatarError(null);
    uploadAvatar.mutate(file);
  }

  if (isLoading) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Skeleton variant="circle" width={56} height={56} />
          <div style={{ display: "grid", gap: 6, flex: 1 }}>
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="25%" />
          </div>
        </div>
        <Skeleton width="100%" height={44} borderRadius={12} />
        <Skeleton width="100%" height={44} borderRadius={12} />
        <Skeleton width="100%" height={80} borderRadius={12} />
      </div>
    );
  }

  const avatarUrl = profile?.avatar_url;
  const initial = (profile?.display_name ?? profile?.nickname ?? "U").charAt(0).toUpperCase();

  return (
    <>
      <SettingsSection
        title={t("Profile Information", {
          $id: "settings.profile.sectionTitle",
        })}
        description={t("This is how you appear to your friends on Wishlane.", {
          $id: "settings.profile.sectionDescription",
        })}
      >
        {/* Avatar */}
        <div className={styles.avatarRow}>
          <button
            type="button"
            className={styles.avatarUpload}
            onClick={() => fileRef.current?.click()}
            disabled={uploadAvatar.isPending}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={t("Avatar", { $id: "settings.profile.avatarAlt" })}
                className={styles.avatarImg}
              />
            ) : (
              <span className={styles.avatarInitial}>{initial}</span>
            )}
            <div className={styles.avatarOverlay}>
              <Camera size={18} />
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className={styles.fileInput}
            onChange={handleAvatarChange}
          />
          <div className={styles.avatarHint}>
            <p>
              {t("Click to upload a new avatar", {
                $id: "settings.profile.avatarHint",
              })}
            </p>
            <FileSizeBadge className={styles.avatarBadge} />
            <p className={styles.hint}>
              {t("JPG, PNG or WebP", {
                $id: "settings.profile.avatarFormats",
              })}
            </p>
            <UploadErrorText message={avatarError} />
          </div>
        </div>

        {/* Display Name */}
        <div className={styles.field}>
          <label className={styles.label}>
            {t("Display Name", { $id: "settings.profile.displayNameLabel" })}
          </label>
          <input
            type="text"
            className={`${styles.input} ${displayNameError ? styles.inputInvalid : ""}`.trim()}
            placeholder={t("Your name", {
              $id: "settings.profile.displayNamePlaceholder",
            })}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
          />
          {displayNameError && <p className={styles.errorText}>{displayNameError}</p>}
        </div>

        {/* Nickname */}
        <div className={styles.field}>
          <label className={styles.label}>
            {t("Nickname", { $id: "settings.profile.nicknameLabel" })}
            <span className={styles.labelHint}>
              {t("Friends can find you by this", {
                $id: "settings.profile.nicknameHint",
              })}
            </span>
          </label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputPrefix}>@</span>
            <input
              type="text"
              className={`${styles.input} ${styles.withPrefix} ${nicknameError ? styles.inputInvalid : ""}`.trim()}
              placeholder={t("your-nickname", {
                $id: "settings.profile.nicknamePlaceholder",
              })}
              value={nickname}
              onChange={(e) =>
                setNickname(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))
              }
              maxLength={30}
            />
            {nicknameStatus === "available" && !nicknameError && (
              <Check size={16} className={styles.nicknameOk} />
            )}
            {isNicknameTaken && <AlertCircle size={16} className={styles.nicknameTaken} />}
          </div>
          {nicknameError && <p className={styles.errorText}>{nicknameError}</p>}
        </div>

        <div className={styles.measurementsGrid}>
          <div className={styles.field}>
            <label className={styles.label}>
              {t("Height", { $id: "settings.profile.heightLabel" })}
              <span className={styles.labelHint}>cm</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              className={styles.input}
              placeholder={t("175", {
                $id: "settings.profile.heightPlaceholder",
              })}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              min="0"
              step="0.1"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              {t("Shoe size", { $id: "settings.profile.shoeSizeLabel" })}
              <span className={styles.labelHint}>EU</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              className={styles.input}
              placeholder={t("42", {
                $id: "settings.profile.shoeSizePlaceholder",
              })}
              value={shoeSize}
              onChange={(e) => setShoeSize(e.target.value)}
              min="0"
              step="0.5"
            />
          </div>
        </div>

        {/* Bio */}
        <div className={styles.field}>
          <label className={styles.label}>{t("Bio", { $id: "settings.profile.bioLabel" })}</label>
          <textarea
            className={styles.textarea}
            placeholder={t("Tell your friends a little about yourself…", {
              $id: "settings.profile.bioPlaceholder",
            })}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
          />
          <span className={styles.charCount}>{bio.length}/160</span>
        </div>

        <div className={styles.actions}>
          <Button
            onClick={handleSave}
            disabled={updateProfile.isPending || hasProfileValidationError || !hasProfileChanges}
          >
            {updateProfile.isPending
              ? t("Saving…", { $id: "settings.profile.saving" })
              : t("Save Changes", { $id: "settings.profile.saveChanges" })}
          </Button>
          {updateProfile.isSuccess && (
            <span className={styles.successMsg}>
              <Check size={14} /> {t("Saved", { $id: "settings.profile.saved" })}
            </span>
          )}
        </div>
      </SettingsSection>
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
