import { Host, Text, VStack } from "@expo/ui/swift-ui";
import { useGT } from "gt-react-native";
import { GtLocaleSelector } from "@/components/GtLocaleSelector";

export default function HomeScreen() {
  const gt = useGT();

  return (
    <Host style={{ flex: 1 }}>
      <VStack spacing={16} alignment="center">
        <GtLocaleSelector />
        <Text>{gt("Edit src/app/index.tsx to edit this screen.")}</Text>
      </VStack>
    </Host>
  );
}
