import { scrapeProductLink } from "@/api/scrape-product";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useCreateItem, useUpdateItem } from "@/hooks/use-items";
import {
  SlidingOptionSelector,
  type SlidingOption,
  type SlidingOptionRenderProps,
} from "@/components/ui/sliding-option-selector";
import {
  EMPTY_ITEM_FORM,
  ITEM_PRIORITY_OPTIONS,
  cleanAdditionalLinks,
  toItemFormValues,
} from "@/lib/items";
import { cn } from "@/lib/utils";
import type { Item, ItemFormValues } from "@/types/item";
import { Image as ExpoImage } from "expo-image";
import { Plus, X } from "lucide-react-native";
import * as React from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";

const Image = withUniwind(ExpoImage);

export function WishlistItemFormSheet({
  mode,
  wishlistId,
  item,
  open,
  onOpenChange,
}: {
  mode: "create" | "edit";
  wishlistId: string;
  item?: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const createMutation = useCreateItem();
  const updateMutation = useUpdateItem();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error ?? updateMutation.error;
  const [values, setValues] = React.useState<ItemFormValues>(EMPTY_ITEM_FORM);
  const [isScraping, setIsScraping] = React.useState(false);
  const [scrapeError, setScrapeError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setValues(mode === "edit" ? toItemFormValues(item ?? undefined) : EMPTY_ITEM_FORM);
      setScrapeError(null);
    }
  }, [item, mode, open]);

  if (!open) return null;

  function patchValues(patch: Partial<ItemFormValues>) {
    setValues((current) => ({ ...current, ...patch }));
  }

  function handleClose() {
    void sheetRef.current?.dismiss();
  }

  async function handleScrape() {
    const url = values.url.trim();
    if (!url || isScraping) return;

    setIsScraping(true);
    setScrapeError(null);

    try {
      const product = await scrapeProductLink(url);
      const isEmpty = !product.title && !product.description && !product.image && !product.price;

      if (isEmpty) {
        setScrapeError("Could not fetch product data");
        return;
      }

      patchValues({
        ...(product.title ? { name: product.title } : {}),
        ...(product.description ? { description: product.description } : {}),
        ...(product.image ? { imageUrl: product.image } : {}),
        ...(product.price ? { price: product.price } : {}),
        ...(product.currency ? { currency: product.currency } : {}),
        discountPrice: product.discount_price ?? "",
        hasDiscount: product.has_discount,
        discountEndDate: product.discount_end_date ?? "",
      });
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : "Could not fetch product data");
    } finally {
      setIsScraping(false);
    }
  }

  function handleSubmit() {
    const name = values.name.trim();
    if (!name || isPending) return;

    const payload = {
      name,
      description: values.description.trim() || null,
      price: values.price.trim() || null,
      priority: values.priority,
      image_url: values.imageUrl.trim() || null,
      url: values.url.trim() || null,
      currency: values.currency.trim() || null,
      discount_price: values.discountPrice.trim() || null,
      has_discount: values.hasDiscount,
      discount_end_date: values.discountEndDate.trim() || null,
      additional_links: cleanAdditionalLinks(values.additionalLinks),
    };

    if (mode === "edit" && item) {
      updateMutation.mutate(
        { id: item.id, updates: payload },
        {
          onSuccess: handleClose,
        },
      );
      return;
    }

    createMutation.mutate(
      {
        wishlist_id: wishlistId,
        ...payload,
      },
      {
        onSuccess: handleClose,
      },
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      detents={[1]}
      scrollable
      scrollableOptions={{ scrollingExpandsSheet: false }}
      dismissOnBack={false}
      onDidDismiss={() => onOpenChange(false)}
      header={
        <Text className="mx-5 mt-5 text-lg font-extrabold text-text">
          {mode === "edit" ? "Edit Item" : "Create Item"}
        </Text>
      }
      footer={
        <View className="w-full flex-row items-stretch gap-2 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
          <Button
            className="min-w-0 flex-1"
            variant="outline"
            disabled={isPending}
            onPress={handleClose}
          >
            <Text>Cancel</Text>
          </Button>
          <Button
            className="min-w-0 flex-1"
            disabled={isPending || !values.name.trim()}
            onPress={handleSubmit}
          >
            {isPending ? <ActivityIndicator colorClassName="accent-primary-foreground" /> : null}
            <Text>{mode === "edit" ? "Save changes" : "Create item"}</Text>
          </Button>
        </View>
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-5 px-5 pb-6 pt-5"
      >
        <Field label="Product link">
          <View className="gap-2">
            <View className="flex-row gap-2">
              <Input
                value={values.url}
                onChangeText={(url) => {
                  patchValues({ url });
                  if (scrapeError) setScrapeError(null);
                }}
                placeholder="Paste a product URL"
                autoCapitalize="none"
                keyboardType="url"
                returnKeyType="search"
                onSubmitEditing={handleScrape}
                className="min-w-0 flex-1"
              />
              <Button
                variant="secondary"
                disabled={!values.url.trim() || isScraping}
                onPress={handleScrape}
                className="px-4"
              >
                {isScraping ? <ActivityIndicator colorClassName="accent-secondary-foreground" /> : null}
                <Text>{isScraping ? "Searching" : "Search"}</Text>
              </Button>
            </View>
            {scrapeError ? (
              <Text className="text-sm font-semibold text-destructive">{scrapeError}</Text>
            ) : null}
          </View>
        </Field>

        <Field label="Image URL">
          <View className="gap-3">
            {values.imageUrl.trim() ? (
              <View className="h-40 overflow-hidden rounded-xl border border-border-subtle bg-bg-muted">
                <Image
                  source={{ uri: values.imageUrl.trim() }}
                  contentFit="cover"
                  className="size-full"
                />
              </View>
            ) : null}
            <Input
              value={values.imageUrl}
              onChangeText={(imageUrl) => patchValues({ imageUrl })}
              placeholder="https://..."
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </Field>

        <Field label="Name">
          <Input
            value={values.name}
            onChangeText={(name) => patchValues({ name })}
            placeholder="e.g. Noise-cancelling headphones"
          />
        </Field>

        <Field label="Description">
          <Input
            value={values.description}
            onChangeText={(description) => patchValues({ description })}
            placeholder="Add details, size, color..."
            multiline
            className="h-24 items-start py-3"
            textAlignVertical="top"
          />
        </Field>

        <View className="flex-row gap-2">
          <Field label="Currency" className="w-24">
            <Input
              value={values.currency}
              onChangeText={(currency) => patchValues({ currency })}
              placeholder="USD"
              autoCapitalize="characters"
            />
          </Field>
          <Field label="Price" className="min-w-0 flex-1">
            <Input
              value={values.price}
              onChangeText={(price) => patchValues({ price })}
              placeholder="199"
              keyboardType="decimal-pad"
            />
          </Field>
        </View>

        <Field label="Priority">
          <PrioritySelector
            value={values.priority}
            onChange={(priority) => patchValues({ priority })}
          />
        </Field>

        <Field label="Discount">
          <View className="gap-2">
            <Button
              variant={values.hasDiscount ? "default" : "outline"}
              onPress={() => patchValues({ hasDiscount: !values.hasDiscount })}
            >
              <Text>{values.hasDiscount ? "Discount enabled" : "Enable discount"}</Text>
            </Button>
            {values.hasDiscount ? (
              <View className="flex-row gap-2">
                <Input
                  value={values.discountPrice}
                  onChangeText={(discountPrice) => patchValues({ discountPrice })}
                  placeholder="Sale price"
                  keyboardType="decimal-pad"
                  className="min-w-0 flex-1"
                />
                <Input
                  value={values.discountEndDate}
                  onChangeText={(discountEndDate) => patchValues({ discountEndDate })}
                  placeholder="YYYY-MM-DD"
                  className="min-w-0 flex-1"
                />
              </View>
            ) : null}
          </View>
        </Field>

        <Field label="Additional links">
          <View className="gap-2">
            {values.additionalLinks.map((link, index) => (
              <View key={index} className="flex-row gap-2">
                <Input
                  value={link.url}
                  onChangeText={(url) => {
                    const next = [...values.additionalLinks];
                    next[index] = { ...next[index], url };
                    patchValues({ additionalLinks: next });
                  }}
                  placeholder="https://..."
                  autoCapitalize="none"
                  keyboardType="url"
                  className="min-w-0 flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onPress={() =>
                    patchValues({
                      additionalLinks: values.additionalLinks.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  <Icon as={X} className="size-4 text-text-muted" />
                </Button>
              </View>
            ))}
            <Button
              variant="outline"
              onPress={() =>
                patchValues({ additionalLinks: [...values.additionalLinks, { url: "" }] })
              }
            >
              <Icon as={Plus} className="size-4 text-text" />
              <Text>Add another link</Text>
            </Button>
          </View>
        </Field>

        {error ? (
          <Text className="text-sm font-semibold text-destructive">{error.message}</Text>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={className ? `gap-2 ${className}` : "gap-2"}>
      <Text className="text-sm font-bold text-text">{label}</Text>
      {children}
    </View>
  );
}

function PrioritySelector({
  value,
  onChange,
}: {
  value: ItemFormValues["priority"];
  onChange: (priority: ItemFormValues["priority"]) => void;
}) {
  const rows = React.useMemo((): SlidingOption<number | null>[][] => [
    [
      {
        value: null,
        accessibilityLabel: "No priority",
        children: ({ selected }: SlidingOptionRenderProps) => (
          <Text className={cn("text-xs font-semibold text-text", selected && "text-brand")}>
            None
          </Text>
        ),
      },
      ...ITEM_PRIORITY_OPTIONS.map((option) => ({
        value: option.priority,
        children: ({ selected }: SlidingOptionRenderProps) => (
          <Text className={cn("text-xs font-semibold text-text", selected && "text-brand")}>
            {option.label}
          </Text>
        ),
      })),
    ],
  ], []);

  return (
    <SlidingOptionSelector<number | null>
      rows={rows}
      value={value}
      onChange={onChange}
      optionHeight={44}
      optionHeightClassName="h-11"
      optionClassName="gap-1.5 rounded-lg px-2"
      indicatorClassName="rounded-lg border border-brand bg-brand-lighter"
    />
  );
}
