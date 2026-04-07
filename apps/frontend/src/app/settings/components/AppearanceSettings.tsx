"use client";

import { useMemo } from "react";
import { useGT } from "gt-next";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import styles from "./AppearanceSettings.module.scss";
import { SettingsSection } from "./SettingsSection";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { WishlistAccent } from "@/types/wishlist";
import type { ThemePreference, WishlistColorIndex } from "@/types/settings";
import { useAppTheme } from "@/providers";
import { CurrencySettings } from "./CurrencySettings";

const ACCENT_ENTRIES: { id: WishlistAccent; cssClass: string }[] = [
  { id: WishlistAccent.Pink, cssClass: "pink" },
  { id: WishlistAccent.Blue, cssClass: "blue" },
  { id: WishlistAccent.Peach, cssClass: "peach" },
  { id: WishlistAccent.Mint, cssClass: "mint" },
  { id: WishlistAccent.Lavender, cssClass: "lavender" },
];

const WISHLIST_COLOR_ENTRIES: { id: WishlistColorIndex; cssClass: string }[] = [
  { id: 0, cssClass: "pink" },
  { id: 1, cssClass: "peach" },
  { id: 2, cssClass: "blue" },
  { id: 3, cssClass: "lavender" },
  { id: 4, cssClass: "mint" },
];

export function AppearanceSettings() {
  const t = useGT();
  const { persistedTheme, setPersistedTheme } = useAppTheme();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  function handleTheme(theme: ThemePreference) {
    setPersistedTheme(theme);
  }

  function handleAccent(accent: WishlistAccent) {
    updateSettings.mutate({ default_accent: accent });
  }

  function handleWishlistColor(colorIndex: WishlistColorIndex) {
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

  const accents = useMemo(
    () =>
      ACCENT_ENTRIES.map((a) => ({
        ...a,
        label:
          a.cssClass === "pink"
            ? t("Pink", { $id: "settings.appearance.accent.pink" })
            : a.cssClass === "blue"
              ? t("Blue", { $id: "settings.appearance.accent.blue" })
              : a.cssClass === "peach"
                ? t("Peach", { $id: "settings.appearance.accent.peach" })
                : a.cssClass === "mint"
                  ? t("Mint", { $id: "settings.appearance.accent.mint" })
                  : t("Lavender", {
                      $id: "settings.appearance.accent.lavender",
                    }),
      })),
    [t],
  );

  const wishlistColors = useMemo(
    () =>
      WISHLIST_COLOR_ENTRIES.map((a) => ({
        ...a,
        label:
          a.cssClass === "pink"
            ? t("Pink", { $id: "settings.appearance.wishlistColor.pink" })
            : a.cssClass === "peach"
              ? t("Peach", {
                  $id: "settings.appearance.wishlistColor.peach",
                })
              : a.cssClass === "blue"
                ? t("Blue", {
                    $id: "settings.appearance.wishlistColor.blue",
                  })
                : a.cssClass === "lavender"
                  ? t("Lavender", {
                      $id: "settings.appearance.wishlistColor.lavender",
                    })
                  : t("Mint", {
                      $id: "settings.appearance.wishlistColor.mint",
                    }),
      })),
    [t],
  );

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
        description={t(
          "Secondary platform color used across the interface.",
          { $id: "settings.appearance.accentSectionDescription" },
        )}
      >
        <div className={styles.accentGrid}>
          {accents.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`${styles.accentSwatch} ${styles[a.cssClass]} ${activeAccent === a.id ? styles.active : ""}`}
              onClick={() => handleAccent(a.id)}
              title={a.label}
            >
              {activeAccent === a.id && <Check size={16} />}
            </button>
          ))}
        </div>
        <p className={styles.accentLabel}>
          {accents.find((a) => a.id === activeAccent)?.label ?? defaultColorLabel}
        </p>
      </SettingsSection>

      <SettingsSection
        title={t("Default Wishlist Color", {
          $id: "settings.appearance.wishlistColorSectionTitle",
        })}
        description={t(
          "Pre-selected color when creating new wishlists.",
          { $id: "settings.appearance.wishlistColorSectionDescription" },
        )}
      >
        <div className={styles.accentGrid}>
          {wishlistColors.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`${styles.accentSwatch} ${styles[a.cssClass]} ${activeWishlistColor === a.id ? styles.active : ""}`}
              onClick={() => handleWishlistColor(a.id)}
              title={a.label}
            >
              {activeWishlistColor === a.id && <Check size={16} />}
            </button>
          ))}
        </div>
        <p className={styles.accentLabel}>
          {wishlistColors.find((a) => a.id === activeWishlistColor)?.label ??
            defaultColorLabel}
        </p>
      </SettingsSection>

      <CurrencySettings />
    </>
  );
}
