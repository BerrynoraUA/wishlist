import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react-native";
import * as React from "react";
import { Pressable, ScrollView, View } from "react-native";

export type AutocompleteDropdownOption = {
  value: string;
  label: string;
  displayValue?: string;
  description?: string;
  trailing?: string;
  keywords?: string[];
};

type CommonProps = {
  options: AutocompleteDropdownOption[];
  placeholder?: string;
  emptyText?: string;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  optionClassName?: string;
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
  inputProps,
  ...props
}: AutocompleteDropdownProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selectedOptions = props.multiple ? props.value : props.value ? [props.value] : [];
  const selectedValues = React.useMemo(
    () => new Set(selectedOptions.map((option) => option.value)),
    [selectedOptions],
  );
  const visibleValue = isFocused ? query : formatSelectedValue(selectedOptions);
  const matchingOptions = React.useMemo(() => filterOptions(options, query), [options, query]);

  function handleSelect(option: AutocompleteDropdownOption) {
    if (props.multiple) {
      const nextValue = selectedValues.has(option.value)
        ? props.value.filter((item) => item.value !== option.value)
        : [...props.value, option];

      props.onValueChange(nextValue);
      setQuery("");
      return;
    }

    props.onValueChange(option);
    setQuery("");
    setIsFocused(false);
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

  return (
    <View className={cn("gap-2", className)}>
      <Input
        value={visibleValue}
        onFocus={() => {
          setQuery("");
          setIsFocused(true);
        }}
        onChangeText={setQuery}
        onSubmitEditing={handleSubmit}
        placeholder={placeholder}
        autoCorrect={false}
        returnKeyType="search"
        className={inputClassName}
        {...inputProps}
      />
      {isFocused ? (
        <View
          className={cn(
            "max-h-80 overflow-hidden rounded-md border border-border bg-popover",
            dropdownClassName,
          )}
        >
          {matchingOptions.length > 0 ? (
            <ScrollView keyboardShouldPersistTaps="handled">
              {matchingOptions.map((option) => {
                const isSelected = selectedValues.has(option.value);

                return (
                  <Pressable
                    key={option.value}
                    onPressIn={() => handleSelect(option)}
                    role="button"
                    accessibilityState={{ selected: isSelected }}
                    className={cn(
                      "flex-row items-center justify-between gap-3 px-3 py-3 active:bg-accent",
                      isSelected && "bg-accent/60",
                      optionClassName,
                    )}
                  >
                    <View className="flex-1">
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
            </ScrollView>
          ) : (
            <Text className="px-3 py-3 text-sm text-text-muted">{emptyText}</Text>
          )}
        </View>
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
