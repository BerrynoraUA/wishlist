import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { View } from "react-native";

/**
 * Shared loading skeletons for the list and detail screens.
 *
 * Every screen used to drop a centred `ActivityIndicator` into an empty card,
 * which reads as "something is stuck" rather than "content is arriving". These
 * mirror the shape of the real content instead, so the layout does not jump
 * once data lands. Card chrome matches the real cards on purpose — same radius,
 * border and surface — so only the contents fade in.
 */

const CARD_SHELL = "overflow-hidden rounded-xl border border-border-subtle bg-card-bg";

/** Stacked row cards: friends, Secret Santa events and invites, bugs, ideas. */
export function ListRowsSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <View className={cn("gap-4", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} className={cn(CARD_SHELL, "flex-row items-center gap-3 p-4")}>
          <Skeleton className="size-12 rounded-full" />
          <View className="min-w-0 flex-1 gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-2/5" />
          </View>
          <Skeleton className="h-9 w-20 rounded-full" />
        </View>
      ))}
    </View>
  );
}

/** Grid of media cards: discover feed, a friend's wishlists, wishlist items. */
export function CardGridSkeleton({
  cardWidth,
  gridGap,
  count = 4,
}: {
  cardWidth: number;
  gridGap: number;
  count?: number;
}) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: gridGap }}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} className={CARD_SHELL} style={{ width: cardWidth }}>
          <Skeleton className="h-30 rounded-none" />
          <View className="gap-3 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Detail screens: a hero banner followed by a couple of content blocks. */
export function DetailSkeleton({ width, rows = 3 }: { width?: number; rows?: number }) {
  return (
    <View className="gap-5 self-center" style={width ? { width } : undefined}>
      <View className={cn(CARD_SHELL, "gap-4 p-5")}>
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <View className="flex-row gap-2">
          <Skeleton className="h-9 flex-1 rounded-full" />
          <Skeleton className="h-9 flex-1 rounded-full" />
        </View>
      </View>
      <ListRowsSkeleton rows={rows} />
    </View>
  );
}

/** Collapsed settings accordion sections on the profile screen. */
export function SettingsSkeleton({ sections = 5 }: { sections?: number }) {
  return (
    <View className="gap-4">
      {Array.from({ length: sections }, (_, index) => (
        <View
          key={index}
          className={cn(CARD_SHELL, "flex-row items-center justify-between px-5 py-6")}
        >
          <View className="flex-row items-center gap-2">
            <Skeleton className="size-5 rounded-md" />
            <Skeleton className="h-5 w-32" />
          </View>
          <Skeleton className="size-5 rounded-md" />
        </View>
      ))}
    </View>
  );
}
