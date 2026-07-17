import { Icon } from "@/components/ui/icon";
import { NativeOnlyAnimatedView } from "@/components/ui/native-only-animated-view";
import { WindowOverlay } from "@/components/ui/window-overlay";
import { motionDuration } from "@/lib/motion";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@rn-primitives/dialog";
import { X } from "lucide-react-native";
import * as React from "react";
import { Text, View, type ViewProps } from "react-native";
import { FadeIn, FadeOut } from "react-native-reanimated";
import { useGT } from "gt-react-native";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

function DialogOverlay({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Overlay>, "asChild"> & {
  children?: React.ReactNode;
}) {
  const { onOpenChange } = DialogPrimitive.useRootContext();

  return (
    <WindowOverlay onRequestClose={() => onOpenChange(false)}>
      <DialogPrimitive.Overlay
        className={cn(
          "absolute bottom-0 left-0 right-0 top-0 z-50 flex items-center justify-center bg-black/50 p-2",
          className,
        )}
        {...props}
        asChild
      >
        <NativeOnlyAnimatedView
          entering={FadeIn.duration(motionDuration.normal)}
          exiting={FadeOut.duration(motionDuration.fast)}
        >
          <NativeOnlyAnimatedView
            entering={FadeIn.delay(50)}
            exiting={FadeOut.duration(motionDuration.fast)}
          >
            <>{children}</>
          </NativeOnlyAnimatedView>
        </NativeOnlyAnimatedView>
      </DialogPrimitive.Overlay>
    </WindowOverlay>
  );
}
function DialogContent({
  className,
  contentContainerClassName,
  contentEntering,
  contentExiting,
  overlayClassName,
  portalHost,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  contentContainerClassName?: string;
  contentEntering?: React.ComponentProps<typeof NativeOnlyAnimatedView>["entering"];
  contentExiting?: React.ComponentProps<typeof NativeOnlyAnimatedView>["exiting"];
  overlayClassName?: string;
  portalHost?: string;
}) {
  const t = useGT();

  return (
    <DialogPortal hostName={portalHost}>
      <DialogOverlay className={overlayClassName}>
        <NativeOnlyAnimatedView
          className={contentContainerClassName}
          entering={contentEntering}
          exiting={contentExiting}
        >
          <DialogPrimitive.Content
            className={cn(
              "bg-background border-border z-50 mx-auto flex w-full flex-col gap-4 rounded-lg border p-6 shadow-lg shadow-black/5 sm:max-w-lg",
              className,
            )}
            {...props}
          >
            <>{children}</>
            <DialogPrimitive.Close
              className="absolute right-4 top-4 rounded opacity-70 active:opacity-100"
              hitSlop={12}
            >
              <Icon as={X} className="text-accent-foreground size-4 shrink-0" />
              <Text className="sr-only">{t("Close")}</Text>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </NativeOnlyAnimatedView>
      </DialogOverlay>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: ViewProps) {
  return (
    <View className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...props} />
  );
}

function DialogFooter({ className, ...props }: ViewProps) {
  return <View className={cn("flex flex-row gap-2", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-foreground text-lg font-semibold leading-none", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
