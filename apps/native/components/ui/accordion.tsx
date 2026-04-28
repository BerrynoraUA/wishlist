import { Icon } from "@/components/ui/icon";
import { TextClassContext } from "@/components/ui/text";
import { motionDuration } from "@/lib/motion";
import { cn } from "@/lib/utils";
import * as AccordionPrimitive from "@rn-primitives/accordion";
import { ChevronDown } from "lucide-react-native";
import { Pressable } from "react-native";
import Animated, {
  FadeOutUp,
  LayoutAnimationConfig,
  LinearTransition,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";

function Accordion({
  children,
  ref: _ref,
  ...props
}: Omit<React.ComponentProps<typeof AccordionPrimitive.Root>, "asChild">) {
  return (
    <LayoutAnimationConfig skipEntering>
      <AccordionPrimitive.Root {...(props as AccordionPrimitive.RootProps)} asChild>
        <Animated.View layout={LinearTransition.duration(motionDuration.normal)}>
          {children}
        </Animated.View>
      </AccordionPrimitive.Root>
    </LayoutAnimationConfig>
  );
}

function AccordionItem({
  children,
  className,
  value,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      className={cn("border-border border-b", className)}
      value={value}
      asChild
      {...props}
    >
      <Animated.View
        className="overflow-hidden"
        layout={LinearTransition.duration(motionDuration.normal)}
      >
        {children}
      </Animated.View>
    </AccordionPrimitive.Item>
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> & {
  children?: React.ReactNode;
}) {
  const { isExpanded } = AccordionPrimitive.useItemContext();

  const progress = useDerivedValue(
    () =>
      isExpanded
        ? withTiming(1, { duration: motionDuration.normal })
        : withTiming(0, { duration: motionDuration.fast }),
    [isExpanded],
  );
  const chevronStyle = useAnimatedStyle(
    () => ({
      transform: [{ rotate: `${progress.value * 180}deg` }],
    }),
    [progress],
  );

  return (
    <TextClassContext.Provider value="text-left text-sm font-medium">
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger {...props} asChild>
          <Pressable
            className={cn(
              "flex-row items-start justify-between gap-4 rounded-md py-4 disabled:opacity-50",
              className,
            )}
          >
            <>{children}</>
            <Animated.View style={chevronStyle}>
              <Icon as={ChevronDown} size={16} className="text-muted-foreground shrink-0" />
            </Animated.View>
          </Pressable>
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
    </TextClassContext.Provider>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <TextClassContext.Provider value="text-sm">
      <AccordionPrimitive.Content className="overflow-hidden" {...props}>
        <Animated.View
          exiting={FadeOutUp.duration(motionDuration.fast)}
          className={cn("pb-4", className)}
        >
          {children}
        </Animated.View>
      </AccordionPrimitive.Content>
    </TextClassContext.Provider>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
