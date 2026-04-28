import { cn } from "@/lib/utils";
import { TextInput } from "react-native";

type TextareaProps = React.ComponentProps<typeof TextInput> & {
  placeholderClassName?: string;
};

function Textarea({
  className,
  multiline = true,
  numberOfLines = 8,
  placeholderClassName,
  ...props
}: TextareaProps) {
  return (
    <TextInput
      className={cn(
        "text-foreground border-input dark:bg-input/30 flex min-h-16 w-full flex-row rounded-md border bg-transparent px-3 py-2 text-base shadow-sm shadow-black/5 md:text-sm",
        props.editable === false && "opacity-50",
        className,
      )}
      placeholderTextColorClassName={cn("accent-muted-foreground/50", placeholderClassName)}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      {...props}
    />
  );
}

export { Textarea };
