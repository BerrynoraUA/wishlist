import { FilterChip, FlowRow, Text } from "@expo/ui/jetpack-compose";
import { useLocaleSelector } from "gt-react-native";

export function GtLocaleSelector() {
  const { locales, locale, setLocale, getLocaleProperties } =
    useLocaleSelector();

  return (
    <FlowRow
      horizontalArrangement="center"
      verticalArrangement={{ spacedBy: 8 }}
    >
      {locales.map((code) => {
        const active = code === locale;
        const label = getLocaleProperties(code).nativeName;
        return (
          <FilterChip
            key={code}
            selected={active}
            onClick={() => {
              if (code === locale) return;
              setLocale(code);
            }}
          >
            <FilterChip.Label>
              <Text>{label}</Text>
            </FilterChip.Label>
          </FilterChip>
        );
      })}
    </FlowRow>
  );
}
