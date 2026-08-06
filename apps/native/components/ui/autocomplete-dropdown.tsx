import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Flag } from "@/components/ui/flag";
import { Icon } from "@/components/ui/icon";
import { INPUT_CLASS_NAME, Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react-native";
import * as React from "react";
import { ActivityIndicator, Keyboard, Pressable, ScrollView, TextInput, View } from "react-native";

export type AutocompleteDropdownOption = {
  value: string;
  label: string;
  displayValue?: string;
  description?: string;
  trailing?: string;
  keywords?: string[];
  imageUrl?: string | null;
  /** ISO 3166-1 alpha-2 country code; renders a circular flag in the leading slot. */
  flagCountry?: string | null;
};

type CommonProps = {
  options: AutocompleteDropdownOption[];
  placeholder?: string;
  emptyText?: string;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  optionClassName?: string;
  attached?: boolean;
  alwaysShowOptions?: boolean;
  inlineOptions?: boolean;
  optionsPosition?: "above" | "below";
  maxVisibleOptions?: number;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  onEndReached?: () => void;
  onQueryChange?: (query: string) => void;
  closeAccessibilityLabel?: string;
  clearAccessibilityLabel?: string;
  hideSelectedOptions?: boolean;
  showSelectedValue?: boolean;
  inputAccessory?: React.ReactNode;
  inputProps?: Omit<
    React.ComponentProps<typeof Input>,
    "value" | "onChangeText" | "onFocus" | "onSubmitEditing" | "placeholder"
  >;
};

type SingleSelectProps = CommonProps & {
  multiple?: false;
  value: AutocompleteDropdownOption | null;
  onValueChange: (option: AutocompleteDropdownOption) => void;
};

type MultiSelectProps = CommonProps & {
  multiple: true;
  value: AutocompleteDropdownOption[];
  onValueChange: (options: AutocompleteDropdownOption[]) => void;
};

type AutocompleteDropdownProps = SingleSelectProps | MultiSelectProps;

export function AutocompleteDropdown({
  options,
  placeholder,
  emptyText,
  className,
  inputClassName,
  dropdownClassName,
  optionClassName,
  attached = false,
  alwaysShowOptions = false,
  inlineOptions = false,
  optionsPosition = "below",
  maxVisibleOptions,
  isLoading = false,
  isLoadingMore = false,
  onEndReached,
  onQueryChange,
  clearAccessibilityLabel,
  hideSelectedOptions = false,
  showSelectedValue = true,
  inputAccessory,
  inputProps,
  ...props
}: AutocompleteDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const triggerRef = React.useRef<View>(null);
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const searchInputRef = React.useRef<TextInput>(null);
  // The inline (`inlineOptions`) and always-shown (`alwaysShowOptions`) variants render the
  // option list right next to the trigger. Every other case ("overlay") used to float the list
  // below the input, where the keyboard covered it — those now open as a bottom sheet instead:
  // options scroll on top, the search field is pinned in the footer above the keyboard.
  const usesSheet = !inlineOptions && !alwaysShowOptions;
  const selectedOptions = props.multiple ? props.value : props.value ? [props.value] : [];
  const selectedFlagCountry =
    !props.multiple && selectedOptions.length === 1
      ? (selectedOptions[0].flagCountry ?? null)
      : null;
  const selectedValues = React.useMemo(
    () => new Set(selectedOptions.map((option) => option.value)),
    [selectedOptions],
  );
  const selectedValue = formatSelectedValue(selectedOptions);
  const visibleValue = isOpen || !showSelectedValue ? query : selectedValue;
  const triggerValue = showSelectedValue ? selectedValue : "";
  const showDropdown = isOpen || alwaysShowOptions;
  const showOptionsAbove = alwaysShowOptions && optionsPosition === "above";
  const matchingOptions = React.useMemo(() => {
    const matches = filterOptions(options, query);
    return hideSelectedOptions
      ? matches.filter((option) => !selectedValues.has(option.value))
      : matches;
  }, [hideSelectedOptions, options, query, selectedValues]);

  function openDropdown() {
    setQuery("");
    onQueryChange?.("");
    setIsOpen(true);
  }

  function handleSelect(option: AutocompleteDropdownOption) {
    if (props.multiple) {
      const nextValue = selectedValues.has(option.value)
        ? props.value.filter((item) => item.value !== option.value)
        : [...props.value, option];

      props.onValueChange(nextValue);
      setQuery("");
      onQueryChange?.("");
      return;
    }

    props.onValueChange(option);
    setQuery("");
    onQueryChange?.("");

    if (usesSheet) {
      sheetRef.current?.dismiss();
      return;
    }

    setIsOpen(false);
    Keyboard.dismiss();
  }

  function handleSubmit() {
    const normalizedQuery = query.trim().toLowerCase();
    const exactMatch = options.find((option) => {
      return (
        option.value.toLowerCase() === normalizedQuery ||
        option.label.toLowerCase() === normalizedQuery
      );
    });
    const nextOption = exactMatch ?? (matchingOptions.length === 1 ? matchingOptions[0] : null);

    if (nextOption) handleSelect(nextOption);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    onQueryChange?.(value);
  }

  function handleSheetDismiss() {
    setQuery("");
    onQueryChange?.("");
    setIsOpen(false);
  }

  function handleDropdownScroll(event: {
    nativeEvent: {
      contentOffset: { y: number };
      contentSize: { height: number };
      layoutMeasurement: { height: number };
    };
  }) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromEnd = contentSize.height - layoutMeasurement.height - contentOffset.y;

    if (distanceFromEnd <= 24) onEndReached?.();
  }

  const optionRows = matchingOptions.map((option) => {
    const isSelected = selectedValues.has(option.value);

    return (
      <Pressable
        key={option.value}
        onPress={() => handleSelect(option)}
        role="button"
        accessibilityState={{ selected: isSelected }}
        className={cn(
          "min-h-16 flex-row items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-3 active:bg-bg-subtle",
          isSelected && "border-brand bg-brand-lighter",
          optionClassName,
        )}
      >
        {option.flagCountry ? (
          <Flag country={option.flagCountry} size={36} />
        ) : (
          <Avatar alt={option.label} className="size-9">
            {option.imageUrl ? <AvatarImage source={{ uri: option.imageUrl }} /> : null}
            <AvatarFallback />
          </Avatar>
        )}
        <View className="min-w-0 flex-1">
          <Text className={cn("font-semibold text-text", isSelected && "text-brand")}>
            {option.label}
          </Text>
          {option.description ? (
            <Text className="text-sm text-text-muted">{option.description}</Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-2">
          {isSelected ? <Icon as={Check} aria-hidden={true} className="size-4 text-brand" /> : null}
          {option.trailing ? (
            <Text
              className={cn("text-sm font-semibold text-text-muted", isSelected && "text-brand")}
            >
              {option.trailing}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  });

  const loadingMoreIndicator = isLoadingMore ? (
    <View className="h-12 items-center justify-center">
      <ActivityIndicator colorClassName="accent-brand" size="small" />
    </View>
  ) : null;

  const inputClass = cn(
    attached && "flex-1 border-0 bg-transparent shadow-none",
    attached && showDropdown && (showOptionsAbove ? "rounded-t-none" : "rounded-b-none"),
    attached && showOptionsAbove && inputAccessory && "rounded-br-none",
    inputClassName,
  );

  // Editable search field (inline/always-shown trigger, or the sheet footer). The clear
  // button is overlaid rather than placed beside the field so the input keeps its full
  // width and the rounding `inputClass` applies when the dropdown is attached.
  const input = (
    <View className="relative justify-center">
      <Input
        value={visibleValue}
        onFocus={openDropdown}
        onChangeText={handleQueryChange}
        onSubmitEditing={handleSubmit}
        placeholder={placeholder}
        autoCorrect={false}
        returnKeyType="search"
        className={cn(inputClass, visibleValue.length > 0 && "pe-10")}
        {...inputProps}
      />
      {visibleValue.length > 0 ? (
        <Button
          variant="ghost"
          size="icon"
          accessibilityLabel={clearAccessibilityLabel}
          onPress={() => handleQueryChange("")}
          className="absolute end-1 size-8 rounded-full"
        >
          <Icon as={X} className="size-4 text-destructive" />
        </Button>
      ) : null}
    </View>
  );

  const dropdown = (
    <View
      className={cn(
        "max-h-80 overflow-hidden border border-border bg-card-bg/95",
        attached
          ? showOptionsAbove
            ? "rounded-b-none rounded-t-md"
            : "rounded-b-md rounded-t-none"
          : "rounded-md",
        dropdownClassName,
      )}
    >
      {isLoading && matchingOptions.length === 0 ? (
        <View className="h-16 items-center justify-center">
          <ActivityIndicator colorClassName="accent-brand" size="small" />
        </View>
      ) : matchingOptions.length > 0 ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          onScroll={handleDropdownScroll}
          scrollEventThrottle={16}
          style={maxVisibleOptions ? { maxHeight: Math.max(1, maxVisibleOptions) * 64 } : undefined}
        >
          {optionRows}
          {loadingMoreIndicator}
        </ScrollView>
      ) : (
        <Text className="px-3 py-3 text-sm text-text-muted">{emptyText}</Text>
      )}
    </View>
  );

  const {
    placeholderClassName: footerPlaceholderClassName,
    className: footerClassName,
    ...footerInputProps
  } = inputProps ?? {};

  // Read-only field that shows the current selection and opens the sheet on press.
  const sheetTrigger = selectedFlagCountry ? (
    <View className="relative justify-center">
      <Input
        value={triggerValue}
        editable={false}
        pointerEvents="none"
        placeholder={placeholder}
        className={cn(inputClass, "opacity-100 ps-11")}
        {...inputProps}
      />
      <View pointerEvents="none" className="absolute bottom-0 start-3 top-0 justify-center">
        <Flag country={selectedFlagCountry} size={24} />
      </View>
    </View>
  ) : (
    <Input
      value={triggerValue}
      editable={false}
      pointerEvents="none"
      placeholder={placeholder}
      className={cn(inputClass, "opacity-100")}
      {...inputProps}
    />
  );

  return (
    <View className={cn(attached ? "gap-0" : "gap-2", className)}>
      {alwaysShowOptions && attached && showOptionsAbove ? dropdown : null}
      <View ref={triggerRef} collapsable={false}>
        {attached ? (
          usesSheet ? (
            <View className="flex-row items-center rounded-md border border-input bg-background pe-2 shadow-sm shadow-black/5">
              <Pressable onPress={openDropdown} className="flex-1">
                {sheetTrigger}
              </Pressable>
            </View>
          ) : (
            <View
              className={cn(
                "flex-row items-center border border-input bg-background shadow-sm shadow-black/5",
                inputAccessory ? "overflow-hidden pe-0" : "pe-2",
                showDropdown
                  ? showOptionsAbove
                    ? "rounded-b-md border-t-0"
                    : "rounded-t-md border-b-0"
                  : "rounded-md",
              )}
            >
              {input}
              {inputAccessory}
            </View>
          )
        ) : usesSheet ? (
          <Pressable onPress={openDropdown}>{sheetTrigger}</Pressable>
        ) : (
          input
        )}
      </View>
      {isOpen && inlineOptions ? dropdown : null}
      {alwaysShowOptions && attached && !showOptionsAbove ? dropdown : null}
      {isOpen && usesSheet ? (
        <BottomSheet
          ref={sheetRef}
          scrollable
          detents={[0.9]}
          onDidPresent={() => searchInputRef.current?.focus()}
          onDidDismiss={handleSheetDismiss}
          footer={
            <View className="px-4 pb-3 pt-3">
              <TextInput
                ref={searchInputRef}
                value={query}
                onChangeText={handleQueryChange}
                onSubmitEditing={handleSubmit}
                placeholder={placeholder}
                autoCorrect={false}
                returnKeyType="search"
                className={cn(
                  INPUT_CLASS_NAME,
                  "placeholder:text-muted-foreground/50",
                  footerClassName,
                )}
                placeholderTextColorClassName={cn(
                  "accent-muted-foreground/50",
                  footerPlaceholderClassName,
                )}
                {...footerInputProps}
              />
            </View>
          }
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            onScroll={handleDropdownScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 8,
            }}
          >
            {isLoading && matchingOptions.length === 0 ? (
              <View className="h-16 items-center justify-center">
                <ActivityIndicator colorClassName="accent-brand" size="small" />
              </View>
            ) : matchingOptions.length > 0 ? (
              <>
                {optionRows}
                {loadingMoreIndicator}
              </>
            ) : (
              <Text className="px-1 py-6 text-center text-sm text-text-muted">{emptyText}</Text>
            )}
          </ScrollView>
        </BottomSheet>
      ) : null}
    </View>
  );
}

function filterOptions(options: AutocompleteDropdownOption[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return options;

  return options.filter((option) => {
    const searchableText = [
      option.value,
      option.label,
      option.displayValue,
      option.description,
      option.trailing,
      ...(option.keywords ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}

function formatSelectedValue(options: AutocompleteDropdownOption[]) {
  return options.map((option) => option.displayValue ?? option.label).join(", ");
}
