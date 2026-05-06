import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useGT, useLocale } from "gt-react-native";
import * as React from "react";
import { View, type ColorValue } from "react-native";
import { useCSSVariable } from "uniwind";

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
  const [iosPickerOpen, setIosPickerOpen] = React.useState(false);
  const date = React.useMemo(() => parseDateFieldValue(value) ?? new Date(), [value]);
  const datePickerPrimaryColor = useCSSVariable("--color-primary") as ColorValue | undefined;
  const datePickerMutedColor = useCSSVariable("--color-text-muted") as ColorValue | undefined;
  const datePickerDestructiveColor = useCSSVariable("--color-destructive") as
    | ColorValue
    | undefined;
  const displayValue = React.useMemo(
    () =>
      `${date.getDate()} ${new Intl.DateTimeFormat(locale ?? "en", {
        month: "long",
      }).format(date)} ${date.getFullYear()}`,
    [date, locale],
  );

  function handleDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === "neutralButtonPressed") {
      onChange(null);
      return;
    }
    if (event.type === "dismissed" || !selectedDate) return;

    onChange(formatDateFieldValue(selectedDate));
  }

  function openPicker() {
    if (process.env.EXPO_OS === "android") {
      DateTimePickerAndroid.open({
        value: date,
        mode: "date",
        display: "calendar",
        positiveButton: { label: t("OK"), textColor: datePickerPrimaryColor },
        negativeButton: { label: t("Cancel"), textColor: datePickerMutedColor },
        neutralButton: value
          ? { label: t("Clear"), textColor: datePickerDestructiveColor }
          : undefined,
        onChange: handleDateChange,
      });
      return;
    }

    setIosPickerOpen((open) => !open);
  }

  return (
    <>
      {children({ displayValue, openPicker })}

      {process.env.EXPO_OS === "ios" && iosPickerOpen ? (
        <View className={iosContainerClassName}>
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            onChange={handleDateChange}
            style={{ alignSelf: "stretch" }}
          />
        </View>
      ) : null}
    </>
  );
}
