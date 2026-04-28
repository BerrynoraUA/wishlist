import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useDeleteWishlist } from "@/hooks/use-wishlists";
import type { Wishlist } from "@/types/wishlist";
import { Trash2 } from "lucide-react-native";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

export function DeleteWishlistSheet({
  wishlist,
  onOpenChange,
}: {
  wishlist: Wishlist | null;
  onOpenChange: (open: boolean) => void;
}) {
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const mutation = useDeleteWishlist();
  const open = Boolean(wishlist);

  if (!open) return null;

  function handleClose() {
    if (!sheetRef.current) {
      onOpenChange(false);
      return;
    }

    void sheetRef.current.dismiss();
  }

  function handleDelete() {
    if (!wishlist) return;

    mutation.mutate(wishlist.id, {
      onSuccess: handleClose,
    });
  }

  return (
    <BottomSheet
      ref={sheetRef}
      detents={["auto"]}
      dismissOnBack={false}
      onDidDismiss={() => onOpenChange(false)}
    >
      <View className="gap-4 px-5 pb-5 pt-5">
        <View className="gap-2">
          <Text className="text-lg font-extrabold text-text">Delete Wishlist</Text>
          <Text className="text-sm text-text-muted">
            Are you sure you want to delete this entire wishlist and all its items? This action
            cannot be undone.
          </Text>
        </View>

        {mutation.error ? (
          <Text className="text-sm font-semibold text-destructive">{mutation.error.message}</Text>
        ) : null}

        <View className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" disabled={mutation.isPending} onPress={handleClose}>
            <Text>Cancel</Text>
          </Button>
          <Button variant="destructive" disabled={mutation.isPending} onPress={handleDelete}>
            {mutation.isPending ? <ActivityIndicator colorClassName="accent-white" /> : null}
            <Icon as={Trash2} className="size-4 text-white" />
            <Text>Delete Wishlist</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
