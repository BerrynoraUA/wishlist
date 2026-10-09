import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { TouchTarget } from "@/components/ui/touch-target";
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
  trailing,
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
  /** Rendered in the clear button's place while there is nothing to clear. */
  trailing?: React.ReactNode;
}) {
  const canClear = showClear ?? Boolean(value);

  return (
    <View
      className={cn(
        "border-input bg-background dark:bg-input/30 min-h-10 flex-row items-center gap-1 rounded-md border px-3 shadow-sm shadow-black/5 sm:min-h-9",
        invalid && "border-destructive",
        containerClassName,
      )}
    >
      {leading}
      <Input
        value={value}
        className={cn(
          "min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none dark:bg-transparent",
          className,
        )}
        {...props}
      />
      {canClear ? (
        <TouchTarget
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          onPress={onClear}
          slop={6}
          className="-me-1.5 shrink-0"
          contentClassName="size-8 items-center justify-center rounded-full"
          pressedClassName="bg-accent dark:bg-accent/50"
        >
          <Icon as={X} className="size-4 text-destructive" />
        </TouchTarget>
      ) : (
        trailing
      )}
    </View>
  );
}
