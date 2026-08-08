import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { getThemeMode } from "@/lib/theme";
import { PRIORITY_IDS } from "@wishlist/backend/lib";
import type { ItemPriority } from "@wishlist/backend/types";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Clock3,
  Crown,
  Gem,
  LockKeyhole,
  Minus,
  PackageCheck,
  PackageOpen,
  ShoppingCart,
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
  [PRIORITY_IDS.MEDIUM]: Minus,
  [PRIORITY_IDS.HIGH]: ArrowUp,
  [PRIORITY_IDS.URGENT]: Zap,
  [PRIORITY_IDS.CRITICAL]: AlertTriangle,
  [PRIORITY_IDS.EPIC]: Sparkles,
  [PRIORITY_IDS.LEGENDARY]: Crown,
  [PRIORITY_IDS.MYTHIC]: Waves,
  [PRIORITY_IDS.CELESTIAL]: Star,
  [PRIORITY_IDS.DIVINE]: Gem,
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

export function ItemStatusBadge({ label, purchased }: { label: string; purchased: boolean }) {
  const palette = useItemStatusPalette(purchased ? "purchased" : "reserved");
  const icon = purchased ? ShoppingCart : LockKeyhole;

  return (
    <View
      className="max-w-full flex-row items-center justify-center rounded-full border"
      style={{
        backgroundColor: palette.backgroundColor,
        borderColor: palette.borderColor,
        gap: 6,
        height: CARD_BADGE_HEIGHT,
        paddingHorizontal: 10,
      }}
    >
      <Icon as={icon} className="size-3.5" color={palette.color} />
      <Text
        className="min-w-0 shrink text-[11px] font-bold"
        numberOfLines={1}
        style={{ color: palette.color }}
      >
        {label}
      </Text>
    </View>
  );
}

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

  if (context === "detail" && namedPalette) return namedPalette[getThemeMode(theme)];

  return {
    backgroundColor: typeof cardBackground === "string" ? cardBackground : "transparent",
    borderColor: priority.color,
    color: priority.color,
  };
}
