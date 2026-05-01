"use client";

import { useMemo } from "react";
import { useGT } from "gt-next";
import { useRouter } from "next/navigation";
import { Sun, Moon, Monitor, Check, Lock } from "lucide-react";
import styles from "./AppearanceSettings.module.scss";
import { SettingsSection } from "../settings-section/SettingsSection";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useSubscription } from "@/hooks/use-subscription";
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";
import { WishlistAccent } from "@/types/wishlist";
import type { ThemePreference, WishlistColorIndex } from "@/types/settings";
import { useAppTheme } from "@/providers";
import { CurrencySettings } from "../currency-settings/CurrencySettings";
import {
  getWishlistAccentSwatches,
  getWishlistColorSwatches,
} from "@/lib/constants/wishlist";
import { ALL_PRIORITIES, PRIORITY_IDS } from "@/lib/priorities";
import { PRIORITY_ICONS } from "@/lib/priority-icons";

export function AppearanceSettings() {
  const t = useGT();
  const router = useRouter();
  const { persistedTheme, setPersistedTheme } = useAppTheme();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { isPro } = useSubscription();
  const isAccentGated = SUBSCRIPTIONS_UI_ENABLED && !isPro;
  const isWishlistColorGated = SUBSCRIPTIONS_UI_ENABLED && !isPro;
  const isPriorityGated = SUBSCRIPTIONS_UI_ENABLED && !isPro;

  const selectedPriorities = settings?.selected_priorities ?? [
    PRIORITY_IDS.LOW,
    PRIORITY_IDS.MEDIUM,
    PRIORITY_IDS.HIGH,
  ];

  function handlePriorityToggle(id: string, isFree: boolean) {
    if (isPriorityGated && !isFree) {
      router.push("/subscription");
      return;
    }
    const next = selectedPriorities.includes(id)
      ? selectedPriorities.filter((p) => p !== id)
      : [...selectedPriorities, id];
    if (next.length === 0) return;
    updateSettings.mutate({ selected_priorities: next });
  }

  function handleTheme(theme: ThemePreference) {
    setPersistedTheme(theme);
  }

  function handleAccent(accent: WishlistAccent) {
    if (isAccentGated && accent !== WishlistAccent.Pink) {
      router.push("/subscription");
      return;
    }
    updateSettings.mutate({ default_accent: accent });
  }

  function handleWishlistColor(colorIndex: WishlistColorIndex) {
    if (isWishlistColorGated && colorIndex !== 0) {
      router.push("/subscription");
      return;
    }
    updateSettings.mutate({ default_wishlist_color: colorIndex });
  }

  const activeAccent = settings?.default_accent ?? WishlistAccent.Pink;
  const activeWishlistColor = settings?.default_wishlist_color ?? 0;

  const themes = useMemo(
    () =>
      [
        {
          id: "light" as const,
          label: t("Light", { $id: "settings.appearance.theme.light" }),
          icon: Sun,
          description: t("Clean and bright", {
            $id: "settings.appearance.theme.lightDesc",
          }),
        },
        {
          id: "dark" as const,
          label: t("Dark", { $id: "settings.appearance.theme.dark" }),
          icon: Moon,
          description: t("Easy on the eyes", {
            $id: "settings.appearance.theme.darkDesc",
          }),
        },
        {
          id: "system" as const,
          label: t("System", { $id: "settings.appearance.theme.system" }),
          icon: Monitor,
          description: t("Match your device", {
            $id: "settings.appearance.theme.systemDesc",
          }),
        },
      ] satisfies {
        id: ThemePreference;
        label: string;
        icon: typeof Sun;
        description: string;
      }[],
    [t],
  );

  const accents = useMemo(() => getWishlistAccentSwatches(t), [t]);

  const wishlistColors = useMemo(() => getWishlistColorSwatches(t), [t]);

  const defaultColorLabel = t("Pink", {
    $id: "settings.appearance.wishlistColor.pink",
  });

  return (
    <>
      <SettingsSection
        title={t("Theme", { $id: "settings.appearance.themeSectionTitle" })}
        description={t("Select your preferred color scheme.", {
          $id: "settings.appearance.themeSectionDescription",
        })}
      >
        <div className={styles.themeGrid}>
          {themes.map((theme) => {
            const Icon = theme.icon;
            const isActive = persistedTheme === theme.id;

            return (
              <button
                key={theme.id}
                type="button"
                className={`${styles.themeCard} ${isActive ? styles.active : ""}`}
                onClick={() => handleTheme(theme.id)}
              >
                <div className={styles.themeIcon}>
                  <Icon size={22} />
                </div>
                <span className={styles.themeLabel}>{theme.label}</span>
                <span className={styles.themeDesc}>{theme.description}</span>
                {isActive && (
                  <div className={styles.themeCheck}>
                    <Check size={14} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title={t("Default Accent Color", {
          $id: "settings.appearance.accentSectionTitle",
        })}
        description={t("Secondary platform color used across the interface.", {
          $id: "settings.appearance.accentSectionDescription",
        })}
      >
        <div className={styles.accentGrid}>
          {accents.map((a) => {
            const locked = isAccentGated && a.id !== WishlistAccent.Pink;
            return (
              <button
                key={a.id}
                type="button"
                className={`${styles.accentSwatch} ${styles[a.cssClass]} ${activeAccent === a.id ? styles.active : ""} ${locked ? styles.locked : ""}`}
                onClick={() => handleAccent(a.id)}
                title={
                  locked
                    ? t("Upgrade to Pro", {
                        $id: "settings.appearance.accent.upgradeToPro",
                      })
                    : a.label
                }
              >
                {locked ? (
                  <Lock size={14} />
                ) : (
                  activeAccent === a.id && <Check size={16} />
                )}
              </button>
            );
          })}
        </div>
        <p className={styles.accentLabel}>
          {accents.find((a) => a.id === activeAccent)?.label ??
            defaultColorLabel}
        </p>
      </SettingsSection>

      <SettingsSection
        title={t("Default Wishlist Color", {
          $id: "settings.appearance.wishlistColorSectionTitle",
        })}
        description={t("Pre-selected color when creating new wishlists.", {
          $id: "settings.appearance.wishlistColorSectionDescription",
        })}
      >
        <div className={styles.accentGrid}>
          {wishlistColors.map((a) => {
            const locked = isWishlistColorGated && a.id !== 0;
            return (
              <button
                key={a.id}
                type="button"
                className={`${styles.accentSwatch} ${styles[a.cssClass]} ${activeWishlistColor === a.id ? styles.active : ""} ${locked ? styles.locked : ""}`}
                onClick={() => handleWishlistColor(a.id)}
                title={
                  locked
                    ? t("Upgrade to Pro", {
                        $id: "settings.appearance.wishlistColor.upgradeToPro",
                      })
                    : a.label
                }
              >
                {locked ? (
                  <Lock size={14} />
                ) : (
                  activeWishlistColor === a.id && <Check size={16} />
                )}
              </button>
            );
          })}
        </div>
        <p className={styles.accentLabel}>
          {wishlistColors.find((a) => a.id === activeWishlistColor)?.label ??
            defaultColorLabel}
        </p>
      </SettingsSection>

      <SettingsSection
        title={t("Item Priorities", {
          $id: "settings.appearance.prioritiesSectionTitle",
        })}
        description={t(
          "Choose which priority levels appear when adding or editing items.",
          { $id: "settings.appearance.prioritiesSectionDescription" },
        )}
      >
        <div className={styles.priorityList}>
          {ALL_PRIORITIES.map((p) => {
            const locked = isPriorityGated && !p.is_free;
            const active = selectedPriorities.includes(p.id);
            const Icon = PRIORITY_ICONS[p.id];
            return (
              <button
                key={p.id}
                type="button"
                className={`${styles.priorityRow} ${active ? styles.active : ""} ${locked ? styles.locked : ""}`}
                onClick={() => handlePriorityToggle(p.id, p.is_free)}
                title={
                  locked
                    ? t("Upgrade to Pro", {
                        $id: "settings.appearance.priority.upgradeToPro",
                      })
                    : p.name
                }
              >
                <span
                  className={styles.priorityRowIcon}
                  style={{ "--priority-color": p.color } as React.CSSProperties}
                >
                  {Icon && <Icon size={14} strokeWidth={2.5} />}
                </span>
                <span className={styles.priorityRowName}>{p.name}</span>
                {!p.is_free && (
                  <span className={styles.priorityRowPro}>
                    {locked ? <Lock size={10} /> : null}
                    Pro
                  </span>
                )}
                <span
                  className={`${styles.priorityRowCheck} ${active ? styles.checked : ""}`}
                >
                  {active && <Check size={10} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <CurrencySettings />
    </>
  );
}
