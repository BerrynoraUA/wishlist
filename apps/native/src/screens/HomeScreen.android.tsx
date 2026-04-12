import { Box, Column, Host, Text } from "@expo/ui/jetpack-compose";
import { GtLocaleSelector } from "@/components/GtLocaleSelector";
import { T } from "gt-react-native";

export default function HomeScreen() {
  return (
    <Host style={{ flex: 1 }}>
      <Box contentAlignment="center">
        <Column
          horizontalAlignment="center"
          verticalArrangement={{ spacedBy: 16 }}
        >
          <GtLocaleSelector />
          <T>
            <Text style={{ textAlign: "center" }}>
              Edit src/screens/HomeScreen.android.tsx to edit this screen.
            </Text>
          </T>
        </Column>
      </Box>
    </Host>
  );
}
