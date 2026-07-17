import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { WindowOverlay } from "@/components/ui/window-overlay";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react-native";
import * as React from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  View,
  type LayoutRectangle,
} from "react-native";

export type AutocompleteDropdownOption = {
  value: string;
  label: string;
  displayValue?: string;
  description?: string;
  trailing?: string;
  keywords?: string[];
  imageUrl?: string | null;
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
  closeAccessibilityLabel = "Close dropdown",
  hideSelectedOptions = false,
  showSelectedValue = true,
  inputAccessory,
  inputProps,
  ...props
}: AutocompleteDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [triggerFrame, setTriggerFrame] = React.useState<LayoutRectangle | null>(null);
  const [query, setQuery] = React.useState("");
  const triggerRef = React.useRef<View>(null);
  const selectedOptions = props.multiple ? props.value : props.value ? [props.value] : [];
  const selectedValues = React.useMemo(
    () => new Set(selectedOptions.map((option) => option.value)),
    [selectedOptions],
  );
  const selectedValue = formatSelectedValue(selectedOptions);
  const visibleValue = isOpen || !showSelectedValue ? query : selectedValue;
  const showDropdown = isOpen || alwaysShowOptions;
  const showOptionsAbove = alwaysShowOptions && optionsPosition === "above";
  const matchingOptions = React.useMemo(() => {
    const matches = filterOptions(options, query);
    return hideSelectedOptions
      ? matches.filter((option) => !selectedValues.has(option.value))
      : matches;
  }, [hideSelectedOptions, options, query, selectedValues]);

  function measureTrigger() {
    requestAnimationFrame(() => {
      triggerRef.current?.measureInWindow((x, y, width, height) => {
        setTriggerFrame({ x, y, width, height });
      });
    });
  }

  function openDropdown() {
    setQuery("");
    onQueryChange?.("");
    setIsOpen(true);
    if (!inlineOptions) measureTrigger();
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
    setIsOpen(false);
    setTriggerFrame(null);
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

  function closeDropdown() {
    setQuery("");
    onQueryChange?.("");
    setIsOpen(false);
    setTriggerFrame(null);
    Keyboard.dismiss();
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

  const inputClass = cn(
    attached && "flex-1 border-0 bg-transparent shadow-none",
    attached && showDropdown && (showOptionsAbove ? "rounded-t-none" : "rounded-b-none"),
    attached && showOptionsAbove && inputAccessory && "rounded-br-none",
    inputClassName,
  );
  const input = (
    <Input
      value={visibleValue}
      onFocus={openDropdown}
      onChangeText={handleQueryChange}
      onSubmitEditing={handleSubmit}
      placeholder={placeholder}
      autoCorrect={false}
      returnKeyType="search"
      className={inputClass}
      {...inputProps}
    />
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
          {matchingOptions.map((option) => {
            const isSelected = selectedValues.has(option.value);
            const selectedIndicator = isSelected ? (
              <Icon as={Check} aria-hidden={true} className="size-4 text-brand" />
            ) : (
              <View className="size-4" />
            );

            return (
              <Pressable
                key={option.value}
                onPress={() => handleSelect(option)}
                role="button"
                accessibilityState={{ selected: isSelected }}
                className={cn(
                  "min-h-16 flex-row items-center justify-between gap-3 px-3 py-3 active:bg-accent",
                  isSelected && "bg-accent/60",
                  optionClassName,
                )}
              >
                <Avatar alt={option.label} className="size-9">
                  {option.imageUrl ? <AvatarImage source={{ uri: option.imageUrl }} /> : null}
                  <AvatarFallback />
                </Avatar>
                <View className="min-w-0 flex-1">
                  <Text className="font-semibold text-text">{option.label}</Text>
                  {option.description ? (
                    <Text className="text-sm text-text-muted">{option.description}</Text>
                  ) : null}
                </View>
                <View className="flex-row items-center gap-2">
                  {isSelected ? selectedIndicator : null}
                  {option.trailing ? (
                    <Text className="text-sm font-semibold text-text-muted">{option.trailing}</Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
          {isLoadingMore ? (
            <View className="h-12 items-center justify-center">
              <ActivityIndicator colorClassName="accent-brand" size="small" />
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <Text className="px-3 py-3 text-sm text-text-muted">{emptyText}</Text>
      )}
    </View>
  );

  return (
    <View className={cn(attached ? "gap-0" : "gap-2", className)}>
      {alwaysShowOptions && attached && showOptionsAbove ? dropdown : null}
      <View ref={triggerRef} collapsable={false}>
        {attached ? (
          <View
            className={cn(
              "flex-row items-center border border-input bg-background shadow-sm shadow-black/5",
              inputAccessory ? "overflow-hidden pr-0" : "pr-2",
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
        ) : (
          input
        )}
      </View>
      {isOpen && inlineOptions ? dropdown : null}
      {alwaysShowOptions && attached && !showOptionsAbove ? dropdown : null}
      {isOpen && !inlineOptions && !alwaysShowOptions && triggerFrame ? (
        <WindowOverlay onRequestClose={closeDropdown}>
          <View className="absolute inset-0">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={closeAccessibilityLabel}
              onPress={closeDropdown}
              className="absolute inset-0"
            />
            <View
              style={{
                left: triggerFrame.x,
                position: "absolute",
                top:
                  triggerFrame.y +
                  triggerFrame.height +
                  (Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0),
                width: triggerFrame.width,
              }}
            >
              {dropdown}
            </View>
          </View>
        </WindowOverlay>
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
