import { useAnimatedPressFeedback } from "@/components/ui/animated-pressable";
import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import * as TabsPrimitive from "@rn-primitives/tabs";
import Animated from "react-native-reanimated";

const AnimatedTabsTrigger = Animated.createAnimatedComponent(TabsPrimitive.Trigger);

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn("flex flex-col gap-2", className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "bg-muted flex h-9 flex-row items-center justify-center rounded-lg p-0.75",
        "me-auto",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  onPressIn,
  onPressOut,
  style,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { value } = TabsPrimitive.useRootContext();
  const { animatedStyle, handlePressIn, handlePressOut } = useAnimatedPressFeedback({
    disabled: props.disabled,
    onPressIn,
    onPressOut,
  });
  return (
    <TextClassContext.Provider
      value={cn(
        "text-foreground dark:text-muted-foreground text-sm font-medium",
        value === props.value && "dark:text-foreground",
      )}
    >
      <AnimatedTabsTrigger
        className={cn(
          "flex flex-row items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 shadow-none shadow-black/5",
          props.disabled && "opacity-50",
          props.value === value && "bg-background dark:border-foreground/10 dark:bg-input/30",
          className,
        )}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[style, animatedStyle]}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={className} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
