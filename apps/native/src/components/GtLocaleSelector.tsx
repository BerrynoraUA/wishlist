import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocaleSelector } from "gt-react-native";

export function GtLocaleSelector() {
  const { locales, locale, setLocale, getLocaleProperties } =
    useLocaleSelector();

  return (
    <View style={styles.row}>
      {locales.map((code) => {
        const active = code === locale;
        const label = getLocaleProperties(code).nativeName;
        return (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (code === locale) return;
              setLocale(code);
            }}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#888",
  },
  chipActive: {
    borderColor: "#208AEF",
    backgroundColor: "rgba(32, 138, 239, 0.12)",
  },
  chipLabel: {
    fontSize: 14,
  },
  chipLabelActive: {
    fontWeight: "600",
  },
});
