import { NativeOnlyAnimatedView } from "@/components/ui/native-only-animated-view";
import { TextClassContext } from "@/components/ui/text";
import { WindowOverlay } from "@/components/ui/window-overlay";
import { motionDuration } from "@/lib/motion";
import { cn } from "@/lib/utils";
import * as PopoverPrimitive from "@rn-primitives/popover";
import * as React from "react";
import { FadeIn, FadeOut } from "react-native-reanimated";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  portalHost,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  portalHost?: string;
}) {
  const { setTriggerPosition, onOpenChange } = PopoverPrimitive.useRootContext();
  const closeFromBackPress = () => {
    setTriggerPosition(null);
    onOpenChange(false);
  };

  return (
    <PopoverPrimitive.Portal hostName={portalHost}>
      <WindowOverlay onRequestClose={closeFromBackPress}>
        <PopoverPrimitive.Overlay className="absolute inset-0">
          <NativeOnlyAnimatedView
            entering={FadeIn.duration(motionDuration.normal)}
            exiting={FadeOut.duration(motionDuration.fast)}
          >
            <TextClassContext.Provider value="text-popover-foreground">
              <PopoverPrimitive.Content
                align={align}
                sideOffset={sideOffset}
                className={cn(
                  "bg-popover border-border outline-hidden z-50 w-72 rounded-md border p-4 shadow-md shadow-black/5",
                  className,
                )}
                {...props}
              />
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </PopoverPrimitive.Overlay>
      </WindowOverlay>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
