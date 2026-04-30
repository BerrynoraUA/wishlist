import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useMyStatistics } from "@/hooks/use-wishlists";
import {
  WISHLIST_VISIBILITY_ICONS,
  WISHLIST_VISIBILITY_LABELS,
  getWishlistAccentClass,
} from "@/lib/wishlists";
import { cn } from "@/lib/utils";
import {
  wishlistCardFadeIn,
  wishlistGridLinearTransition,
} from "@/components/wishlists/wishlist-screen-animations";
import type { Wishlist } from "@wishlist/backend/types/wishlist";
import type { TriggerRef } from "@rn-primitives/dropdown-menu";
import { Image as ExpoImage } from "expo-image";
import { Link } from "expo-router";
import { ChevronLeft, ChevronRight, Gift, Link2, Plus } from "lucide-react-native";
import * as React from "react";
import { View, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import { withUniwind } from "uniwind";

const Image = withUniwind(ExpoImage);

type SheetState =
  | { type: "create" }
  | { type: "edit"; wishlist: Wishlist }
  | { type: "addItem"; wishlist: Wishlist }
  | { type: "delete"; wishlist: Wishlist }
  | null;

export function WishlistList({
  query,
  wishlists,
  filtersActive,
  cardWidth,
  contentWidth,
  gridGap,
  pagination,
  page,
  onPageChange,
  onCreateWishlist,
  onOpenSheet,
}: {
  query: {
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
  };
  wishlists: Wishlist[];
  filtersActive: boolean;
  cardWidth: number;
  contentWidth: number;
  gridGap: number;
  pagination: {
    hasNextPage: boolean;
    hasPrevPage: boolean;
    showPagination: boolean;
    totalForPagination: number;
  };
  page: number;
  onPageChange: (page: number) => void;
  onCreateWishlist: () => void;
  onOpenSheet: (sheet: Exclude<SheetState, null>) => void;
}) {
  return (
    <View className="gap-5">
      {query.isLoading ? (
        <WishlistGridSkeleton cardWidth={cardWidth} gridGap={gridGap} />
      ) : (
        <Animated.View
          className="flex-row flex-wrap"
          layout={wishlistGridLinearTransition}
          style={{ gap: gridGap, opacity: query.isFetching ? 0.6 : 1 }}
        >
          {query.isError ? (
            <InlineState width={contentWidth} message="Failed to load wishlists." />
          ) : null}

          {!query.isError && wishlists.length === 0 && filtersActive ? (
            <InlineState width={contentWidth} message="No wishlists match your filters." />
          ) : null}

          {wishlists.map((wishlist) => (
            <WishlistCard
              key={wishlist.id}
              wishlist={wishlist}
              width={cardWidth}
              onEdit={
                wishlist.is_owner || wishlist.can_edit
                  ? () => onOpenSheet({ type: "edit", wishlist })
                  : undefined
              }
              onAddItem={
                wishlist.is_owner || wishlist.can_edit
                  ? () => onOpenSheet({ type: "addItem", wishlist })
                  : undefined
              }
              onDelete={
                wishlist.is_owner ? () => onOpenSheet({ type: "delete", wishlist }) : undefined
              }
            />
          ))}

          {!query.isError && wishlists.length > 0 ? (
            <AddWishlistCard width={cardWidth} onPress={onCreateWishlist} />
          ) : null}
        </Animated.View>
      )}

      {pagination.showPagination ? (
        <PaginationControls
          page={page}
          total={pagination.totalForPagination}
          hasPrevPage={pagination.hasPrevPage}
          hasNextPage={pagination.hasNextPage}
          onChange={onPageChange}
        />
      ) : null}
    </View>
  );
}

export function StatsRow() {
  const { width } = useWindowDimensions();
  const { data, isError, isLoading } = useMyStatistics();
  const gap = 12;
  const cardWidth = (Math.min(width - 32, 1200) - gap) / 2;
  const stats = [
    { label: "Wishlists", value: data?.wishlists_count ?? 0 },
    { label: "Total Items", value: data?.total_items_count ?? 0 },
    { label: "Reserved", value: data?.reserved_items_count ?? 0 },
    { label: "Purchased", value: data?.purchased_items_count ?? 0 },
  ];

  if (isLoading) {
    return (
      <View className="flex-row flex-wrap" style={{ gap }}>
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-24 rounded-xl" style={{ width: cardWidth }} />
        ))}
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="rounded-xl border border-border-subtle bg-card-bg p-4">
        <Text className="text-sm text-destructive">Failed to load stats.</Text>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap" style={{ gap }}>
      {stats.map((stat) => (
        <View
          key={stat.label}
          className="flex-row items-center gap-3 rounded-xl border border-border-subtle bg-card-bg p-4 shadow-sm"
          style={{ width: cardWidth }}
        >
          <View className="size-10 items-center justify-center rounded-full bg-brand-lighter">
            <Icon as={Gift} className="size-4 text-brand" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-2xl font-extrabold text-text">{stat.value}</Text>
            <Text className="text-sm font-semibold text-text-muted" numberOfLines={1}>
              {stat.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function WishlistGridSkeleton({ cardWidth, gridGap }: { cardWidth: number; gridGap: number }) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: gridGap }}>
      {[0, 1, 2, 3].map((item) => (
        <View
          key={item}
          className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg"
          style={{ width: cardWidth }}
        >
          <Skeleton className="h-[120px] rounded-none" />
          <View className="gap-3 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </View>
        </View>
      ))}
    </View>
  );
}

function WishlistCard({
  wishlist,
  width,
  onEdit,
  onAddItem,
  onDelete,
}: {
  wishlist: Wishlist;
  width: number;
  onEdit?: () => void;
  onAddItem?: () => void;
  onDelete?: () => void;
}) {
  const visibility = wishlist.visibility_type;
  const VisibilityIcon = WISHLIST_VISIBILITY_ICONS[visibility];
  const itemsCount = wishlist.items_count ?? 0;
  const showMenu = Boolean(onAddItem || onEdit || onDelete);
  const isShared = wishlist.is_owner === false;
  const ownerNickname = wishlist.owner_nickname?.trim();
  const sharedLabel = ownerNickname ? `Shared by @${ownerNickname}` : "Shared wishlist";
  const menuTriggerRef = React.useRef<TriggerRef>(null);

  return (
    <Animated.View entering={wishlistCardFadeIn} style={{ width }}>
      <DropdownMenu className="relative">
        <Link href={{ pathname: "/wishlists/[id]", params: { id: wishlist.id } }} asChild>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${wishlist.title}`}
            onLongPress={showMenu ? () => menuTriggerRef.current?.open() : undefined}
            className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg shadow-sm"
            pressedScale={0.98}
          >
            <View
              className={cn(
                "h-[120px] items-center justify-center overflow-hidden",
                getWishlistAccentClass(wishlist.accent_type),
              )}
            >
              {wishlist.image_url ? (
                <Image
                  source={{ uri: wishlist.image_url }}
                  contentFit="cover"
                  className="absolute inset-0 size-full"
                />
              ) : (
                <Icon as={Gift} className="size-10 text-white/85" />
              )}
              <View className="absolute inset-0 bg-black/10" />
              {isShared ? (
                <Badge
                  variant="secondary"
                  className="absolute left-3 top-3 flex-row border-white/30 bg-white/80"
                  accessibilityLabel={sharedLabel}
                >
                  <Icon as={Link2} className="size-3 text-text" />
                  <Text className="text-xs font-bold text-text">Shared</Text>
                </Badge>
              ) : null}
            </View>

            <View className="gap-3 px-4 pb-4 pt-3">
              <View className="min-h-11 flex-row items-start justify-between gap-3">
                <Text
                  className="flex-1 text-[15px] font-bold leading-5 text-text"
                  numberOfLines={2}
                >
                  {wishlist.title}
                </Text>

                {onAddItem ? (
                  <AnimatedPressable
                    accessibilityRole="button"
                    accessibilityLabel="Add item"
                    onPress={onAddItem}
                    className="size-10 items-center justify-center rounded-full bg-brand-lighter active:bg-brand-alpha-12"
                  >
                    <Icon as={Plus} className="size-4 text-brand" />
                  </AnimatedPressable>
                ) : null}
              </View>

              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-sm font-semibold text-text-muted">
                  {itemsCount === 1 ? "1 item" : `${itemsCount} items`}
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <Icon as={VisibilityIcon} className="size-3.5 text-text-muted" />
                  <Text className="text-sm font-semibold text-text-muted">
                    {WISHLIST_VISIBILITY_LABELS[visibility]}
                  </Text>
                </View>
              </View>
            </View>
          </AnimatedPressable>
        </Link>
        {showMenu ? (
          <DropdownMenuTrigger asChild>
            <AnimatedPressable
              ref={menuTriggerRef}
              pointerEvents="none"
              className="absolute right-4 top-[132px] size-10 opacity-0"
            />
          </DropdownMenuTrigger>
        ) : null}
        <DropdownMenuContent className="min-w-36">
          {onAddItem ? (
            <DropdownMenuItem onPress={onAddItem}>
              <Text>Add item</Text>
            </DropdownMenuItem>
          ) : null}
          {onEdit ? (
            <DropdownMenuItem onPress={onEdit}>
              <Text>Edit</Text>
            </DropdownMenuItem>
          ) : null}
          {onDelete ? (
            <DropdownMenuItem variant="destructive" onPress={onDelete}>
              <Text>Delete</Text>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </Animated.View>
  );
}

function AddWishlistCard({ width, onPress }: { width: number; onPress: () => void }) {
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Create wishlist"
      onPress={onPress}
      className="h-[196px] items-center justify-center rounded-xl border border-dashed border-border-subtle bg-card-bg active:bg-bg-subtle"
      style={{ width }}
    >
      <View className="size-14 items-center justify-center rounded-full border border-dashed border-brand/50 bg-brand-lighter">
        <Icon as={Plus} className="size-7 text-brand" />
      </View>
    </AnimatedPressable>
  );
}

function InlineState({ width, message }: { width: number; message: string }) {
  return (
    <View
      className="items-center justify-center rounded-xl border border-border-subtle bg-card-bg p-6"
      style={{ width }}
    >
      <Text className="text-center text-sm font-semibold text-text-muted">{message}</Text>
    </View>
  );
}

function PaginationControls({
  page,
  total,
  hasPrevPage,
  hasNextPage,
  onChange,
}: {
  page: number;
  total: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  onChange: (page: number) => void;
}) {
  return (
    <View className="flex-row items-center justify-center gap-2 pt-2">
      <Button
        variant="outline"
        size="icon"
        disabled={!hasPrevPage}
        onPress={() => onChange(Math.max(1, page - 1))}
      >
        <Icon as={ChevronLeft} className="size-4 text-text" />
      </Button>
      {Array.from({ length: total }, (_, index) => index + 1).map((item) => (
        <Button
          key={item}
          variant={item === page ? "default" : "outline"}
          size="icon"
          onPress={() => onChange(item)}
        >
          <Text>{item}</Text>
        </Button>
      ))}
      <Button
        variant="outline"
        size="icon"
        disabled={!hasNextPage}
        onPress={() => onChange(page + 1)}
      >
        <Icon as={ChevronRight} className="size-4 text-text" />
      </Button>
    </View>
  );
}
