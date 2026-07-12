import { NativeOnlyAnimatedView } from "@/components/ui/native-only-animated-view";
import { TextClassContext } from "@/components/ui/text";
import { WindowOverlay } from "@/components/ui/window-overlay";
import { motionDuration } from "@/lib/motion";
import { cn } from "@/lib/utils";
import * as TooltipPrimitive from "@rn-primitives/tooltip";
import * as React from "react";
import { FadeInDown, FadeInUp, FadeOut } from "react-native-reanimated";

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  sideOffset = 4,
  portalHost,
  side = "top",
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & {
  portalHost?: string;
}) {
  return (
    <TooltipPrimitive.Portal hostName={portalHost}>
      {/* @rn-primitives/tooltip does not export its root context, so the
          hardware back press cannot be wired up; tapping the overlay closes. */}
      <WindowOverlay>
        <TooltipPrimitive.Overlay className="absolute inset-0">
          <NativeOnlyAnimatedView
            entering={
              side === "top"
                ? FadeInDown.withInitialValues({ transform: [{ translateY: 3 }] }).duration(
                    motionDuration.fast,
                  )
                : FadeInUp.withInitialValues({ transform: [{ translateY: -5 }] }).duration(
                    motionDuration.fast,
                  )
            }
            exiting={FadeOut.duration(motionDuration.fast)}
          >
            <TextClassContext.Provider value="text-xs text-primary-foreground">
              <TooltipPrimitive.Content
                sideOffset={sideOffset}
                className={cn("bg-primary z-50 rounded-md px-3 py-2 sm:py-1.5", className)}
                side={side}
                {...props}
              />
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </TooltipPrimitive.Overlay>
      </WindowOverlay>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipTrigger };
