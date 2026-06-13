import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { View } from "react-native";

export function InlineState({
  className,
  message,
  width,
}: {
  className?: string;
  message: string;
  width?: number;
}) {
  return (
    <View
      className={cn(
        "items-center justify-center rounded-xl border border-border-subtle bg-card-bg p-6",
        className,
      )}
      style={width === undefined ? undefined : { width }}
    >
      <Text className="text-center text-sm font-semibold text-text-muted">{message}</Text>
    </View>
  );
}
