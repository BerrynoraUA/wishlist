import { PriorityFilterIcon } from "@/components/items/item-labels";
import {
  settingsDropdownContentClassName,
  settingsDropdownOptionClassName,
  settingsDropdownTriggerClassName,
} from "@/components/settings/settings-dropdown-styles";
import { SettingsSection } from "@/components/settings/settings-section";
import { CurrencySettings } from "@/components/settings/currency-settings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { useHideBackButton } from "@/hooks/use-hide-back-button";
import { useUpdateSettings } from "@/hooks/use-settings";
import type { TranslateFn } from "@/lib/translate-fn";
import { cn } from "@/lib/utils";
import { useSubscriptionManager } from "@/providers/subscription-provider";
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
  const { isPro } = useSubscriptionManager();
  const [hideBackButton, setHideBackButton] = useHideBackButton();
  const [prioritiesExpanded, setPrioritiesExpanded] = React.useState(false);

  const localeCode = activeLocale ?? locales[0] ?? "en";
  const activeLocaleDisplay = LOCALIZED_LOCALE_LABELS[localeCode] ?? localeCode;
  const priorities =
    selectedPriorities ??
    ALL_PRIORITIES.filter((priority) => priority.is_free).map((priority) => priority.id);
  function togglePriority(id: string) {
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(settingsDropdownTriggerClassName, "justify-between")}
            >
              <Text className="font-semibold text-text">{activeLocaleDisplay}</Text>
              <Icon as={ChevronDown} className="size-4 text-text-muted" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className={cn(settingsDropdownContentClassName, "w-72")}>
            <DropdownMenuRadioGroup value={localeCode} onValueChange={(value) => setLocale(value)}>
              {locales.map((code) => (
                <DropdownMenuRadioItem
                  key={code}
                  value={code}
                  className={settingsDropdownOptionClassName}
                >
                  <Text className="text-sm font-semibold text-popover-foreground">
                    {LOCALIZED_LOCALE_LABELS[code] ?? code}
                  </Text>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
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
                    disabled: priorities.length === 1 && priorities.includes(priority.id),
                  }}
                  disabled={priorities.length === 1 && priorities.includes(priority.id)}
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
          hideBackButton
            ? "border-brand/30 bg-brand-lighter shadow-brand/10"
            : "border-border-subtle bg-card-bg shadow-black/5",
        )}
      >
        <View className="flex-row items-start justify-between gap-4">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-3">
              <View
                className={cn(
                  "size-11 items-center justify-center rounded-full",
                  hideBackButton
                    ? "bg-linear-135 from-brand via-accent to-secondary"
                    : "bg-bg-muted",
                )}
              >
                <Icon
                  as={hideBackButton ? EyeOff : ChevronLeft}
                  className={cn("size-5", hideBackButton ? "text-white" : "text-brand")}
                />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-semibold text-text">{t("Hide back button")}</Text>
                <Text className="text-xs font-semibold uppercase text-text-muted">
                  {hideBackButton ? t("Gesture navigation") : t("Button visible")}
                </Text>
              </View>
            </View>
          </View>
          <Switch checked={hideBackButton} onCheckedChange={setHideBackButton} />
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
