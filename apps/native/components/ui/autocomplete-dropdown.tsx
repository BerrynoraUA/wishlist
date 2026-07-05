import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react-native";
import * as React from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
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
  maxVisibleOptions?: number;
  isLoadingMore?: boolean;
  onEndReached?: () => void;
  onQueryChange?: (query: string) => void;
  closeAccessibilityLabel?: string;
  hideSelectedOptions?: boolean;
  showSelectedValue?: boolean;
  searchable?: boolean;
  trailingAccessory?: React.ReactNode;
  attachedContainerStyle?: StyleProp<ViewStyle>;
  highlightSelectedOption?: boolean;
  renderOptionLeading?: (option: AutocompleteDropdownOption) => React.ReactNode;
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
  maxVisibleOptions,
  isLoadingMore = false,
  onEndReached,
  onQueryChange,
  closeAccessibilityLabel = "Close dropdown",
  hideSelectedOptions = false,
  showSelectedValue = true,
  searchable = true,
  trailingAccessory,
  attachedContainerStyle,
  highlightSelectedOption = true,
  renderOptionLeading,
  inputProps,
  ...props
}: AutocompleteDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [outsideDismissEnabled, setOutsideDismissEnabled] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const outsideDismissTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedOptions = props.multiple ? props.value : props.value ? [props.value] : [];
  const selectedValues = React.useMemo(
    () => new Set(selectedOptions.map((option) => option.value)),
    [selectedOptions],
  );
  const selectedValue = formatSelectedValue(selectedOptions);
  const visibleValue = searchable && (isOpen || !showSelectedValue) ? query : selectedValue;
  const matchingOptions = React.useMemo(() => {
    const matches = searchable ? filterOptions(options, query) : options;
    return hideSelectedOptions
      ? matches.filter((option) => !selectedValues.has(option.value))
      : matches;
  }, [hideSelectedOptions, options, query, searchable, selectedValues]);

  React.useEffect(() => {
    return () => {
      if (outsideDismissTimeoutRef.current) clearTimeout(outsideDismissTimeoutRef.current);
    };
  }, []);

  function clearOutsideDismissTimeout() {
    if (!outsideDismissTimeoutRef.current) return;

    clearTimeout(outsideDismissTimeoutRef.current);
    outsideDismissTimeoutRef.current = null;
  }

  function openDropdown() {
    clearOutsideDismissTimeout();
    setQuery("");
    onQueryChange?.("");
    setIsOpen(true);
    // Grace period so the tap that opened the dropdown can't also land on the
    // outside-dismiss backdrop and immediately close it again.
    setOutsideDismissEnabled(false);
    outsideDismissTimeoutRef.current = setTimeout(() => {
      setOutsideDismissEnabled(true);
      outsideDismissTimeoutRef.current = null;
    }, 150);
  }

  function handleSelect(option: AutocompleteDropdownOption) {
    clearOutsideDismissTimeout();

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
    setOutsideDismissEnabled(false);
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

  function closeDropdown() {
    clearOutsideDismissTimeout();
    setOutsideDismissEnabled(false);
    setQuery("");
    onQueryChange?.("");
    setIsOpen(false);
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
    attached && isOpen && "rounded-b-none",
    inputClassName,
  );
  const input = searchable ? (
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
  ) : (
    <Pressable
      accessibilityRole="button"
      onPress={isOpen ? closeDropdown : openDropdown}
      className={cn(
        "flex h-10 w-full min-w-0 flex-row items-center rounded-md px-3 py-1 sm:h-9",
        inputClass,
      )}
    >
      <Text className={cn("text-base leading-5", selectedValue ? "text-text" : "text-text-muted")}>
        {visibleValue || placeholder}
      </Text>
    </Pressable>
  );

  return (
    <View className={cn(attached ? "gap-0" : "gap-2", className)}>
      {isOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeAccessibilityLabel}
          onPress={closeDropdown}
          pointerEvents={outsideDismissEnabled ? "auto" : "none"}
          style={{ position: "absolute", inset: -1000, zIndex: 1 }}
        />
      ) : null}
      <View style={isOpen ? { position: "relative", zIndex: 2 } : undefined}>
        {attached ? (
          <View
            className={cn(
              "flex-row items-center border border-input bg-background pr-2 shadow-sm shadow-black/5",
              isOpen ? "rounded-t-md border-b-0" : "rounded-md",
            )}
            style={attachedContainerStyle}
          >
            {input}
            {trailingAccessory ? (
              <View className="ml-2 items-center justify-center">{trailingAccessory}</View>
            ) : null}
          </View>
        ) : (
          input
        )}
        {isOpen ? (
          <View
            className={cn(
              "max-h-80 overflow-hidden border border-border bg-popover",
              attached ? "rounded-b-md rounded-t-none" : "rounded-md",
              dropdownClassName,
            )}
          >
            {matchingOptions.length > 0 ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                onScroll={handleDropdownScroll}
                scrollEventThrottle={16}
                style={
                  maxVisibleOptions ? { maxHeight: Math.max(1, maxVisibleOptions) * 64 } : undefined
                }
              >
                {matchingOptions.map((option) => {
                  const isSelected = selectedValues.has(option.value);

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => handleSelect(option)}
                      role="button"
                      accessibilityState={{ selected: isSelected }}
                      className={cn(
                        "min-h-16 flex-row items-center justify-between gap-3 px-3 py-3 active:bg-accent",
                        isSelected && highlightSelectedOption && "bg-accent/60",
                        optionClassName,
                      )}
                    >
                      {renderOptionLeading ? renderOptionLeading(option) : null}
                      {option.imageUrl ? (
                        <Avatar alt={option.label} className="size-9">
                          <AvatarImage source={{ uri: option.imageUrl }} />
                          <AvatarFallback>
                            <Text className="text-xs font-bold text-text-muted">
                              {option.label.slice(0, 2).toUpperCase()}
                            </Text>
                          </AvatarFallback>
                        </Avatar>
                      ) : null}
                      <View className="min-w-0 flex-1">
                        <Text className="font-semibold text-text">{option.label}</Text>
                        {option.description ? (
                          <Text className="text-sm text-text-muted">{option.description}</Text>
                        ) : null}
                      </View>
                      <View className="flex-row items-center gap-2">
                        {isSelected ? (
                          <Icon as={Check} aria-hidden={true} className="size-4 text-brand" />
                        ) : null}
                        {option.trailing ? (
                          <Text className="text-sm font-semibold text-text-muted">
                            {option.trailing}
                          </Text>
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
        ) : null}
      </View>
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
