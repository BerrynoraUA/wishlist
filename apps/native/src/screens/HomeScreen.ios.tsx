import { Host, Text, VStack } from "@expo/ui/swift-ui";
import { GtLocaleSelector } from "@/components/GtLocaleSelector";
import { T } from "gt-react-native";

export default function HomeScreen() {
  return (
    <Host style={{ flex: 1 }}>
      <VStack spacing={16} alignment="center">
        <GtLocaleSelector />
        <T>
          <Text>Edit src/screens/HomeScreen.ios.tsx to edit this screen.</Text>
        </T>
      </VStack>
    </Host>
  );
}
