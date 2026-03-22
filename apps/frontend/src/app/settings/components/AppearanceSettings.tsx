"use client";

import { Sun, Moon, Monitor, Check } from "lucide-react";
import styles from "./AppearanceSettings.module.scss";
import { SettingsSection } from "./SettingsSection";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { WishlistAccent } from "@/types/wishlist";
import type { ThemePreference, WishlistColorIndex } from "@/types/settings";
import { useAppTheme } from "@/providers";

const THEMES: {
  id: ThemePreference;
  label: string;
  icon: typeof Sun;
  description: string;
}[] = [
  {
    id: "light",
    label: "Light",
    icon: Sun,
    description: "Clean and bright",
  },
  {
    id: "dark",
    label: "Dark",
    icon: Moon,
    description: "Easy on the eyes",
  },
  {
    id: "system",
    label: "System",
    icon: Monitor,
    description: "Match your device",
  },
];

const ACCENTS: { id: WishlistAccent; label: string; cssClass: string }[] = [
  { id: WishlistAccent.Pink, label: "Pink", cssClass: "pink" },
  { id: WishlistAccent.Blue, label: "Blue", cssClass: "blue" },
  { id: WishlistAccent.Peach, label: "Peach", cssClass: "peach" },
  { id: WishlistAccent.Mint, label: "Mint", cssClass: "mint" },
  { id: WishlistAccent.Lavender, label: "Lavender", cssClass: "lavender" },
];

// 0-based order used by user_settings.default_wishlist_color
const WISHLIST_COLORS: { id: WishlistColorIndex; label: string; cssClass: string }[] = [
  { id: 0, label: "Pink", cssClass: "pink" },
  { id: 1, label: "Peach", cssClass: "peach" },
  { id: 2, label: "Blue", cssClass: "blue" },
  { id: 3, label: "Lavender", cssClass: "lavender" },
  { id: 4, label: "Mint", cssClass: "mint" },
];

export function AppearanceSettings() {
  const { persistedTheme, setPersistedTheme } = useAppTheme();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  function handleTheme(theme: ThemePreference) {
    setPersistedTheme(theme);
    updateSettings.mutate({ theme });
  }

  function handleAccent(accent: WishlistAccent) {
    updateSettings.mutate({ default_accent: accent });
  }

  function handleWishlistColor(colorIndex: WishlistColorIndex) {
    updateSettings.mutate({ default_wishlist_color: colorIndex });
  }

  const activeAccent = settings?.default_accent ?? WishlistAccent.Pink;
  const activeWishlistColor = settings?.default_wishlist_color ?? 0;

  return (
    <>
      <SettingsSection
        title="Theme"
        description="Select your preferred color scheme."
      >
        <div className={styles.themeGrid}>
          {THEMES.map((t) => {
            const Icon = t.icon;
            const isActive = persistedTheme === t.id;

            return (
              <button
                key={t.id}
                type="button"
                className={`${styles.themeCard} ${isActive ? styles.active : ""}`}
                onClick={() => handleTheme(t.id)}
              >
                <div className={styles.themeIcon}>
                  <Icon size={22} />
                </div>
                <span className={styles.themeLabel}>{t.label}</span>
                <span className={styles.themeDesc}>{t.description}</span>
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
        title="Default Accent Color"
        description="Pre-selected color when creating new wishlists."
      >
        <div className={styles.accentGrid}>
          {ACCENTS.map((a) => (
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
          {ACCENTS.find((a) => a.id === activeAccent)?.label ?? "Pink"}
        </p>
      </SettingsSection>

      <SettingsSection
        title="Default Wishlist Color"
        description="Pre-selected wishlist color when creating new wishlists."
      >
        <div className={styles.accentGrid}>
          {WISHLIST_COLORS.map((a) => (
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
          {WISHLIST_COLORS.find((a) => a.id === activeWishlistColor)?.label ??
            "Pink"}
        </p>
      </SettingsSection>
    </>
  );
}
