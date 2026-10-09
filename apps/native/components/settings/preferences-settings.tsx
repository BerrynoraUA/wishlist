import { SettingsControlsToggleRow } from "@/components/settings/settings-controls";
import { SettingsSection } from "@/components/settings/settings-section";
import { CurrencySettings } from "@/components/settings/currency-settings";
import {
  AutocompleteDropdown,
  type AutocompleteDropdownOption,
} from "@/components/ui/autocomplete-dropdown";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useHideBackButton } from "@/hooks/use-hide-back-button";
import { useProGate } from "@/hooks/use-pro-gate";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { countryForLocale } from "@/lib/locale-flags";
import { useGT, useLocale, useLocales, useSetLocale } from "gt-react-native";
import { ChevronLeft, Eye, EyeOff, Lock, Languages, SlidersHorizontal } from "lucide-react-native";
import * as React from "react";
import { View } from "react-native";

const LOCALIZED_LOCALE_LABELS: Record<string, string> = {
  en: "English (UK)",
  "en-US": "English (US)",
  uk: "Українська",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  ja: "日本語",
  it: "Italiano",
  pt: "Português",
  zh: "中文",
  pl: "Polski",
  ko: "한국어",
  nl: "Nederlands",
  hi: "हिन्दी",
  tr: "Türkçe",
  vi: "Tiếng Việt",
  th: "ไทย",
  id: "Bahasa Indonesia",
  cs: "Čeština",
  sk: "Slovenčina",
  hu: "Magyar",
  ro: "Română",
  bg: "Български",
  el: "Ελληνικά",
  sv: "Svenska",
  da: "Dansk",
  nb: "Norsk bokmål",
  fi: "Suomi",
  hr: "Hrvatski",
  sr: "Српски",
  sl: "Slovenščina",
  lt: "Lietuvių",
  lv: "Latviešu",
  et: "Eesti",
  bn: "বাংলা",
  ms: "Bahasa Melayu",
  fil: "Filipino",
  "zh-Hant": "繁體中文",
  ar: "العربية",
  he: "עברית",
  fa: "فارسی",
  ur: "اردو",
};

export function PreferencesSettings({ selectedCurrency }: { selectedCurrency: string }) {
  const t = useGT();
  const activeLocale = useLocale();
  const locales = useLocales();
  const setLocale = useSetLocale();
  const updateSettings = useUpdateSettings();
  const { isPro, openPaywall } = useProGate();
  const [hideBackButton, setHideBackButton] = useHideBackButton();
  const showBackButton = !hideBackButton;
  const { data: settings } = useSettings();
  const showsOwnReservations = isPro && Boolean(settings?.show_own_reservations);
  const ownReservationsIcon = !isPro ? Lock : showsOwnReservations ? Eye : EyeOff;
  const [localeError, setLocaleError] = React.useState<string | null>(null);

  const localeCode = activeLocale ?? locales[0] ?? "en";
  const localeOptions = React.useMemo<AutocompleteDropdownOption[]>(
    () =>
      locales.map((code) => ({
        value: code,
        label: LOCALIZED_LOCALE_LABELS[code] ?? code,
        displayValue: LOCALIZED_LOCALE_LABELS[code] ?? code,
        keywords: [code],
        flagCountry: countryForLocale(code),
      })),
    [locales],
  );
  const selectedLocaleOption = localeOptions.find((option) => option.value === localeCode) ?? null;

  async function selectLocale(option: AutocompleteDropdownOption) {
    if (option.value === localeCode) return;

    setLocaleError(null);

    try {
      // RTL changes reload the native app. Persist first so the reload cannot
      // interrupt the request and restore the previous locale from Supabase.
      await updateSettings.mutateAsync({ preferred_locale: option.value });
      setLocale(option.value);
    } catch (error) {
      setLocaleError(
        error instanceof Error ? error.message : t("Could not save the selected language."),
      );
    }
  }

  return (
    <SettingsSection id="preferences" title={t("Preferences")} icon={SlidersHorizontal}>
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <Icon as={Languages} className="size-4 text-brand" />
          <Text className="text-sm font-semibold text-text">{t("Language")}</Text>
        </View>
        <AutocompleteDropdown
          value={selectedLocaleOption}
          onValueChange={(option) => void selectLocale(option)}
          options={localeOptions}
          placeholder={t("Search language")}
          sheetTitle={t("Select a language")}
          emptyText={t("No languages found")}
        />
        {localeError ? (
          <Text selectable className="text-sm font-semibold text-destructive">
            {localeError}
          </Text>
        ) : null}
      </View>

      <CurrencySettings selectedCurrency={selectedCurrency} />

      <SettingsControlsToggleRow
        icon={showBackButton ? ChevronLeft : EyeOff}
        title={t("Show back button")}
        subtitle={showBackButton ? t("Button visible") : t("Gesture navigation")}
        checked={showBackButton}
        onCheckedChange={(visible) => setHideBackButton(!visible)}
      />

      <SettingsControlsToggleRow
        icon={ownReservationsIcon}
        title={t("Show reserved and purchased items")}
        subtitle={showsOwnReservations ? t("Spoilers on") : t("Surprise kept")}
        checked={showsOwnReservations}
        onCheckedChange={(value) => {
          if (!isPro) {
            openPaywall();
            return;
          }
          updateSettings.mutate({ show_own_reservations: value });
        }}
      />
    </SettingsSection>
  );
}
