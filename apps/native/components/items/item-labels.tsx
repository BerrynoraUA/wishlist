import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { getThemeMode } from "@/lib/theme";
import { isStarPriorityId, PRIORITY_IDS } from "@wishlist/backend/lib";
import type { ItemPriority } from "@wishlist/backend/types";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Clock3,
  Crown,
  Equal,
  Gem,
  PackageCheck,
  PackageOpen,
  Sparkle,
  Sparkles,
  Star,
  Waves,
  Zap,
} from "lucide-react-native";
import { View } from "react-native";
import { useCSSVariable, useUniwind } from "uniwind";

const STATUS_PALETTE = {
  reserved: {
    light: { backgroundColor: "#fde7f3", borderColor: "#f9a8d4", color: "#be185d" },
    dark: { backgroundColor: "#3d1327", borderColor: "#7a284f", color: "#f9a8d4" },
  },
  purchased: {
    light: { backgroundColor: "#dcfce7", borderColor: "#86efac", color: "#166534" },
    dark: { backgroundColor: "#16351f", borderColor: "#2f6d46", color: "#86efac" },
  },
} as const;

const PRIORITY_ICONS = {
  [PRIORITY_IDS.LOW]: ArrowDown,
  [PRIORITY_IDS.MEDIUM]: Equal,
  [PRIORITY_IDS.HIGH]: ArrowUp,
  [PRIORITY_IDS.URGENT]: Zap,
  [PRIORITY_IDS.CRITICAL]: AlertTriangle,
  [PRIORITY_IDS.EPIC]: Sparkles,
  [PRIORITY_IDS.LEGENDARY]: Crown,
  [PRIORITY_IDS.MYTHIC]: Waves,
  [PRIORITY_IDS.CELESTIAL]: Sparkle,
  [PRIORITY_IDS.DIVINE]: Gem,
  [PRIORITY_IDS.STAR]: Star,
} as const;

const PRIORITY_PALETTE = {
  Low: {
    light: { backgroundColor: "#dbeafe", borderColor: "#93c5fd", color: "#1d4ed8" },
    dark: { backgroundColor: "#172554", borderColor: "#2563eb", color: "#93c5fd" },
  },
  Medium: {
    light: { backgroundColor: "#fef3c7", borderColor: "#fcd34d", color: "#b45309" },
    dark: { backgroundColor: "#451a03", borderColor: "#d97706", color: "#fcd34d" },
  },
  High: {
    light: { backgroundColor: "#fee2e2", borderColor: "#fca5a5", color: "#b91c1c" },
    dark: { backgroundColor: "#4c0519", borderColor: "#e11d48", color: "#fda4af" },
  },
} as const;

/** Shared height so sale / priority / status pills on an item image line up exactly. */
export const CARD_BADGE_HEIGHT = 26;

