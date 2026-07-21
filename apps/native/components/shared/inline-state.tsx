import { CreateButtonPointer } from "@/components/shared/create-button-pointer";
import { Text } from "@/components/ui/text";
import { MascotEmptyState, type MascotVariant } from "@/components/shared/mascot-empty-state";
import { cn } from "@/lib/utils";
import { View } from "react-native";

export function InlineState({
  className,
  message,
  mascot,
  width,
  pointToCreateButton = false,
}: {
  className?: string;
  message: string;
  mascot?: MascotVariant;
  width?: number;
  /** Draws a curved line from this state to the global "+" create button. */
  pointToCreateButton?: boolean;
}) {
  const card = (
    <View
      className={cn(
        "items-center justify-center rounded-xl border border-border-subtle bg-card-bg p-6",
        className,
      )}
      style={width === undefined ? undefined : { width }}
    >
      {mascot ? (
        <MascotEmptyState message={message} variant={mascot} />
      ) : (
        <Text className="text-center text-sm font-semibold text-text-muted">{message}</Text>
      )}
    </View>
  );

  return pointToCreateButton ? <CreateButtonPointer>{card}</CreateButtonPointer> : card;
}
