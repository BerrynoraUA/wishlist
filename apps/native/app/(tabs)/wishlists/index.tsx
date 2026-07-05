import { CreateItemSourceMenu, type ItemCreateSource } from "@/components/create/create-menu";
import { WishlistItemCreateEditSheet } from "@/components/wishlist-details/sheets/wishlist-item-create-edit-sheet";
import { WishlistDeleteSheet } from "@/components/wishlists/sheets/wishlist-delete-sheet";
import { WishlistCreateEditSheet } from "@/components/wishlists/sheets/wishlist-create-edit-sheet";
import type { Wishlist } from "@wishlist/backend/types/wishlist";
import { Stack, useRouter } from "expo-router";
import * as React from "react";
import { View, useWindowDimensions } from "react-native";
import { WishlistFilterBar } from "@/components/wishlists/wishlist-filter-bar";
import { WishlistListStatsRow, WishlistList } from "@/components/wishlists/wishlist-list";
import { useUserGuideStepCompletion } from "@/components/user-guide/user-guide-provider";
import { useWishlistFeed } from "@/hooks/use-wishlist-feed";
import { useGT } from "gt-react-native";

type SheetState =
  | { type: "edit"; wishlist: Wishlist }
  | { type: "selectAddItem"; wishlist: Wishlist }
  | { type: "addItem"; wishlist: Wishlist; source: ItemCreateSource }
  | { type: "delete"; wishlist: Wishlist }
  | null;

export default function WishlistsScreen() {
  const t = useGT();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const feed = useWishlistFeed(width);
  const completeOpenDiscoverStep = useUserGuideStepCompletion(14);
  const [sheet, setSheet] = React.useState<SheetState>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  return (
    <>
      <Stack.Screen options={{ title: t("Wishlists") }} />
      <View className="flex-1 bg-bg">
        <WishlistList
          query={feed.query}
          wishlists={feed.wishlists}
          filtersActive={feed.filtersActive}
          cardWidth={feed.cardWidth}
          contentWidth={feed.contentWidth}
          columns={feed.columns}
          gridGap={feed.gridGap}
          FilterHeaderComponent={
            <WishlistFilterBar
              search={feed.search}
              visibility={feed.visibility}
              sort={feed.sort}
              onSearchChange={feed.handleSearchChange}
              onVisibilityChange={feed.handleVisibilityChange}
              onSortChange={feed.handleSortChange}
              onResetFilters={feed.handleResetFilters}
              onOpenDiscover={() => {
                completeOpenDiscoverStep();
                router.push("/wishlists/discover" as never);
              }}
              filtersOpen={filtersOpen}
              onFiltersOpenChange={setFiltersOpen}
            />
          }
          ListHeaderComponent={
            <View>
              <WishlistListStatsRow />
            </View>
          }
          onEndReached={feed.loadMore}
          onOpenSheet={(nextSheet) =>
            setSheet(
              nextSheet.type === "addItem"
                ? { type: "selectAddItem", wishlist: nextSheet.wishlist }
                : nextSheet,
            )
          }
        />

        <WishlistCreateEditSheet
          mode="edit"
          open={sheet?.type === "edit"}
          wishlist={sheet?.type === "edit" ? sheet.wishlist : undefined}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
        />
        <WishlistDeleteSheet
          wishlist={sheet?.type === "delete" ? sheet.wishlist : null}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
        />
        <WishlistItemCreateEditSheet
          mode="create"
          wishlistId={sheet?.type === "addItem" ? sheet.wishlist.id : ""}
          createSource={sheet?.type === "addItem" ? sheet.source : "link"}
          open={sheet?.type === "addItem"}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
        />
        <CreateItemSourceMenu
          open={sheet?.type === "selectAddItem"}
          onClose={() => setSheet(null)}
          onSelect={(source) =>
            setSheet((current) =>
              current?.type === "selectAddItem"
                ? { type: "addItem", wishlist: current.wishlist, source }
                : current,
            )
          }
        />
      </View>
    </>
  );
}
