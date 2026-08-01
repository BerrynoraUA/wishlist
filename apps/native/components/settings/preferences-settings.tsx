import { PriorityFilterIcon } from "@/components/items/item-labels";
import {
  settingsDropdownContentClassName,
  settingsDropdownOptionClassName,
  settingsDropdownTriggerClassName,
} from "@/components/settings/settings-dropdown-styles";
import { SettingsSection } from "@/components/settings/settings-section";
import { CurrencySettings } from "@/components/settings/currency-settings";
import {
  AutocompleteDropdown,
  type AutocompleteDropdownOption,
} from "@/components/ui/autocomplete-dropdown";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { useHideBackButton } from "@/hooks/use-hide-back-button";
import { useProGate } from "@/hooks/use-pro-gate";
import { useUpdateSettings } from "@/hooks/use-settings";
import { countryForLocale } from "@/lib/locale-flags";
import type { TranslateFn } from "@/lib/translate-fn";
import { cn } from "@/lib/utils";
import { ALL_PRIORITIES } from "@wishlist/backend/lib";
import { useGT, useLocale, useLocales, useSetLocale } from "gt-react-native";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  EyeOff,
  Languages,
  ListFilter,
  SlidersHorizontal,
} from "lucide-react-native";
import * as React from "react";
import { Pressable, View } from "react-native";

const LOCALIZED_LOCALE_LABELS: Record<string, string> = {
  en: "English",
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

export function PreferencesSettings({
  selectedPriorities,
  selectedCurrency,
}: {
  selectedPriorities?: string[];
  selectedCurrency: string;
}) {
  const t = useGT();
  const activeLocale = useLocale();
  const locales = useLocales();
  const setLocale = useSetLocale();
  const updateSettings = useUpdateSettings();
  const { isPro, openPaywall } = useProGate();
  const [hideBackButton, setHideBackButton] = useHideBackButton();
  const showBackButton = !hideBackButton;
  const [localeError, setLocaleError] = React.useState<string | null>(null);
  const [prioritiesExpanded, setPrioritiesExpanded] = React.useState(false);

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
  const priorities =
    selectedPriorities ??
    ALL_PRIORITIES.filter((priority) => priority.is_free).map((priority) => priority.id);

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

  function togglePriority(id: string) {
    const priority = ALL_PRIORITIES.find((item) => item.id === id);
    if (!isPro && priority && !priority.is_free) {
      openPaywall();
      return;
    }

    const next = priorities.includes(id)
      ? priorities.filter((priorityId) => priorityId !== id)
      : [...priorities, id];

    if (next.length === 0) return;
    updateSettings.mutate({ selected_priorities: next });
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
          emptyText={t("No languages found")}
        />
        {localeError ? (
          <Text selectable className="text-sm font-semibold text-destructive">
            {localeError}
          </Text>
        ) : null}
      </View>

      <CurrencySettings selectedCurrency={selectedCurrency} />

      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <Icon as={ListFilter} className="size-4 text-brand" />
          <Text className="text-sm font-semibold text-text">{t("Item Priorities")}</Text>
        </View>
        <View className="gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: prioritiesExpanded }}
            accessibilityLabel={t("Toggle item priorities")}
            onPress={() => setPrioritiesExpanded((current) => !current)}
            className={cn(
              settingsDropdownTriggerClassName,
              "flex-row items-center justify-between gap-3 active:bg-bg-subtle",
            )}
          >
            <Text className="min-w-0 flex-1 font-semibold text-text" numberOfLines={2}>
              {getPrioritySummary(priorities, t)}
            </Text>
            <Icon
              as={ChevronDown}
              className={cn("size-4 shrink-0 text-text-muted", prioritiesExpanded && "rotate-180")}
            />
          </Pressable>

          {prioritiesExpanded ? (
            <View className={cn(settingsDropdownContentClassName, "gap-1")}>
              {ALL_PRIORITIES.map((priority) => (
                <Pressable
                  key={priority.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: priorities.includes(priority.id),
                    disabled:
                      priorities.length === 1 &&
                      priorities.includes(priority.id) &&
                      (isPro || priority.is_free),
                  }}
                  disabled={
                    priorities.length === 1 &&
                    priorities.includes(priority.id) &&
                    (isPro || priority.is_free)
                  }
                  onPress={() => togglePriority(priority.id)}
                  className={cn(
                    settingsDropdownOptionClassName,
                    "flex-row items-center gap-3 disabled:opacity-50",
                  )}
                >
                  <View className="size-5 items-center justify-center">
                    {priorities.includes(priority.id) ? (
                      <Icon as={Check} className="size-4 text-text" />
                    ) : null}
                  </View>
                  <PriorityFilterIcon priority={priority} />
                  <Text
                    className="min-w-0 flex-1 text-sm font-semibold text-text"
                    numberOfLines={1}
                  >
                    {t(priority.name)}
                  </Text>
                  {!isPro && !priority.is_free ? (
                    <Text className="text-xs font-bold text-brand">{t("Pro")}</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View
        className={cn(
          "gap-4 overflow-hidden rounded-xl border p-4 shadow-sm",
          showBackButton
            ? "border-brand/30 bg-brand-lighter shadow-brand/10"
            : "border-border-subtle bg-card-bg shadow-black/5",
        )}
      >
        <View className="flex-row items-center justify-between gap-4">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-3">
              <View
                className={cn(
                  "size-11 items-center justify-center rounded-full",
                  showBackButton
                    ? "bg-linear-135 from-brand via-accent to-secondary"
                    : "bg-bg-muted",
                )}
              >
                <Icon
                  as={showBackButton ? ChevronLeft : EyeOff}
                  className={cn("size-5", showBackButton ? "text-white" : "text-text-muted")}
                />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-semibold text-text">{t("Show back button")}</Text>
                <Text className="text-xs font-semibold uppercase text-text-muted">
                  {showBackButton ? t("Button visible") : t("Gesture navigation")}
                </Text>
              </View>
            </View>
          </View>
          <Switch
            checked={showBackButton}
            onCheckedChange={(visible) => setHideBackButton(!visible)}
          />
        </View>
      </View>
    </SettingsSection>
  );
}

function getPrioritySummary(priorityIds: string[], translate: TranslateFn) {
  const selectedNames = ALL_PRIORITIES.filter((priority) => priorityIds.includes(priority.id)).map(
    (priority) => priority.name,
  );

  if (selectedNames.length <= 2) {
    return selectedNames.join(", ");
  }

  return translate("{count} priorities selected", { count: selectedNames.length });
}
