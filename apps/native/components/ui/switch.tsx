import { cn } from "@/lib/utils";
import * as SwitchPrimitives from "@rn-primitives/switch";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitives.Root>) {
  return (
    <SwitchPrimitives.Root
      className={cn(
        "flex h-7 w-12 shrink-0 flex-row items-center rounded-full p-0.5 shadow-inner shadow-black/5",
        props.checked ? "bg-primary" : "bg-input dark:bg-input/80",
        props.disabled && "opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "size-6 rounded-full bg-primary-foreground shadow-sm shadow-black/20 transition-transform",
          props.checked
            ? "translate-x-5"
            : "translate-x-0",
        )}
      />
    </SwitchPrimitives.Root>
  );
}

export { Switch };
