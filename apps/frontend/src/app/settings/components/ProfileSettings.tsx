"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, AlertCircle } from "lucide-react";
import styles from "./ProfileSettings.module.scss";
import { SettingsSection } from "./SettingsSection";
import { Button } from "@/components/ui/Button/Button";
import {
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
  useCheckNickname,
} from "@/hooks/use-settings";

export function ProfileSettings() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const checkNickname = useCheckNickname();

  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  const fileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync form with loaded profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setNickname(profile.nickname ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  // Debounced nickname uniqueness check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!nickname.trim() || nickname === profile?.nickname) {
      setNicknameStatus("idle");
      return;
    }

    setNicknameStatus("checking");
    debounceRef.current = setTimeout(() => {
      checkNickname.mutate(nickname.trim(), {
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

  function handleSave() {
    if (nicknameStatus === "taken") return;

    updateProfile.mutate({
      display_name: displayName.trim(),
      nickname: nickname.trim() || null,
      bio: bio.trim() || null,
    });
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadAvatar.mutate(file);
  }

  if (isLoading) {
    return <p className={styles.loading}>Loading profile…</p>;
  }

  const avatarUrl = profile?.avatar_url;
  const initial = (profile?.display_name ?? profile?.nickname ?? "U")
    .charAt(0)
    .toUpperCase();

  return (
    <>
      <SettingsSection
        title="Profile Information"
        description="This is how you appear to your friends on Wishly."
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
              <img src={avatarUrl} alt="Avatar" className={styles.avatarImg} />
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
            <p>Click to upload a new avatar</p>
            <p className={styles.hint}>JPG, PNG or WebP · Max 2 MB</p>
          </div>
        </div>

        {/* Display Name */}
        <div className={styles.field}>
          <label className={styles.label}>Display Name</label>
          <input
            type="text"
            className={styles.input}
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
          />
        </div>

        {/* Nickname */}
        <div className={styles.field}>
          <label className={styles.label}>
            Nickname
            <span className={styles.labelHint}>
              Friends can find you by this
            </span>
          </label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputPrefix}>@</span>
            <input
              type="text"
              className={`${styles.input} ${styles.withPrefix}`}
              placeholder="your-nickname"
              value={nickname}
              onChange={(e) =>
                setNickname(
                  e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""),
                )
              }
              maxLength={30}
            />
            {nicknameStatus === "available" && (
              <Check size={16} className={styles.nicknameOk} />
            )}
            {nicknameStatus === "taken" && (
              <AlertCircle size={16} className={styles.nicknameTaken} />
            )}
          </div>
          {nicknameStatus === "taken" && (
            <p className={styles.errorText}>This nickname is already taken</p>
          )}
        </div>

        {/* Bio */}
        <div className={styles.field}>
          <label className={styles.label}>Bio</label>
          <textarea
            className={styles.textarea}
            placeholder="Tell your friends a little about yourself…"
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
            disabled={updateProfile.isPending || nicknameStatus === "taken"}
          >
            {updateProfile.isPending ? "Saving…" : "Save Changes"}
          </Button>
          {updateProfile.isSuccess && (
            <span className={styles.successMsg}>
              <Check size={14} /> Saved
            </span>
          )}
        </div>
      </SettingsSection>
    </>
  );
}
