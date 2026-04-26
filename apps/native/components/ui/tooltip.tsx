import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { TextClassContext } from '@/components/ui/text';
import { motionDuration } from '@/lib/motion';
import { cn } from '@/lib/utils';
import * as TooltipPrimitive from '@rn-primitives/tooltip';
import * as React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function TooltipContent({
  className,
  sideOffset = 4,
  portalHost,
  side = 'top',
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & {
    portalHost?: string;
  }) {
  return (
    <TooltipPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <TooltipPrimitive.Overlay style={StyleSheet.absoluteFill}>
          <NativeOnlyAnimatedView
            entering={
              side === 'top'
                ? FadeInDown.withInitialValues({ transform: [{ translateY: 3 }] }).duration(
                    motionDuration.fast
                  )
                : FadeInUp.withInitialValues({ transform: [{ translateY: -5 }] }).duration(
                    motionDuration.fast
                  )
            }
            exiting={FadeOut.duration(motionDuration.fast)}>
            <TextClassContext.Provider value="text-xs text-primary-foreground">
              <TooltipPrimitive.Content
                sideOffset={sideOffset}
                className={cn(
                  'bg-primary z-50 rounded-md px-3 py-2 sm:py-1.5',
                  className
                )}
                side={side}
                {...props}
              />
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </TooltipPrimitive.Overlay>
      </FullWindowOverlay>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipTrigger };
