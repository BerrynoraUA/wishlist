import { Link, Stack } from "expo-router";
import { useGT } from "gt-react-native";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

export default function NotFoundScreen() {
  const t = useGT();
  return (
    <>
      <Stack.Screen options={{ title: t("Oops!") }} />
      <View>
        <Text>{t("This screen doesn't exist.")}</Text>

        <Link href="/">
          <Text>{t("Go to home screen!")}</Text>
        </Link>
      </View>
    </>
  );
}
