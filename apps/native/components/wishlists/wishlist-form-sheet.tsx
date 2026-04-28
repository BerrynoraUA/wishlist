import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useCreateWishlist, useUpdateWishlist } from "@/hooks/use-wishlists";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  EMPTY_WISHLIST_FORM,
  WISHLIST_ACCENT_OPTIONS,
  WISHLIST_VISIBILITY_OPTIONS,
  getWishlistAccentClass,
  toWishlistFormValues,
} from "@/lib/wishlists";
import { cn } from "@/lib/utils";
import { SlidingOptionSelector, type SlidingOptionRenderProps } from "@/components/ui/sliding-option-selector";
import type { Wishlist, WishlistFormValues } from "@/types/wishlist";
import { CalendarDays, X } from "lucide-react-native";
import * as React from "react";
import { ActivityIndicator, Platform, View } from "react-native";

const dateLabelFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function parseDateFieldValue(value: string) {
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

function formatDateFieldLabel(value: string) {
  const date = parseDateFieldValue(value);
  return date ? dateLabelFormatter.format(date) : "Select a date";
}

export function WishlistFormSheet({
  mode,
  open,
  wishlist,
  onOpenChange,
}: {
  mode: "create" | "edit";
  open: boolean;
  wishlist?: Wishlist;
  onOpenChange: (open: boolean) => void;
}) {
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const createMutation = useCreateWishlist();
  const updateMutation = useUpdateWishlist();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error ?? updateMutation.error;
  const [values, setValues] = React.useState<WishlistFormValues>(EMPTY_WISHLIST_FORM);
  const title = mode === "edit" ? "Edit Wishlist" : "Create Wishlist";

  React.useEffect(() => {
    if (open) setValues(toWishlistFormValues(wishlist));
  }, [open, wishlist]);

  if (!open) return null;

  function handleClose() {
    if (!sheetRef.current) {
      onOpenChange(false);
      return;
    }

    void sheetRef.current.dismiss();
  }

  function patchValues(patch: Partial<WishlistFormValues>) {
    setValues((current) => ({ ...current, ...patch }));
  }

  function handleSubmit() {
    if (!values.title.trim()) return;

    if (mode === "edit" && wishlist) {
      updateMutation.mutate(
        { id: wishlist.id, values },
        {
          onSuccess: handleClose,
        },
      );
      return;
    }

    createMutation.mutate(values, {
      onSuccess: handleClose,
    });
  }

  return (
    <BottomSheet
      ref={sheetRef}
      dismissOnBack={false}
      onDidDismiss={() => onOpenChange(false)}
      header={<Text className="mx-5 mt-5 text-lg font-extrabold text-text">{title}</Text>}
      footer={
        <View className="w-full flex-row items-stretch gap-2 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
          <Button
            className="min-w-0 flex-1"
            variant="outline"
            disabled={isPending}
            onPress={handleClose}
          >
            <Text>Cancel</Text>
          </Button>
          <Button
            className="min-w-0 flex-1"
            disabled={isPending || !values.title.trim()}
            onPress={handleSubmit}
          >
            {isPending ? <ActivityIndicator colorClassName="accent-primary-foreground" /> : null}
            <Text>{mode === "edit" ? "Save changes" : "Create wishlist"}</Text>
          </Button>
        </View>
      }
    >
      <View className="gap-5 px-5 pt-5">
        <Field label="Name">
          <Input
            value={values.title}
            onChangeText={(title) => patchValues({ title })}
            placeholder="Birthday gifts"
          />
        </Field>

        <Field label="Description">
          <Input
            value={values.description}
            onChangeText={(description) => patchValues({ description })}
            placeholder="A short note about this wishlist"
            multiline
            className="h-24 items-start py-3"
            textAlignVertical="top"
          />
        </Field>

        <Field label="Visibility">
          <VisibilitySelector
            value={values.visibility}
            onChange={(visibility) => patchValues({ visibility })}
          />
        </Field>

        <Field label="Accent">
          <AccentSelector value={values.accent} onChange={(accent) => patchValues({ accent })} />
        </Field>

        <Field label="Event date (optional)">
          <EventDatePicker
            value={values.eventDate}
            onChange={(eventDate) => patchValues({ eventDate })}
          />
        </Field>

        <Field label="Image URL">
          <Input
            value={values.imageUrl}
            onChangeText={(imageUrl) => patchValues({ imageUrl })}
            placeholder="https://..."
            autoCapitalize="none"
            keyboardType="url"
          />
        </Field>

        {error ? (
          <Text className="text-sm font-semibold text-destructive">{error.message}</Text>
        ) : null}
      </View>
    </BottomSheet>
  );
}

function VisibilitySelector({
  value,
  onChange,
}: {
  value: WishlistFormValues["visibility"];
  onChange: (visibility: WishlistFormValues["visibility"]) => void;
}) {
  const rows = React.useMemo(
    () => [
      WISHLIST_VISIBILITY_OPTIONS.map((option) => ({
        value: option.visibility,
        children: ({ selected }: SlidingOptionRenderProps) => (
          <>
            <Icon
              as={option.icon}
              className={cn("size-3.5 text-text-muted", selected && "text-brand")}
            />
            <Text className={cn("text-xs font-semibold text-text", selected && "text-brand")}>
              {option.label}
            </Text>
          </>
        ),
      })),
    ],
    [],
  );

  return (
    <SlidingOptionSelector
      rows={rows}
      value={value}
      onChange={onChange}
      optionHeight={44}
      optionHeightClassName="h-11"
      optionClassName="gap-1.5 rounded-lg px-2"
      indicatorClassName="rounded-lg border border-brand bg-brand-lighter"
    />
  );
}

function AccentSelector({
  value,
  onChange,
}: {
  value: WishlistFormValues["accent"];
  onChange: (accent: WishlistFormValues["accent"]) => void;
}) {
  const rows = React.useMemo(() => {
    const options = WISHLIST_ACCENT_OPTIONS.map((option) => ({
      value: option.value,
      accessibilityLabel: `Use ${option.label} accent`,
      children: ({ selected }: SlidingOptionRenderProps) => (
        <>
          <View className={cn("size-4 rounded-full", getWishlistAccentClass(option.value))} />
          <Text
            className={cn("text-sm font-semibold text-text-muted", selected && "text-brand")}
            numberOfLines={1}
          >
            {option.label}
          </Text>
        </>
      ),
    }));

    return [options.slice(0, 3), options.slice(3)];
  }, []);

  return (
    <SlidingOptionSelector
      rows={rows}
      value={value}
      onChange={onChange}
      optionHeight={40}
      optionHeightClassName="h-10"
      optionClassName="gap-2 rounded-full px-3"
      indicatorClassName="rounded-full border border-brand bg-brand-lighter"
    />
  );
}

function EventDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [iosPickerOpen, setIosPickerOpen] = React.useState(false);
  const date = React.useMemo(() => parseDateFieldValue(value) ?? new Date(), [value]);

  function handleDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === "dismissed" || !selectedDate) return;

    onChange(formatDateFieldValue(selectedDate));
  }

  function handleOpenPicker() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: date,
        mode: "date",
        display: "calendar",
        onChange: handleDateChange,
      });
      return;
    }

    setIosPickerOpen((open) => !open);
  }

  return (
    <View className="gap-2">
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Select event date"
        onPress={handleOpenPicker}
        className="min-h-12 flex-row items-center gap-3 rounded-lg border border-border-subtle bg-bg-subtle px-3"
      >
        <Icon as={CalendarDays} className="size-4 text-text-muted" />
        <View className="min-w-0 flex-1">
          <Text className={cn("font-semibold", value ? "text-text" : "text-text-muted")}>
            {formatDateFieldLabel(value)}
          </Text>
          {value ? <Text className="text-xs font-semibold text-text-muted">{value}</Text> : null}
        </View>
        {value ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Clear event date"
            onPress={(event) => {
              event.stopPropagation();
              onChange("");
            }}
            className="size-8 items-center justify-center rounded-full bg-bg-muted"
          >
            <Icon as={X} className="size-3.5 text-text-muted" />
          </AnimatedPressable>
        ) : null}
      </AnimatedPressable>

      {Platform.OS === "ios" && iosPickerOpen ? (
        <View className="overflow-hidden rounded-xl border border-border-subtle bg-bg-subtle">
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            onChange={handleDateChange}
            style={{ alignSelf: "stretch" }}
          />
        </View>
      ) : null}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold text-text">{label}</Text>
      {children}
    </View>
  );
}
