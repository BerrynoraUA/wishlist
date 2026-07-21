"use client";

import styles from "./ProfileMenu.module.scss";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Crown,
  Settings,
  Lightbulb,
  Bug,
  Languages,
  ChevronDown,
  Check,
  UserPlus,
  X,
} from "lucide-react";
import { useGT, useLocale, useLocales } from "gt-next";
import { useSetLocale } from "gt-next/client";
import { logout } from "@/api/login";
import { useSubscription } from "@/hooks/use-subscription";
import { ProBadge } from "@/components/ui/ProBadge/ProBadge";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal/DeleteConfirmModal";
import { useProfile } from "@/hooks/use-settings";
import { useCurrentUser } from "@/hooks/use-user";
import { useKnownAccounts } from "@/hooks/use-known-accounts";
import { upsertKnownAccount } from "@/lib/known-accounts";
import { switchAccount } from "@/lib/account-switch";
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";
import {
  DEFAULT_ACCENT,
  DEFAULT_THEME_PREFERENCE,
  applyThemeAndAccentSynchronously,
} from "@/lib/theme";
import type { KnownAccount } from "@/types/known-accounts";

type Props = {
  onOpen?: () => void;
};

function getAddAccountHref() {
  const params = new URLSearchParams({
    redirect_to:
      typeof window === "undefined"
        ? "/home"
        : `${window.location.pathname}${window.location.search}`,
    account_mode: "add",
  });

  return `/login?${params.toString()}`;
}

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  uk: "Українська",
};

