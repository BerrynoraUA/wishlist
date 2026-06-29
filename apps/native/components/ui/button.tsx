import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

// NOTE: group-* is not supported yet by Uniwind

const buttonVariants = cva(
  "group shrink-0 flex-row items-center justify-center gap-2 rounded-md shadow-none",
  {
    variants: {
      variant: {
        default: "bg-primary active:bg-primary/90 shadow-sm shadow-black/5",
        destructive:
          "bg-destructive active:bg-destructive/90 dark:bg-destructive/60 shadow-sm shadow-black/5",
        outline:
          "border-border bg-background active:bg-accent dark:bg-input/30 dark:border-input dark:active:bg-input/50 border shadow-sm shadow-black/5",
        secondary: "bg-secondary active:bg-secondary/80 shadow-sm shadow-black/5",
        ghost: "active:bg-accent dark:active:bg-accent/50",
        // Translucent "glass" control for use over photos/accent backgrounds.
        glass: "border border-white/35 bg-white/25 active:bg-white/40 shadow-sm shadow-black/5",
        link: "",
      },
      size: {
        default: "h-10 px-4 py-2 sm:h-9",
        sm: "h-9 gap-1.5 rounded-md px-3 sm:h-8",
        lg: "h-11 rounded-md px-6 sm:h-10",
        icon: "h-10 w-10 sm:h-9 sm:w-9",
        // Square icon buttons at fixed control heights (no breakpoint shrink).
        "icon-sm": "h-9 w-9",
        "icon-lg": "h-11 w-11",
        // Rounded pill controls (e.g. filter dropdown triggers) aligned to the
        // 44px control height used across toolbars; "pill-sm" for compact chips.
        pill: "h-11 gap-2 rounded-full px-3",
        "pill-sm": "h-9 gap-1.5 rounded-full px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const buttonTextVariants = cva("text-text text-sm font-medium", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      destructive: "text-white",
      outline: "group-active:text-accent-foreground",
      secondary: "text-secondary-foreground",
      ghost: "group-active:text-accent-foreground",
      glass: "text-white",
      link: "text-primary group-active:underline",
    },
    size: {
      default: "",
      sm: "",
      lg: "",
      icon: "",
      "icon-sm": "",
      "icon-lg": "",
      pill: "",
      "pill-sm": "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

type ButtonProps = React.ComponentProps<typeof AnimatedPressable> &
  VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <AnimatedPressable
        className={cn(props.disabled && "opacity-50", buttonVariants({ variant, size }), className)}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
