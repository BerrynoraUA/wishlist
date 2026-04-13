"use client";

import styles from "./ProfileMenu.module.scss";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Crown,
  Settings,
  TreePine,
  Lightbulb,
  Languages,
  ChevronDown,
  Check,
} from "lucide-react";
import { useGT, useLocale, useLocales } from "gt-next";
import { useSetLocale } from "gt-next/client";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { logout } from "@/api/login";
import { useSubscription } from "@/hooks/use-subscription";
import { ProBadge } from "@/components/ui/ProBadge/ProBadge";
import { useProfile } from "@/hooks/use-settings";
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";

type Props = {
  onOpen?: () => void;
};

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

  const [open, setOpen] = useState(false);
  const [languageListOpen, setLanguageListOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userInitial, setUserInitial] = useState("S");

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabaseBrowser.auth
      .getUser()
      .then(({ data }) => {
        const email = data.user?.email;
        if (email) {
          setUserEmail(email);
          setUserInitial(email.charAt(0).toUpperCase());
        }
      })
      .catch(() => {
        setUserEmail("");
      });
  }, []);

  useEffect(() => {
    if (!open) setLanguageListOpen(false);
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

  return (
    <div className={styles.profile} ref={ref}>
      <button
        type="button"
        className={styles.avatarButton}
        onClick={toggleOpen}
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
                {t("Account", { $id: "profile.account" })}
              </span>
              <span
                className={styles.profileEmail}
                title={userEmail || undefined}
              >
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
                          {selected ? (
                            <Check size={12} strokeWidth={3} />
                          ) : null}
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
              router.push("/secret-santa");
            }}
          >
            <TreePine size={16} />
            <span>{t("Secret Santa", { $id: "profile.secretSanta" })}</span>
            <ProBadge
              size="sm"
              label={t("NEW", { $id: "profile.secretSanta.newBadge" })}
            />
          </button>

          <button
            type="button"
            className={styles.menuItemSub}
            onClick={() => {
              setOpen(false);
              router.push("/ideas");
            }}
          >
            <Lightbulb size={16} />
            <span>
              {t("Request a Feature", { $id: "profile.requestFeature" })}
            </span>
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

          <button
            type="button"
            className={styles.menuItem}
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut size={16} />
            <span>
              {isLoggingOut
                ? t("Logging out...", { $id: "profile.loggingOut" })
                : t("Log out", { $id: "profile.logOut" })}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