export function ItemDetailStatusBadge({ label, purchased }: { label: string; purchased: boolean }) {
  const palette = useItemStatusPalette(purchased ? "purchased" : "reserved");

  return (
    <View
      className="rounded-full border px-2.5 py-1"
      style={{ backgroundColor: palette.backgroundColor, borderColor: palette.borderColor }}
    >
      <Text className="text-xs font-semibold" style={{ color: palette.color }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Stare follows the user's accent (`--color-brand`) like the old star card did;
 * every other priority uses its own fixed colour.
 */
export function usePriorityColor(priority: ItemPriority | null | undefined) {
  const brand = useCSSVariable("--color-brand");

  if (!priority) return undefined;
  if (!isStarPriorityId(priority.id)) return priority.color;

  return typeof brand === "string" ? brand : priority.color;
}

/**
 * The priority tints the item card border; Stare additionally keeps the heavier
 * frame it has always had. Mirrors the web card.
 */
export function useItemCardBorderStyle(priority: ItemPriority | null | undefined) {
  const color = usePriorityColor(priority);

  if (!priority || !color) return undefined;

  // Only Stare overrides the width. Passing `borderWidth: undefined` explicitly
  // would cancel the width coming from the card's className and leave the card
  // with no border at all, so the key is omitted instead.
  return isStarPriorityId(priority.id)
    ? { borderColor: color, borderWidth: 2 }
    : { borderColor: color };
}

export function ItemPriorityBadge({
  priority,
  label,
  compact = false,
  context = "detail",
}: {
  priority: ItemPriority;
  label: string;
  compact?: boolean;
  context?: "card" | "detail";
}) {
  const palette = usePriorityPalette(priority, context);
  const PriorityIcon = PRIORITY_ICONS[priority.id as keyof typeof PRIORITY_ICONS];

  return (
    <View
      className="flex-row items-center justify-center rounded-full border"
      style={{
        backgroundColor: palette.backgroundColor,
        borderColor: palette.borderColor,
        gap: 6,
        height: compact ? CARD_BADGE_HEIGHT : undefined,
        paddingHorizontal: 10,
        paddingVertical: compact ? 0 : 6,
      }}
    >
      {PriorityIcon ? <Icon as={PriorityIcon} className="size-3" color={palette.color} /> : null}
      <Text
        className={compact ? "text-[11px] font-bold" : "text-xs font-semibold"}
        numberOfLines={1}
        style={{ color: palette.color }}
      >
        {label}
      </Text>
    </View>
  );
}

/** Stare's icon medallion, hanging off the bottom edge of a card. */
export function ItemPriorityMedallion({
  priority,
  label,
  size = "card",
}: {
  priority: ItemPriority;
  label?: string | null;
  size?: "card" | "detail";
}) {
  const cardBackground = useCSSVariable("--color-card-bg");
  const color = usePriorityColor(priority) ?? priority.color;
  const PriorityIcon = PRIORITY_ICONS[priority.id as keyof typeof PRIORITY_ICONS];
  const diameter = size === "detail" ? 34 : 28;

  return (
    <View
      accessibilityLabel={label ?? priority.name}
      className="items-center justify-center rounded-full border-2"
      style={{
        backgroundColor: typeof cardBackground === "string" ? cardBackground : "transparent",
        borderColor: color,
        height: diameter,
        width: diameter,
      }}
    >
      {PriorityIcon ? (
        <Icon
          as={PriorityIcon}
          className={size === "detail" ? "size-4" : "size-3.5"}
          color={color}
        />
      ) : null}
    </View>
  );
}

export function PriorityFilterIcon({
  priority,
  showBackground = true,
}: {
  priority: ItemPriority;
  showBackground?: boolean;
}) {
  const PriorityIcon = PRIORITY_ICONS[priority.id as keyof typeof PRIORITY_ICONS];

  return (
    <View
      className="size-7 items-center justify-center rounded-lg"
      style={showBackground ? { backgroundColor: `${priority.color}1f` } : undefined}
    >
      {PriorityIcon ? <Icon as={PriorityIcon} className="size-3.5" color={priority.color} /> : null}
    </View>
  );
}

export function StatusFilterIcon({ status }: { status: "available" | "reserved" | "purchased" }) {
  const config =
    status === "available"
      ? { icon: PackageOpen, color: "#3b82f6" }
      : status === "reserved"
        ? { icon: Clock3, color: "#eab308" }
        : { icon: PackageCheck, color: "#22c55e" };

  return <Icon as={config.icon} className="size-3.5" color={config.color} />;
}

function useItemStatusPalette(status: keyof typeof STATUS_PALETTE) {
  const { theme } = useUniwind();
  return STATUS_PALETTE[status][getThemeMode(theme)];
}

function usePriorityPalette(priority: ItemPriority, context: "card" | "detail") {
  const { theme } = useUniwind();
  const cardBackground = useCSSVariable("--color-card-bg");
  const namedPalette = PRIORITY_PALETTE[priority.name as keyof typeof PRIORITY_PALETTE];
  // Not `priority.color`: Stare follows the accent, the rest keep their own.
  const color = usePriorityColor(priority) ?? priority.color;

  if (context === "detail" && namedPalette) return namedPalette[getThemeMode(theme)];

  return {
    backgroundColor: typeof cardBackground === "string" ? cardBackground : "transparent",
    borderColor: color,
    color,
  };
}
