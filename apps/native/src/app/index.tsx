import { Text, View, StyleSheet } from "react-native";
import { useGT } from "gt-react-native";
import { GtLocaleSelector } from "@/components/GtLocaleSelector";

export default function Index() {
  const gt = useGT();

  return (
    <View style={styles.container}>
      <GtLocaleSelector />
      <Text style={styles.message}>
        {gt("Edit src/app/index.tsx to edit this screen.")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  message: {
    textAlign: "center",
  },
});
