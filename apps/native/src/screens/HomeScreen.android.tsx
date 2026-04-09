import { Box, Column, Host, Text } from "@expo/ui/jetpack-compose";
import { useGT } from "gt-react-native";
import { GtLocaleSelector } from "@/components/GtLocaleSelector";

export default function HomeScreen() {
  const gt = useGT();

  return (
    <Host style={{ flex: 1 }}>
      <Box contentAlignment="center">
        <Column
          horizontalAlignment="center"
          verticalArrangement={{ spacedBy: 16 }}
        >
          <GtLocaleSelector />
          <Text style={{ textAlign: "center" }}>
            {gt("Edit src/app/index.tsx to edit this screen.")}
          </Text>
        </Column>
      </Box>
    </Host>
  );
}
