"use client";

import { useState } from "react";
import { useGT } from "gt-next";
import { useRouter } from "next/navigation";
import { Mail, Key, Shield, Trash2, Check } from "lucide-react";
import styles from "./AccountSettings.module.scss";
import { SettingsSection } from "./SettingsSection";
import { Button } from "@/components/ui/Button/Button";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal/DeleteConfirmModal";
import { useCurrentUser } from "@/hooks/use-user";
import { useAuthProvider, useChangePassword, useDeleteAccount } from "@/hooks/use-settings";

export function AccountSettings() {
  const t = useGT();
  const { data: user } = useCurrentUser();
  const { data: provider } = useAuthProvider();
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isOAuth = provider !== "email";

  function handleChangePassword() {
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError(
        t("Password must be at least 6 characters", {
          $id: "settings.account.error.passwordMinLength",
        }),
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        t("Passwords do not match", {
          $id: "settings.account.error.passwordsMismatch",
        }),
      );
      return;
    }

    changePassword.mutate(newPassword, {
      onSuccess: () => {
        setNewPassword("");
        setConfirmPassword("");
      },
    });
  }

  function handleDeleteAccount() {
    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        router.push("/login");
      },
    });
  }

  return (
    <>
      {/* Email */}
      <SettingsSection
        title={t("Email Address", { $id: "settings.account.emailTitle" })}
        description={t("Your account email used for login and notifications.", {
          $id: "settings.account.emailDescription",
        })}
      >
        <div className={styles.infoRow}>
          <div className={styles.infoIcon}>
            <Mail size={18} />
          </div>
          <div>
            <p className={styles.infoValue}>{user?.email ?? "—"}</p>
            <p className={styles.infoHint}>
              {t("Email cannot be changed at this time", {
                $id: "settings.account.emailLockedHint",
              })}
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* Password */}
      <SettingsSection
        title={t("Password", { $id: "settings.account.passwordTitle" })}
        description={
          isOAuth
            ? t("You signed in with Google — no password to manage.", {
                $id: "settings.account.passwordOAuthDescription",
              })
            : t("Change your account password.", {
                $id: "settings.account.passwordDescription",
              })
        }
      >
        {isOAuth ? (
          <div className={styles.infoRow}>
            <div className={styles.infoIcon}>
              <Shield size={18} />
            </div>
            <div>
              <p className={styles.infoValue}>
                {t("Google Account", {
                  $id: "settings.account.googleAccount",
                })}
              </p>
              <p className={styles.infoHint}>
                {t("Authenticated via Google OAuth", {
                  $id: "settings.account.googleOAuthHint",
                })}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.field}>
              <label className={styles.label}>
                {t("New Password", {
                  $id: "settings.account.newPasswordLabel",
                })}
              </label>
              <input
                type="password"
                className={styles.input}
                placeholder={t("Enter new password", {
                  $id: "settings.account.newPasswordPlaceholder",
                })}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                {t("Confirm Password", {
                  $id: "settings.account.confirmPasswordLabel",
                })}
              </label>
              <input
                type="password"
                className={styles.input}
                placeholder={t("Confirm new password", {
                  $id: "settings.account.confirmPasswordPlaceholder",
                })}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {passwordError && <p className={styles.errorText}>{passwordError}</p>}

            <div className={styles.actions}>
              <Button
                onClick={handleChangePassword}
                disabled={changePassword.isPending || !newPassword || !confirmPassword}
              >
                <Key size={14} />
                {changePassword.isPending
                  ? t("Updating…", { $id: "settings.account.updatingPassword" })
                  : t("Update Password", {
                      $id: "settings.account.updatePassword",
                    })}
              </Button>
              {changePassword.isSuccess && (
                <span className={styles.successMsg}>
                  <Check size={14} />{" "}
                  {t("Password updated", {
                    $id: "settings.account.passwordUpdated",
                  })}
                </span>
              )}
            </div>
          </>
        )}
      </SettingsSection>

      {/* Linked Accounts */}
      <SettingsSection
        title={t("Linked Accounts", {
          $id: "settings.account.linkedAccountsTitle",
        })}
        description={t("External accounts connected to your Wishlane profile.", {
          $id: "settings.account.linkedAccountsDescription",
        })}
      >
        <div className={styles.providerRow}>
          <div className={`${styles.providerIcon} ${isOAuth ? styles.connected : ""}`}>
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          </div>
          <div>
            <p className={styles.providerName}>
              {t("Google", { $id: "settings.account.providerGoogle" })}
            </p>
            <p className={styles.providerStatus}>
              {isOAuth
                ? t("Connected", { $id: "settings.account.providerConnected" })
                : t("Not connected", {
                    $id: "settings.account.providerNotConnected",
                  })}
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection
        title={t("Danger Zone", { $id: "settings.account.dangerTitle" })}
        description={t("Permanently delete your account and all associated data.", {
          $id: "settings.account.dangerDescription",
        })}
        danger
      >
        <p className={styles.dangerText}>
          {t(
            "This will permanently delete your profile, wishlists, items, friend connections, notifications, and subscription. This action cannot be undone.",
            { $id: "settings.account.dangerBody" },
          )}
        </p>
        <Button variant="danger" onClick={() => setDeleteOpen(true)}>
          <Trash2 size={14} />
          {t("Delete Account", { $id: "settings.account.deleteAccount" })}
        </Button>
      </SettingsSection>

      <DeleteConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
        title={t("Delete Account", {
          $id: "settings.account.deleteModalTitle",
        })}
        description={t(
          "Are you absolutely sure? This will permanently delete your account, all wishlists, items, friends, and subscription data. This action cannot be undone.",
          { $id: "settings.account.deleteModalDescription" },
        )}
        confirmLabel={t("Delete My Account", {
          $id: "settings.account.deleteModalConfirm",
        })}
        isPending={deleteAccount.isPending}
      />
    </>
  );
}
