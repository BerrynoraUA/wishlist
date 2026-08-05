import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { X } from "lucide-react-native";
import { View } from "react-native";

/**
 * Text field whose clear affordance sits inside the frame instead of beside it.
 *
 * The border moves to the wrapper and the input itself goes borderless, so the field
 * still reads as one box at full width — putting the button outside shortens the input
 * and makes the pair look like two separate controls. Matches the friend search fields.
 */
export function ClearableInput({
  className,
  clearLabel,
  containerClassName,
  invalid = false,
  leading,
  onClear,
  showClear,
  value,
  ...props
}: React.ComponentProps<typeof Input> & {
  /** Accessibility label for the clear button. */
  clearLabel: string;
  containerClassName?: string;
  invalid?: boolean;
  /** Rendered before the input — a search icon, for example. */
  leading?: React.ReactNode;
  onClear: () => void;
  /** Defaults to "whenever there is something to clear". */
  showClear?: boolean;
}) {
  const canClear = showClear ?? Boolean(value);

  return (
    <View
      className={cn(
        "border-input bg-background dark:bg-input/30 h-10 flex-row items-center gap-1 rounded-md border px-3 shadow-sm shadow-black/5 sm:h-9",
        invalid && "border-destructive",
        containerClassName,
      )}
    >
      {leading}
      <Input
        value={value}
        className={cn(
          "h-full min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none dark:bg-transparent",
          className,
        )}
        {...props}
      />
      {canClear ? (
        <Button
          variant="ghost"
          size="icon"
          accessibilityLabel={clearLabel}
          onPress={onClear}
          className="-me-1.5 size-8 shrink-0 rounded-full"
        >
          <Icon as={X} className="size-4 text-destructive" />
        </Button>
      ) : null}
    </View>
  );
}
