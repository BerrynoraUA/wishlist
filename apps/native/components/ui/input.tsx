import { cn } from "@/lib/utils";
import { TextInput } from "react-native";

type InputProps = React.ComponentProps<typeof TextInput> & {
  placeholderClassName?: string;
  // React 19 hands `ref` to function components as a plain prop, but React Native's
  // `TextInputProps` still does not declare it.
  ref?: React.Ref<TextInput>;
};

export const INPUT_CLASS_NAME =
  "dark:bg-input/30 border-input bg-background flex h-10 w-full min-w-0 flex-row items-center rounded-md border px-3 py-1 text-base leading-5 text-text shadow-sm shadow-black/5 sm:h-9";

function Input({ className, placeholderClassName, ...props }: InputProps) {
  return (
    <TextInput
      className={cn(
        INPUT_CLASS_NAME,
        props.editable === false && "opacity-50",
        "placeholder:text-muted-foreground/50",
        className,
      )}
      placeholderTextColorClassName={cn("accent-muted-foreground/50", placeholderClassName)}
      {...props}
    />
  );
}

export { Input };
