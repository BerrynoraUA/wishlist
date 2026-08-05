import { useUserGuideTargetRegistration } from "@/components/user-guide/user-guide-provider";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

export function GuideTarget({
  attachedTooltip = true,
  children,
  id,
  onGuideActivate,
  portalTooltipAnchor = "target",
  style,
  tooltipHorizontalOffset,
  tooltipPlacementOverride,
  tooltipVerticalOffset,
}: {
  attachedTooltip?: boolean;
  children: React.ReactNode;
  id: string;
  onGuideActivate?: () => void;
  portalTooltipAnchor?: "target" | "footer";
  style?: StyleProp<ViewStyle>;
  tooltipHorizontalOffset?: number;
  tooltipPlacementOverride?: "top" | "bottom";
  tooltipVerticalOffset?: number;
}) {
  const ref = React.useRef<View>(null);
  const { activeTargetId, activeTooltip, registerTarget, requestInstantMeasure } =
    useUserGuideTargetRegistration();
  const active = activeTargetId === id;
  const tooltip = active ? activeTooltip : null;

  React.useEffect(() => {
    return registerTarget(id, {
      activate: onGuideActivate,
      attachedTooltip,
      portalTooltipAnchor,
      ref,
      tooltipHorizontalOffset,
      tooltipPlacementOverride,
      tooltipVerticalOffset,
    });
  }, [
    attachedTooltip,
    id,
    onGuideActivate,
    portalTooltipAnchor,
    registerTarget,
    tooltipHorizontalOffset,
    tooltipPlacementOverride,
    tooltipVerticalOffset,
  ]);

  return (
    <View
      ref={ref}
      collapsable={false}
      className="relative"
      onLayout={requestInstantMeasure}
      pointerEvents="box-none"
      style={style}
    >
      {children}
      {active ? (
        <>
          <View
            pointerEvents="none"
            className="absolute rounded-xl bg-brand opacity-15"
            style={{ bottom: -10, left: -10, right: -10, top: -10 }}
          />
          <View
            pointerEvents="none"
            className="absolute rounded-[10px] border-2 border-brand"
            style={{ bottom: -6, left: -6, right: -6, top: -6 }}
          />
          {tooltip ? <AttachedTooltip tooltip={tooltip} /> : null}
        </>
      ) : null}
    </View>
  );
}

function AttachedTooltip({
  tooltip,
}: {
  tooltip: NonNullable<ReturnType<typeof useUserGuideTargetRegistration>["activeTooltip"]>;
}) {
  const t = useGT();
  const tooltipPosition =
    tooltip.placement === "top"
      ? { bottom: "100%" as const, marginBottom: 2 }
      : { marginTop: 2, top: "100%" as const };
  const arrowClassName =
    tooltip.placement === "top"
      ? "absolute -bottom-1.25 size-3 rotate-45 border-b border-e border-border bg-card-bg"
      : "absolute -top-1.25 size-3 rotate-45 border-s border-t border-border bg-card-bg";

  return (
    <View
      className="absolute z-50 w-57.5 gap-2 rounded-lg border border-border bg-card-bg px-3 py-2"
      style={[
        tooltipPosition,
        {
          left: tooltip.left,
          zIndex: 80,
        },
      ]}
    >
      <View pointerEvents="none" className={arrowClassName} style={{ left: tooltip.arrowLeft }} />
      <Text className="text-xs font-bold leading-4 text-text">{tooltip.text}</Text>
      {tooltip.hasSequence ? (
        <Button
          size="sm"
          disabled={tooltip.pending}
          onPress={tooltip.onNext}
          className="h-8 self-end rounded-md px-3"
        >
          <Text>{tooltip.isLastSequence ? t("Done") : t("Next")}</Text>
        </Button>
      ) : null}
    </View>
  );
}
