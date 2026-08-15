import { hapticLongPress, hapticSelection } from "@/lib/haptics";
import { useAppBlurTarget } from "@/components/ui/app-blur-target";
import { Icon } from "@/components/ui/icon";
import { NativeOnlyAnimatedView } from "@/components/ui/native-only-animated-view";
import { TextClassContext } from "@/components/ui/text";
import { WindowOverlay } from "@/components/ui/window-overlay";
import { motionDuration } from "@/lib/motion";
import { cn } from "@/lib/utils";
import * as DropdownMenuPrimitive from "@rn-primitives/dropdown-menu";
import type { TriggerRef } from "@rn-primitives/dropdown-menu";
import { BlurView } from "expo-blur";
import { Check, ChevronDown, ChevronUp } from "lucide-react-native";
import * as React from "react";
import { type StyleProp, Text, View, type ViewStyle, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { captureRef, releaseCapture } from "react-native-view-shot";

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

/**
 * The lifted card and the menu under it have to read as one object, so both enter on the
 * same spring. Fading the menu in while the card springs leaves the two visibly detached:
 * the card travels, the menu just appears where it will end up.
 *
 * A fresh builder per call — Reanimated mutates these descriptors when configured.
 */
const attachedEntering = () => FadeInUp.springify().damping(20).stiffness(240);

type DropdownMenuPreview = {
  height: number;
  pageX: number;
  pageY: number;
  uri: string;
  width: number;
};

function measureView(view: View) {
  return new Promise<Omit<DropdownMenuPreview, "uri">>((resolve) => {
    view.measure((_x, _y, width, height, pageX, pageY) => {
      resolve({ height, pageX, pageY, width });
    });
  });
}

function useDropdownMenuPreview() {
  const cardRef = React.useRef<View>(null);
  const triggerRef = React.useRef<TriggerRef>(null);
  const [preview, setPreview] = React.useState<DropdownMenuPreview | null>(null);

  const openMenu = React.useCallback(async () => {
    const card = cardRef.current;
    if (!card) return;

    hapticLongPress();

    try {
      const [layout, uri] = await Promise.all([
        measureView(card),
        captureRef(card, { format: "png", quality: 1, result: "tmpfile" }),
      ]);
      setPreview({ ...layout, uri });
      requestAnimationFrame(() => triggerRef.current?.open());
    } catch {
      triggerRef.current?.open();
    }
  }, []);

  const onOpenChange = React.useCallback((open: boolean) => {
    if (open) return;
    setPreview((current) => {
      if (current) releaseCapture(current.uri);
      return null;
    });
  }, []);

  return { cardRef, onOpenChange, openMenu, preview, triggerRef };
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  iconClassName,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  children?: React.ReactNode;
  iconClassName?: string;
  inset?: boolean;
}) {
  const { open } = DropdownMenuPrimitive.useSubContext();
  const icon = open ? ChevronUp : ChevronDown;
  return (
    <TextClassContext.Provider
      value={cn(
        "text-sm select-none group-active:text-accent-foreground",
        open && "text-accent-foreground",
      )}
    >
      <DropdownMenuPrimitive.SubTrigger
        className={cn(
          "active:bg-accent group flex flex-row items-center justify-between rounded-sm px-2 py-2 sm:py-1.5",
          className,
          open && "bg-accent",
          inset && "ps-8",
        )}
        {...props}
      >
        <>{children}</>
        <Icon as={icon} className={cn("text-foreground size-4 shrink-0", iconClassName)} />
      </DropdownMenuPrimitive.SubTrigger>
    </TextClassContext.Provider>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <NativeOnlyAnimatedView entering={FadeIn.duration(motionDuration.normal)}>
      <DropdownMenuPrimitive.SubContent
        className={cn(
          "bg-card-bg/95 border-border overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5",
          className,
        )}
        {...props}
      />
    </NativeOnlyAnimatedView>
  );
}

/**
 * Tail joining the menu to the card above (or below) it. A square rotated 45° with two
 * borders, matching the tooltip carets in the user guide: its fill is the menu's own
 * colour, so the half that overlaps the panel is invisible and only the tip shows.
 */
