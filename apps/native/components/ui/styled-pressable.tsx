import { cn } from "@/lib/utils";
import * as React from "react";
import { Pressable } from "react-native";

export type StyledPressableProps = React.ComponentProps<typeof Pressable>;

const StyledPressable = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  StyledPressableProps
>(function StyledPressable({ className, ...props }, ref) {
  return <Pressable ref={ref} className={cn(className)} {...props} />;
});

StyledPressable.displayName = "StyledPressable";

export { StyledPressable };
