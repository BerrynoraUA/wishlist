import { DeleteWishlistSheet } from "@/components/wishlists/delete-wishlist-sheet";
import { WishlistFormSheet } from "@/components/wishlists/wishlist-form-sheet";
import { WishlistItemFormSheet } from "@/components/wishlists/wishlist-item-form-sheet";
import type { Wishlist } from "@wishlist/backend/types/wishlist";
import { Stack } from "expo-router";
import * as React from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { WishlistFilterBar } from "@/components/wishlists-screen/wishlist-filter-bar";
import { StatsRow, WishlistList } from "@/components/wishlists-screen/wishlist-list";
import { useWishlistFeed } from "@/hooks/use-wishlist-feed";

type SheetState =
  | { type: "create" }
  | { type: "edit"; wishlist: Wishlist }
  | { type: "addItem"; wishlist: Wishlist }
  | { type: "delete"; wishlist: Wishlist }
  | null;

export default function WishlistsScreen() {
  const { width } = useWindowDimensions();
  const feed = useWishlistFeed(width);
  const [sheet, setSheet] = React.useState<SheetState>(null);

  return (
    <>
      <Stack.Screen options={{ title: "Wishlists" }} />
      <View className="flex-1 bg-bg">
        <ScrollView
          className="flex-1"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="items-center gap-6 px-4 pb-safe-offset-8 pt-6"
        >
          <View className="w-full gap-6" style={{ maxWidth: 1200 }}>
            <StatsRow />
            <WishlistFilterBar
              search={feed.search}
              visibility={feed.visibility}
              sort={feed.sort}
              onSearchChange={feed.handleSearchChange}
              onVisibilityChange={feed.handleVisibilityChange}
              onSortChange={feed.handleSortChange}
              onResetFilters={feed.handleResetFilters}
              onCreateWishlist={() => setSheet({ type: "create" })}
            />
            <WishlistList
              query={feed.query}
              wishlists={feed.wishlists}
              filtersActive={feed.filtersActive}
              cardWidth={feed.cardWidth}
              contentWidth={feed.contentWidth}
              gridGap={feed.gridGap}
              pagination={feed.pagination}
              page={feed.page}
              onPageChange={feed.setPage}
              onCreateWishlist={() => setSheet({ type: "create" })}
              onOpenSheet={setSheet}
            />
          </View>
        </ScrollView>

        <WishlistFormSheet
          mode={sheet?.type === "edit" ? "edit" : "create"}
          open={sheet?.type === "create" || sheet?.type === "edit"}
          wishlist={sheet?.type === "edit" ? sheet.wishlist : undefined}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
        />
        <DeleteWishlistSheet
          wishlist={sheet?.type === "delete" ? sheet.wishlist : null}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
        />
        <WishlistItemFormSheet
          mode="create"
          wishlistId={sheet?.type === "addItem" ? sheet.wishlist.id : ""}
          open={sheet?.type === "addItem"}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
        />
      </View>
    </>
  );
}
