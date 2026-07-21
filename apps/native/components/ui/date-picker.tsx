import DateTimePicker, { type DateTimePickerChangeEvent } from "@expo/ui/community/datetime-picker";
import { useGT, useLocale } from "gt-react-native";
import * as React from "react";
import { View } from "react-native";
import { useUniwind, useCSSVariable } from "uniwind";
import { getThemeMode } from "@/lib/theme";

type DatePickerRenderProps = {
  displayValue: string;
  openPicker: () => void;
};

type DatePickerProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  children: (props: DatePickerRenderProps) => React.ReactNode;
  iosContainerClassName?: string;
};

function parseDateFieldValue(value: string | null) {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return date;
}

function formatDateFieldValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function DatePicker({ value, onChange, children, iosContainerClassName }: DatePickerProps) {
  const t = useGT();
  const locale = useLocale();
  const { theme } = useUniwind();
  const [iosPickerOpen, setIosPickerOpen] = React.useState(false);
  const [androidPickerOpen, setAndroidPickerOpen] = React.useState(false);
  const date = React.useMemo(() => parseDateFieldValue(value) ?? new Date(), [value]);
  const datePickerAccentColor = useCSSVariable("--color-primary") as string | undefined;
  const themeVariant = getThemeMode(theme);
  const displayValue = React.useMemo(
    () =>
      `${date.getDate()} ${new Intl.DateTimeFormat(locale ?? "en", {
        month: "long",
      }).format(date)} ${date.getFullYear()}`,
    [date, locale],
  );

  function handleDateValueChange(_: DateTimePickerChangeEvent, selectedDate: Date) {
    onChange(formatDateFieldValue(selectedDate));
    setAndroidPickerOpen(false);
  }

  function openPicker() {
    if (process.env.EXPO_OS === "android") {
      setAndroidPickerOpen(true);
      return;
    }

    setIosPickerOpen((open) => !open);
  }

  return (
    <>
      {children({ displayValue, openPicker })}

      {process.env.EXPO_OS === "android" && androidPickerOpen ? (
        <DateTimePicker
          value={date}
          mode="date"
          accentColor={datePickerAccentColor}
          positiveButton={{ label: t("OK") }}
          negativeButton={{ label: t("Cancel") }}
          onValueChange={handleDateValueChange}
          onDismiss={() => setAndroidPickerOpen(false)}
        />
      ) : null}

      {process.env.EXPO_OS === "ios" && iosPickerOpen ? (
        <View className={iosContainerClassName}>
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            accentColor={datePickerAccentColor}
            themeVariant={themeVariant}
            onValueChange={handleDateValueChange}
            style={{ alignSelf: "stretch" }}
          />
        </View>
      ) : null}
    </>
  );
}
