import { NativeOnlyAnimatedView } from "@/components/ui/native-only-animated-view";
import { TextClassContext } from "@/components/ui/text";
import { WindowOverlay } from "@/components/ui/window-overlay";
import { motionDuration } from "@/lib/motion";
import { cn } from "@/lib/utils";
import * as HoverCardPrimitive from "@rn-primitives/hover-card";
import * as React from "react";
import { FadeIn, FadeOut } from "react-native-reanimated";

const HoverCard = HoverCardPrimitive.Root;

const HoverCardTrigger = HoverCardPrimitive.Trigger;

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  const { setTriggerPosition, onOpenChange } = HoverCardPrimitive.useRootContext();
  const closeFromBackPress = () => {
    setTriggerPosition(null);
    onOpenChange(false);
  };

  return (
    <HoverCardPrimitive.Portal>
      <WindowOverlay onRequestClose={closeFromBackPress}>
        <HoverCardPrimitive.Overlay className="absolute inset-0">
          <NativeOnlyAnimatedView
            entering={FadeIn.duration(motionDuration.normal)}
            exiting={FadeOut.duration(motionDuration.fast)}
          >
            <TextClassContext.Provider value="text-popover-foreground">
              <HoverCardPrimitive.Content
                align={align}
                sideOffset={sideOffset}
                className={cn(
                  "bg-popover border-border outline-hidden z-50 w-64 rounded-md border p-4 shadow-md shadow-black/5",
                  className,
                )}
                {...props}
              />
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </HoverCardPrimitive.Overlay>
      </WindowOverlay>
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
