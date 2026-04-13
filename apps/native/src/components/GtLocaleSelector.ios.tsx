import { HStack, Button, ScrollView } from "@expo/ui/swift-ui";
import { background, border, shapes } from "@expo/ui/swift-ui/modifiers";
import { useLocaleSelector } from "gt-react-native";

const chipShape = shapes.roundedRectangle({ cornerRadius: 8 });

export function GtLocaleSelector() {
  const { locales, locale, setLocale, getLocaleProperties } = useLocaleSelector();

  return (
    <ScrollView axes="horizontal" showsIndicators={false}>
      <HStack spacing={8}>
        {locales.map((code) => {
          const active = code === locale;
          const label = getLocaleProperties(code).nativeName;
          return (
            <Button
              key={code}
              label={label}
              onPress={() => {
                if (code === locale) return;
                setLocale(code);
              }}
              modifiers={
                active
                  ? [
                      background("rgba(32, 138, 239, 0.12)", chipShape),
                      border({ color: "#208AEF", width: 1 }),
                    ]
                  : [border({ color: "#888888", width: 1 })]
              }
            />
          );
        })}
      </HStack>
    </ScrollView>
  );
}