export function ProfileMenu({ onOpen }: Props) {
  const t = useGT();
  const router = useRouter();
  const locale = useLocale();
  const locales = useLocales();
  const setLocale = useSetLocale();
  const { isPro } = useSubscription();
  const { data: profile } = useProfile();
  const { data: currentUser } = useCurrentUser();

  const [open, setOpen] = useState(false);
  const [languageListOpen, setLanguageListOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [switchingUserId, setSwitchingUserId] = useState<string | null>(null);
  const [accountPendingRemoval, setAccountPendingRemoval] = useState<KnownAccount | null>(null);

  const { accounts, removeAccount } = useKnownAccounts();

  const ref = useRef<HTMLDivElement>(null);
  const userEmail = currentUser?.email ?? "";
  const userId = currentUser?.id ?? null;
  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : "S";

  useEffect(() => {
    if (!open) {
      setLanguageListOpen(false);
      setAccountPendingRemoval(null);
    }
  }, [open]);

  useEffect(() => {
    if (!userId || !userEmail) return;
    upsertKnownAccount({
      userId,
      email: userEmail,
      displayName: profile?.display_name ?? profile?.nickname ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    });
  }, [userId, userEmail, profile?.display_name, profile?.nickname, profile?.avatar_url]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountPendingRemoval) {
        return;
      }

      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [accountPendingRemoval]);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      setOpen(false);
      router.push("/login");
    } catch {
      /* logout failed — user can retry */
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleSwitchAccount(account: KnownAccount) {
    if (switchingUserId) return;
    setSwitchingUserId(account.userId);
    try {
      await switchAccount(account, {
        onRedirect: (href) => {
          setOpen(false);
          router.push(href);
        },
      });
    } catch {
      setSwitchingUserId(null);
    }
  }

  function handleRemoveAccount(event: React.MouseEvent, account: KnownAccount) {
    event.stopPropagation();
    setAccountPendingRemoval(account);
  }

  function confirmRemoveAccount() {
    if (!accountPendingRemoval) return;
    removeAccount(accountPendingRemoval.userId);
    setAccountPendingRemoval(null);
  }

  function handleAddAccount() {
    applyThemeAndAccentSynchronously({
      theme: DEFAULT_THEME_PREFERENCE,
      accent: DEFAULT_ACCENT,
    });
    setOpen(false);
    router.push(getAddAccountHref());
  }

  function toggleOpen() {
    if (!open && onOpen) onOpen();
    setOpen((prev) => !prev);
  }

  const avatarUrl = profile?.avatar_url ?? null;
  const displayInitial = (
    profile?.display_name ??
    profile?.nickname ??
    userEmail ??
    userInitial ??
    "S"
  )
    .charAt(0)
    .toUpperCase();

  const activeLocale = locale ?? locales[0] ?? "en";
  const localeOptions = locales?.length ? locales : ["en", "uk"];

  const otherAccounts = accounts.filter((account) => account.userId !== userId);
  const pendingRemovalLabel =
    accountPendingRemoval?.displayName?.trim() ||
    accountPendingRemoval?.email ||
    accountPendingRemoval?.userId ||
    "";

  return (
    <div className={styles.profile} ref={ref}>
      <button type="button" className={styles.avatarButton} onClick={toggleOpen}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={t("Avatar", { $id: "profile.avatarAlt" })}
            className={styles.avatarImg}
          />
        ) : (
          displayInitial
        )}
        {SUBSCRIPTIONS_UI_ENABLED && isPro && (
          <span className={styles.avatarProBadge}>
            <ProBadge size="sm" />
          </span>
        )}
      </button>

      {open && (
        <div className={styles.profileMenu}>
          <div className={styles.profileHeader}>
            <div
              className={styles.profileInitial}
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer" }}
              onClick={() => {
                setOpen(false);
                router.push("/settings");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpen(false);
                  router.push("/settings");
                }
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={t("Avatar", { $id: "profile.avatarAlt" })}
                  className={styles.avatarImg}
                />
              ) : (
                displayInitial
              )}
            </div>
            <div className={styles.profileMeta}>
              <span className={styles.profileName}>
                {profile?.display_name || t("Account", { $id: "profile.account" })}
              </span>
              <span className={styles.profileEmail} title={userEmail || undefined}>
                {userEmail || t("Signed in", { $id: "profile.signedIn" })}
              </span>
            </div>
          </div>

          <div className={styles.languageSection}>
            <button
              type="button"
              className={styles.languageButton}
              aria-expanded={languageListOpen}
              aria-controls="profile-language-list"
              id="profile-language-trigger"
              onClick={() => setLanguageListOpen((v) => !v)}
            >
              <Languages size={16} aria-hidden />
              <span className={styles.languageButtonLabel}>
                <span className={styles.languageLabelText}>
                  {t("Language", { $id: "profile.language" })}
                </span>
                <span className={styles.languageButtonValue}>
                  {LOCALE_LABELS[activeLocale] ?? activeLocale}
                </span>
              </span>
              <ChevronDown
                size={16}
                aria-hidden
                className={
                  languageListOpen
                    ? `${styles.languageChevron} ${styles.languageChevronOpen}`
                    : styles.languageChevron
                }
              />
            </button>
            {languageListOpen && (
              <ul
                id="profile-language-list"
                className={styles.languageList}
                role="listbox"
                aria-labelledby="profile-language-trigger"
              >
                {localeOptions.map((code) => {
                  const selected = activeLocale === code;
                  return (
                    <li key={code} className={styles.languageListItem}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={styles.languageOption}
                        onClick={() => {
                          setLocale(code);
                          router.refresh();
                          setLanguageListOpen(false);
                        }}
                      >
                        <span
                          className={styles.languageCheckbox}
                          aria-hidden
                          data-selected={selected}
                        >
                          {selected ? <Check size={12} strokeWidth={3} /> : null}
                        </span>
                        <span>{LOCALE_LABELS[code] ?? code}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {SUBSCRIPTIONS_UI_ENABLED && (
            <button
              type="button"
              className={styles.menuItemSub}
              onClick={() => {
                setOpen(false);
                router.push("/subscription");
              }}
            >
              <Crown size={16} />
              <span>{t("Subscription", { $id: "profile.subscription" })}</span>
              {isPro && <ProBadge size="sm" />}
            </button>
          )}

          <button
            type="button"
            className={styles.menuItemSub}
            onClick={() => {
              setOpen(false);
              router.push("/ideas");
            }}
          >
            <Lightbulb size={16} />
            <span>{t("Request a Feature", { $id: "profile.requestFeature" })}</span>
          </button>

          <button
            type="button"
            className={styles.menuItemSub}
            onClick={() => {
              setOpen(false);
              router.push("/bugs");
            }}
          >
            <Bug size={16} />
            <span>{t("Report a Bug", { $id: "profile.reportBug" })}</span>
          </button>

          <button
            type="button"
            className={styles.menuItemSub}
            onClick={() => {
              setOpen(false);
              router.push("/settings");
            }}
          >
            <Settings size={16} />
            <span>{t("Settings", { $id: "profile.settings" })}</span>
          </button>

          <div className={styles.accountsSection}>
            <div className={styles.accountsLabel}>
              {t("Accounts", { $id: "profile.accounts.label" })}
            </div>
            <ul className={styles.accountsList}>
              {otherAccounts.map((account) => {
                const label = account.displayName?.trim() || account.email || account.userId;
                const initial = (account.displayName?.trim() || account.email || "?")
                  .charAt(0)
                  .toUpperCase();
                const isSwitching = switchingUserId === account.userId;
                return (
                  <li key={account.userId} className={styles.accountRow}>
                    <button
                      type="button"
                      className={styles.accountButton}
                      onClick={() => handleSwitchAccount(account)}
                      disabled={!!switchingUserId}
                      aria-label={t("Switch to {name}", {
                        $id: "profile.accounts.switchAria",
                        name: label,
                      })}
                    >
                      <span className={styles.accountAvatar} aria-hidden>
                        {account.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={account.avatarUrl}
                            alt=""
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span className={styles.accountInitial}>{initial}</span>
                        )}
                      </span>
                      <span className={styles.accountMeta}>
                        <span className={styles.accountName}>{label}</span>
                        {account.email && account.email !== label && (
                          <span className={styles.accountEmail}>{account.email}</span>
                        )}
                        {isSwitching && (
                          <span className={styles.accountEmail}>
                            {t("Switching…", {
                              $id: "profile.accounts.switching",
                            })}
                          </span>
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.removeAccountBtn}
                      onClick={(event) => handleRemoveAccount(event, account)}
                      disabled={!!switchingUserId}
                      aria-label={t("Remove saved account", {
                        $id: "profile.accounts.removeAria",
                      })}
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </li>
                );
              })}
              <li className={styles.accountRow}>
                <button
                  type="button"
                  className={styles.accountButton}
                  onClick={handleAddAccount}
                  disabled={isLoggingOut || !!switchingUserId}
                  aria-label={t("Add account", {
                    $id: "profile.accounts.addAria",
                  })}
                >
                  <span className={styles.accountAvatar} aria-hidden>
                    <UserPlus size={14} />
                  </span>
                  <span className={styles.accountMeta}>
                    <span className={styles.accountName}>
                      {t("Add account", { $id: "profile.accounts.addLabel" })}
                    </span>
                  </span>
                </button>
              </li>
            </ul>
          </div>

          <button
            type="button"
            className={styles.menuItem}
            onClick={handleLogout}
            disabled={isLoggingOut || !!switchingUserId}
          >
            <LogOut size={16} />
            <span>
              {isLoggingOut
                ? t("Logging out...", { $id: "profile.loggingOut" })
                : t("Log out", { $id: "profile.logOut" })}
            </span>
          </button>

          <DeleteConfirmModal
            open={!!accountPendingRemoval}
            onClose={() => setAccountPendingRemoval(null)}
            onConfirm={confirmRemoveAccount}
            title={t("Remove saved account", {
              $id: "profile.accounts.removeModalTitle",
            })}
            description={t(
              "Remove {name} from saved accounts on this device? You can add it again later by signing in.",
              {
                $id: "profile.accounts.removeModalDescription",
                name: pendingRemovalLabel,
              },
            )}
            confirmLabel={t("Remove account", {
              $id: "profile.accounts.removeModalConfirm",
            })}
          />
        </div>
      )}
    </div>
  );
}
