import DateTimePicker, { type DateTimePickerChangeEvent } from "@expo/ui/community/datetime-picker";
import { useGT, useLocale } from "gt-react-native";
import * as React from "react";
import { View } from "react-native";
import { useUniwind, useCSSVariable } from "uniwind";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { getThemeMode } from "@/lib/theme";

type DatePickerRenderProps = {
  displayValue: string;
  openPicker: () => void;
};

type DatePickerProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  children: (props: DatePickerRenderProps) => React.ReactNode;
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

export function DatePicker({ value, onChange, children }: DatePickerProps) {
  const t = useGT();
  const locale = useLocale();
  const [iosPickerOpen, setIosPickerOpen] = React.useState(false);
  const [androidPickerOpen, setAndroidPickerOpen] = React.useState(false);
  const date = React.useMemo(() => parseDateFieldValue(value) ?? new Date(), [value]);
  const datePickerAccentColor = useCSSVariable("--color-primary") as string | undefined;
  const displayValue = React.useMemo(
    () =>
      `${date.getDate()} ${new Intl.DateTimeFormat(locale ?? "en", {
        month: "long",
      }).format(date)} ${date.getFullYear()}`,
    [date, locale],
  );

  function handleAndroidValueChange(_: DateTimePickerChangeEvent, selectedDate: Date) {
    onChange(formatDateFieldValue(selectedDate));
    setAndroidPickerOpen(false);
  }

  function openPicker() {
    if (process.env.EXPO_OS === "android") {
      setAndroidPickerOpen(true);
      return;
    }

    setIosPickerOpen(true);
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
          onValueChange={handleAndroidValueChange}
          onDismiss={() => setAndroidPickerOpen(false)}
        />
      ) : null}

      {process.env.EXPO_OS === "ios" && iosPickerOpen ? (
        <IosDatePickerSheet
          value={date}
          accentColor={datePickerAccentColor}
          onConfirm={(selectedDate) => onChange(formatDateFieldValue(selectedDate))}
          onClose={() => setIosPickerOpen(false)}
        />
      ) : null}
    </>
  );
}

/**
 * iOS has no native date dialog — `UIDatePicker` always renders inline — so the calendar
 * lives in a sheet with its own Cancel/Done actions. That matches the Android dialog:
 * scrubbing the calendar only edits a draft, and the host form is updated on confirm.
 */
function IosDatePickerSheet({
  value,
  accentColor,
  onConfirm,
  onClose,
}: {
  value: Date;
  accentColor: string | undefined;
  onConfirm: (value: Date) => void;
  onClose: () => void;
}) {
  const t = useGT();
  const { theme } = useUniwind();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const [draft, setDraft] = React.useState(value);

  function confirm() {
    onConfirm(draft);
    void sheetRef.current?.dismiss();
  }

  return (
    <BottomSheet
      ref={sheetRef}
      detents={[0.55]}
      onDidDismiss={onClose}
      header={
        // `pt-5` clears the grabber, matching the other sheets that use a fixed header.
        <View className="px-5 pb-3 pt-5">
          <Text className="text-lg font-extrabold text-text">{t("Select a date")}</Text>
        </View>
      }
      footer={
        <View className="w-full flex-row items-stretch gap-2 px-5 pb-3 pt-3">
          <Button
            className="min-w-0 flex-1"
            variant="outline"
            onPress={() => void sheetRef.current?.dismiss()}
          >
            <Text>{t("Cancel")}</Text>
          </Button>
          <Button className="min-w-0 flex-1" onPress={confirm}>
            <Text>{t("Done")}</Text>
          </Button>
        </View>
      }
    >
      <View className="px-5">
        <DateTimePicker
          value={draft}
          mode="date"
          display="inline"
          accentColor={accentColor}
          themeVariant={getThemeMode(theme)}
          onValueChange={(_, selectedDate) => setDraft(selectedDate)}
          style={{ alignSelf: "stretch" }}
        />
      </View>
    </BottomSheet>
  );
}
