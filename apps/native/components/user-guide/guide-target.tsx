import {
  useUserGuideActiveTooltip,
  useUserGuideTargetRegistration,
} from "@/components/user-guide/user-guide-provider";
import { GuidePulseBorder } from "@/components/user-guide/guide-pulse-border";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

export function GuideTarget({
  attachedTooltip = true,
  children,
  borderRadius = 12,
  forceActive = false,
  id,
  onGuideActivate,
  portalHighlight = false,
  portalTooltipAnchor = "target",
  style,
  tooltipHorizontalOffset,
  tooltipPlacementOverride,
  tooltipVerticalOffset,
}: {
  attachedTooltip?: boolean;
  children: React.ReactNode;
  borderRadius?: number;
  forceActive?: boolean;
  id: string;
  onGuideActivate?: () => void;
  portalHighlight?: boolean;
  portalTooltipAnchor?: "target" | "footer";
  style?: StyleProp<ViewStyle>;
  tooltipHorizontalOffset?: number;
  tooltipPlacementOverride?: "top" | "bottom";
  tooltipVerticalOffset?: number;
}) {
  const ref = React.useRef<View>(null);
  const { activeTargetId, registerTarget, requestInstantMeasure } =
    useUserGuideTargetRegistration();
  const active = forceActive || activeTargetId === id;
  const footerHighlight = active && portalTooltipAnchor === "footer";

  React.useEffect(() => {
    return registerTarget(id, {
      activate: onGuideActivate,
      attachedTooltip,
      portalHighlight,
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
    portalHighlight,
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
      onLayout={active ? requestInstantMeasure : undefined}
      pointerEvents="box-none"
      style={[style, footerHighlight ? { margin: -5, padding: 5 } : null]}
    >
      {children}
      {active ? (
        <>
          {!portalHighlight ? (
            <GuidePulseBorder
              borderRadius={borderRadius + (footerHighlight ? 5 : 0)}
              outset={footerHighlight ? 0 : 5}
            />
          ) : null}
          {attachedTooltip ? <ActiveTargetTooltip /> : null}
        </>
      ) : null}
    </View>
  );
}

function ActiveTargetTooltip() {
  const tooltip = useUserGuideActiveTooltip();
  const t = useGT();
  if (!tooltip) return null;
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
          hitSlop={8}
          className="h-8 self-end rounded-md px-3"
        >
          <Text>{tooltip.isLastSequence ? t("Done") : t("Next")}</Text>
        </Button>
      ) : null}
    </View>
  );
}
