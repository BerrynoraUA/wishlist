import { BottomSheet, BottomSheetHeader, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useDeleteItem } from "@/hooks/use-items";
import type { Item } from "@wishlist/backend/types/item";
import { Trash2 } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

export function WishlistItemDeleteSheet({
  item,
  onOpenChange,
}: {
  item: Item | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const mutation = useDeleteItem();

  if (!item) return null;
  const selectedItem = item;

  function handleClose() {
    void sheetRef.current?.dismiss();
  }

  function handleDelete() {
    mutation.mutate(selectedItem.id, {
      onSuccess: handleClose,
    });
  }

  return (
    <BottomSheet
      ref={sheetRef}
      detents={["auto"]}
      onDidDismiss={() => onOpenChange(false)}
      header={<BottomSheetHeader title={t("Delete Item")} />}
    >
      <View className="gap-4 px-5">
        <Text className="text-sm text-text-muted">
          {t("Are you sure you want to delete this item? This action cannot be undone.")}
        </Text>

        {mutation.error ? (
          <Text className="text-sm font-semibold text-destructive">{mutation.error.message}</Text>
        ) : null}

        <View className="flex-row gap-2">
          <Button
            className="flex-1"
            variant="outline"
            disabled={mutation.isPending}
            onPress={handleClose}
          >
            <Text>{t("Cancel")}</Text>
          </Button>
          <Button
            className="flex-1"
            variant="destructive"
            disabled={mutation.isPending}
            onPress={handleDelete}
          >
            {mutation.isPending ? <ActivityIndicator colorClassName="accent-white" /> : null}
            <Icon as={Trash2} className="size-4 text-white" />
            <Text>{t("Delete Item")}</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