function DropdownMenuCaret({ side }: { side: "top" | "bottom" }) {
  return (
    <View
      pointerEvents="none"
      className={cn(
        "absolute -ms-1.5 size-3 rotate-45 border-white/10 bg-[#121219]",
        side === "top" ? "-bottom-1.5 border-b border-e" : "-top-1.5 border-s border-t",
      )}
      style={{ start: "50%" }}
    />
  );
}

function DropdownMenuContent({
  children,
  className,
  backdrop = "none",
  overlayClassName,
  overlayStyle,
  portalHost,
  preview,
  side,
  sideOffset,
  style,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content> & {
  backdrop?: "none" | "blur";
  overlayStyle?: StyleProp<ViewStyle>;
  overlayClassName?: string;
  portalHost?: string;
  preview?: DropdownMenuPreview | null;
}) {
  const blurTarget = useAppBlurTarget();
  const { height: windowHeight } = useWindowDimensions();
  const { triggerPosition, contentLayout, setTriggerPosition, onOpenChange } =
    DropdownMenuPrimitive.useRootContext();
  const closeFromBackPress = () => {
    setTriggerPosition(null);
    onOpenChange(false);
  };
  // The caret is what ties the menu to the lifted card; without it the two read as
  // separate surfaces that happen to sit near each other.
  const hasCaret = backdrop === "blur" && Boolean(preview);
  const previewLift = preview ? Math.min(28, Math.max(16, preview.pageY - 12)) : 0;
  const contentHeight = contentLayout?.height ?? 128;
  const blurMenuSideOffset = sideOffset ?? 10;
  const liftedPreviewTop = preview ? preview.pageY - previewLift : (triggerPosition?.pageY ?? 0);
  const liftedPreviewBottom = preview
    ? liftedPreviewTop + preview.height
    : triggerPosition
      ? triggerPosition.pageY + triggerPosition.height
      : 0;
  const availableBelow = windowHeight - liftedPreviewBottom;
  const availableAbove = liftedPreviewTop;
  const shouldOpenAbove =
    backdrop === "blur" &&
    Boolean(preview) &&
    availableBelow < contentHeight + blurMenuSideOffset &&
    availableAbove > availableBelow;
  const resolvedSide = side ?? (shouldOpenAbove ? "top" : "bottom");
  const actionMenuWidth =
    triggerPosition?.width != null ? Math.min(Math.max(triggerPosition.width - 56, 176), 224) : 176;
  const contentStyle =
    triggerPosition?.width != null
      ? ([
          style,
          backdrop === "blur"
            ? {
                width: actionMenuWidth,
                transform: [{ translateY: -previewLift }],
              }
            : { minWidth: triggerPosition.width },
        ] as unknown as React.ComponentProps<typeof DropdownMenuPrimitive.Content>["style"])
      : (style ?? undefined);

  const overlay = (
    <DropdownMenuPrimitive.Overlay
      className={cn("absolute inset-0", overlayClassName)}
      style={overlayStyle}
    >
      {backdrop === "blur" ? (
        <NativeOnlyAnimatedView
          pointerEvents="none"
          entering={FadeIn.duration(motionDuration.normal)}
          style={{ position: "absolute", inset: 0 }}
        >
          <BlurView
            blurTarget={blurTarget ?? undefined}
            blurMethod="dimezisBlurView"
            blurReductionFactor={1.8}
            intensity={82}
            tint="dark"
            style={{ position: "absolute", inset: 0 }}
          />
          <View className="absolute inset-0 bg-black/25" />
        </NativeOnlyAnimatedView>
      ) : null}
      {backdrop === "blur" && preview ? (
        <Animated.View
          pointerEvents="none"
          entering={attachedEntering()}
          style={{
            position: "absolute",
            top: preview.pageY - previewLift,
            left: preview.pageX,
            width: preview.width,
            height: preview.height,
            borderRadius: 12,
            borderCurve: "continuous",
            boxShadow: "0 14px 36px rgba(0, 0, 0, 0.34)",
          }}
        >
          <Animated.Image
            source={{ uri: preview.uri }}
            resizeMode="stretch"
            style={{ width: "100%", height: "100%", borderRadius: 12 }}
          />
        </Animated.View>
      ) : null}
      <NativeOnlyAnimatedView
        entering={preview ? attachedEntering() : FadeIn.duration(motionDuration.normal)}
      >
        <TextClassContext.Provider value="text-popover-foreground">
          <DropdownMenuPrimitive.Content
            className={cn(
              "bg-card-bg/95 border-border min-w-[8rem] rounded-xl border p-1 shadow-xl shadow-black/15",
              backdrop === "blur" && "rounded-2xl border-white/10 bg-[#121219]/96 p-2",
              // The caret has to overhang the edge, so a menu with one cannot clip.
              !hasCaret && "overflow-hidden",
              className,
            )}
            style={contentStyle}
            side={backdrop === "blur" ? resolvedSide : side}
            sideOffset={backdrop === "blur" ? blurMenuSideOffset : sideOffset}
            {...props}
          >
            {hasCaret ? (
              <>
                <DropdownMenuCaret side={resolvedSide} />
                {/* The primitive also accepts a Pressable-style render callback, which
                    no menu here uses — items are always plain elements. */}
                {children as React.ReactNode}
              </>
            ) : (
              children
            )}
          </DropdownMenuPrimitive.Content>
        </TextClassContext.Provider>
      </NativeOnlyAnimatedView>
    </DropdownMenuPrimitive.Overlay>
  );

  return (
    <DropdownMenuPrimitive.Portal hostName={portalHost}>
      {backdrop === "blur" ? (
        overlay
      ) : (
        <WindowOverlay onRequestClose={closeFromBackPress}>{overlay}</WindowOverlay>
      )}
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  inset,
  layout = "default",
  variant,
  onPress,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  className?: string;
  inset?: boolean;
  layout?: "default" | "action";
  variant?: "default" | "destructive";
}) {
  function handlePress(event: Parameters<NonNullable<typeof onPress>>[0]) {
    hapticSelection();
    onPress?.(event);
  }

  return (
    <TextClassContext.Provider
      value={cn(
        "select-none text-sm text-popover-foreground group-active:text-popover-foreground",
        variant === "destructive" && "text-destructive group-active:text-destructive",
      )}
    >
      <DropdownMenuPrimitive.Item
        className={cn(
          "active:bg-accent group relative min-h-11 flex-row items-center gap-3 rounded-lg px-3 py-2 sm:py-1.5",
          layout === "action" && "min-h-12 rounded-xl px-3.5",
          variant === "destructive" && "active:bg-destructive/10 dark:active:bg-destructive/20",
          props.disabled && "opacity-50",
          inset && "ps-8",
          className,
        )}
        onPress={handlePress}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  leading,
  leadingClassName,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> & {
  children?: React.ReactNode;
  leading?: React.ReactNode;
  leadingClassName?: string;
}) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <DropdownMenuPrimitive.CheckboxItem
        className={cn(
          "active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 ps-8 pe-2 sm:py-1.5",
          props.disabled && "opacity-50",
          className,
        )}
        {...props}
      >
        <View
          className={cn(
            "absolute start-2 flex h-3.5 w-3.5 items-center justify-center",
            leadingClassName,
          )}
        >
          {leading ?? (
            <DropdownMenuPrimitive.ItemIndicator>
              <Icon
                as={Check}
                className="size-4 text-foreground dark:text-white pink-dark:text-white blue-dark:text-white peach-dark:text-white mint-dark:text-white lavender-dark:text-white"
              />
            </DropdownMenuPrimitive.ItemIndicator>
          )}
        </View>
        <>{children}</>
      </DropdownMenuPrimitive.CheckboxItem>
    </TextClassContext.Provider>
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & {
  children?: React.ReactNode;
}) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <DropdownMenuPrimitive.RadioItem
        className={cn(
          "active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 ps-8 pe-2 sm:py-1.5",
          props.disabled && "opacity-50",
          className,
        )}
        {...props}
      >
        <View className="absolute start-2 flex h-3.5 w-3.5 items-center justify-center">
          <DropdownMenuPrimitive.ItemIndicator>
            <View className="bg-foreground h-2 w-2 rounded-full" />
          </DropdownMenuPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </DropdownMenuPrimitive.RadioItem>
    </TextClassContext.Provider>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  className?: string;
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        "text-foreground px-2 py-2 text-sm font-medium sm:py-1.5",
        inset && "ps-8",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn("text-muted-foreground ms-auto text-xs tracking-widest", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  useDropdownMenuPreview,
};
