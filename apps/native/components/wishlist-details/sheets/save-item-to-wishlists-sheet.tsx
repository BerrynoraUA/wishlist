import {
  AutocompleteDropdown,
  type AutocompleteDropdownOption,
} from "@/components/ui/autocomplete-dropdown";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useCreateItem } from "@/hooks/use-items";
import { useMyWishlists } from "@/hooks/use-wishlists";
import type { Item } from "@wishlist/backend/types/item";
import { Image } from "expo-image";
import { Bookmark, Gift, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

export function SaveItemToWishlistsSheet({
  item,
  onClose,
}: {
  item: Item | null;
  onClose: () => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const wishlistsQuery = useMyWishlists({ take: 100 });
  const createItem = useCreateItem();
  const [selectedWishlistIds, setSelectedWishlistIds] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<Error | null>(null);

  const options = React.useMemo<AutocompleteDropdownOption[]>(
    () =>
      (wishlistsQuery.data ?? [])
        .filter((wishlist) => wishlist.is_owner || wishlist.can_edit)
        .map((wishlist) => ({
          value: wishlist.id,
          label: wishlist.title,
          trailing: t("{count} items", { count: wishlist.items_count ?? 0 }),
          imageUrl: wishlist.image_url,
        })),
    [t, wishlistsQuery.data],
  );
  const selectedOptions = options.filter((option) => selectedWishlistIds.includes(option.value));

  React.useEffect(() => {
    setSelectedWishlistIds([]);
    setSaveError(null);
  }, [item?.id]);

  if (!item) return null;
  const itemToSave = item;

  async function handleSave() {
    const itemToSave = item;
    if (!itemToSave || selectedWishlistIds.length === 0 || isSaving) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      await Promise.all(
        selectedWishlistIds.map((wishlistId) =>
          createItem.mutateAsync({
            wishlist_id: wishlistId,
            name: itemToSave.name,
            description: itemToSave.description,
            price: itemToSave.price,
            image_url: itemToSave.image_url,
            url: itemToSave.url,
            priority_id: itemToSave.priority_id,
            discount_price: itemToSave.discount_price,
            has_discount: itemToSave.has_discount,
            discount_end_date: itemToSave.discount_end_date,
            currency: itemToSave.currency,
            additional_links: itemToSave.additional_links,
          }),
        ),
      );
      void sheetRef.current?.dismiss();
    } catch (error) {
      setSaveError(error instanceof Error ? error : new Error(t("Failed to save item")));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <BottomSheet
      ref={sheetRef}
      detents={["auto"]}
      onDidDismiss={onClose}
      footer={
        <View className="w-full flex-row items-stretch gap-2 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
          <Button
            className="min-w-0 flex-1"
            variant="outline"
            disabled={isSaving}
            onPress={() => void sheetRef.current?.dismiss()}
          >
            <Text>{t("Cancel")}</Text>
          </Button>
          <Button
            className="min-w-0 flex-1"
            disabled={selectedWishlistIds.length === 0 || isSaving}
            onPress={() => void handleSave()}
          >
            {isSaving ? <ActivityIndicator colorClassName="accent-primary-foreground" /> : null}
            <Text>{isSaving ? t("Saving...") : t("Save")}</Text>
          </Button>
        </View>
      }
    >
      <View className="gap-4 px-5 pb-4 pt-4">
        <View className="items-center gap-1.5">
          <View className="size-10 items-center justify-center rounded-full bg-brand-lighter">
            <Icon as={Bookmark} className="size-5 text-brand" />
          </View>
          <Text className="text-xl font-extrabold text-text">{t("Save to wishlist")}</Text>
          <Text className="text-center text-sm text-text-muted">
            {t("Choose one or more wishlists you want to add this item to")}
          </Text>
        </View>

        <View className="flex-row items-center gap-3 rounded-xl border border-border-subtle bg-bg-muted p-2.5">
          {item.image_url ? (
            <Image
              source={item.image_url}
              contentFit="cover"
              className="size-11 rounded-lg bg-bg-elevated"
            />
          ) : (
            <View className="size-11 items-center justify-center rounded-lg bg-bg-elevated">
              <Icon as={Gift} className="size-5 text-text-muted" />
            </View>
          )}
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="font-bold text-text">
              {item.name}
            </Text>
            {item.price ? (
              <Text className="text-sm text-text-muted">
                {item.price} {item.currency}
              </Text>
            ) : null}
          </View>
        </View>

        {wishlistsQuery.isLoading ? (
          <View className="items-center justify-center rounded-xl border border-border-subtle bg-bg-muted p-4">
            <ActivityIndicator />
          </View>
        ) : options.length === 0 ? (
          <Text className="text-center text-sm font-semibold text-text-muted">
            {t("Create a wishlist first to add wishes to it.")}
          </Text>
        ) : (
          <AutocompleteDropdown
            multiple
            value={selectedOptions}
            onValueChange={(nextOptions) =>
              setSelectedWishlistIds(nextOptions.map((option) => option.value))
            }
            options={options}
            placeholder={t("Search wishlists")}
            emptyText={t("No wishlists found")}
            attached
            inlineOptions
            maxVisibleOptions={5}
            optionClassName="min-h-12 py-3"
            hideSelectedOptions
            showSelectedValue={false}
          />
        )}

        {selectedOptions.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {selectedOptions.map((wishlist) => (
              <Button
                key={wishlist.value}
                variant="ghost"
                size="sm"
                accessibilityLabel={t("Remove {name}", { name: wishlist.label })}
                onPress={() =>
                  setSelectedWishlistIds((current) =>
                    current.filter((wishlistId) => wishlistId !== wishlist.value),
                  )
                }
                className="rounded-full border border-brand bg-brand-lighter active:bg-brand-alpha-20"
              >
                <Text className="font-semibold text-brand">{wishlist.label}</Text>
                <Icon as={X} className="size-3.5 text-brand" />
              </Button>
            ))}
          </View>
        ) : null}

        {saveError ? (
          <Text className="text-sm font-semibold text-destructive">{saveError.message}</Text>
        ) : null}
      </View>
    </BottomSheet>
  );
}
