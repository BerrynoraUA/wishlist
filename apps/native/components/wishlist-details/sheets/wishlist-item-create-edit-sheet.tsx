import { scrapeProductLink } from "@/api/scrape-product";
import {
  AutocompleteDropdown,
  type AutocompleteDropdownOption,
} from "@/components/ui/autocomplete-dropdown";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { GuideTarget } from "@/components/user-guide/guide-target";
import { useUserGuideStepCompletion } from "@/components/user-guide/user-guide-provider";
import { USER_GUIDE_STEP_IDS } from "@/components/user-guide/user-guide-config";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { SingleImagePicker } from "@/components/ui/single-image-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import { PriorityFilterIcon } from "@/components/items/item-labels";
import { useCreateItem, useUpdateItem } from "@/hooks/use-items";
import { useProGate } from "@/hooks/use-pro-gate";
import { useMyWishlists, useWishlistById } from "@/hooks/use-wishlists";
import { useSettings } from "@/hooks/use-settings";
import {
  EMPTY_ITEM_FORM,
  getItemPriority,
  getItemPriorityOptions,
  cleanAdditionalLinks,
  toItemFormValues,
} from "@/lib/items";
import { useImageUploadField } from "@/lib/image-upload";
import { cn } from "@/lib/utils";
import { hasInvalidOptionalUrl, isValidHttpUrl } from "@/lib/urls";
import type { Item, ItemFormValues } from "@wishlist/backend/types/item";
import type { Wishlist } from "@wishlist/backend/types/wishlist";
import { FREE_LIMITS } from "@wishlist/backend/types/subscription";
import { Lock, Plus, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ActivityIndicator, ScrollView, View } from "react-native";

type ItemFormVariant = {
  showsProductLink: boolean;
  productLinkPosition: "top" | "middle" | null;
  showsDescription: boolean;
  showsWishlistPicker: boolean;
  scrapeDescription: boolean;
};

const DESCRIPTION_INPUT_MIN_HEIGHT = 96;
const DESCRIPTION_INPUT_MAX_HEIGHT = 192;
const DESCRIPTION_INPUT_VERTICAL_OFFSET = 12;

function clampDescriptionInputHeight(height: number) {
  return Math.max(
    DESCRIPTION_INPUT_MIN_HEIGHT,
    Math.min(DESCRIPTION_INPUT_MAX_HEIGHT, Math.ceil(height)),
  );
}

function estimateDescriptionInputHeight(value: string | null | undefined) {
  const description = value ?? "";
  if (!description.trim()) return DESCRIPTION_INPUT_MIN_HEIGHT;

  const estimatedLineCount = description
    .split("\n")
    .reduce((count, line) => count + Math.max(1, Math.ceil(line.length / 34)), 0);

  return clampDescriptionInputHeight(estimatedLineCount * 22 + DESCRIPTION_INPUT_VERTICAL_OFFSET);
}

function getItemFormVariant(
  mode: "create" | "edit",
  createSource: "scratch" | "link",
  hasWishlistId: boolean,
): ItemFormVariant {
  const isCreateFromLink = mode === "create" && createSource === "link";

  return {
    showsProductLink: mode === "edit" || createSource === "link",
    productLinkPosition: isCreateFromLink ? "top" : mode === "edit" ? "middle" : null,
    showsDescription: mode === "edit",
    showsWishlistPicker: mode === "create" && !hasWishlistId,
    scrapeDescription: mode === "edit",
  };
}

export function WishlistItemCreateEditSheet({
  mode,
  createSource = "link",
  wishlistId,
  item,
  open,
  onOpenChange,
}: {
  mode: "create" | "edit";
  createSource?: "scratch" | "link";
  /** When omitted in create mode, the sheet shows a wishlist picker. */
  wishlistId?: string;
  item?: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useGT();
  const { isGated, isPro, openPaywall } = useProGate();
  const completeCreateItemStep = useUserGuideStepCompletion(USER_GUIDE_STEP_IDS.createItem);
  const { data: settings } = useSettings();
  const priorityOptions = React.useMemo(
    () => getItemPriorityOptions(t, settings?.selected_priorities),
    [settings?.selected_priorities, t],
  );
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const createMutation = useCreateItem();
  const updateMutation = useUpdateItem();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error ?? updateMutation.error;
  const { control, handleSubmit, reset, setValue } = useForm<ItemFormValues>({
    defaultValues: EMPTY_ITEM_FORM,
  });
  const values = useWatch({ control }) as ItemFormValues;
  const [descriptionInputHeight, setDescriptionInputHeight] = React.useState(
    DESCRIPTION_INPUT_MIN_HEIGHT,
  );
  const [selectedWishlistId, setSelectedWishlistId] = React.useState("");
  const form = React.useMemo(
    () => getItemFormVariant(mode, createSource, Boolean(wishlistId)),
    [createSource, mode, wishlistId],
  );
  const wishlistsQuery = useMyWishlists();
  const wishlistDetailQuery = useWishlistById(wishlistId ?? "");
  const selectableWishlists = React.useMemo(
    () => (wishlistsQuery.data ?? []).filter((wishlist) => wishlist.is_owner || wishlist.can_edit),
    [wishlistsQuery.data],
  );
  const targetWishlistId = wishlistId || selectedWishlistId || selectableWishlists[0]?.id || "";
  const targetWishlist =
    wishlistDetailQuery.data ??
    selectableWishlists.find((wishlist) => wishlist.id === targetWishlistId);
  const [isScraping, setIsScraping] = React.useState(false);
  const imageUpload = useImageUploadField("item");
  const [scrapeError, setScrapeError] = React.useState<string | null>(null);
  const currentUrlRef = React.useRef("");
  const lastScrapedUrlRef = React.useRef("");
  const scrapeRequestIdRef = React.useRef(0);
  const productLinkInvalid = form.showsProductLink && hasInvalidOptionalUrl(values.url);
  const imageUrlInvalid = hasInvalidOptionalUrl(values.imageUrl);
  const invalidAdditionalLinkIndexes = React.useMemo(
    () =>
      new Set(
        values.additionalLinks
          .map((link, index) => (hasInvalidOptionalUrl(link.url) ? index : null))
          .filter((index): index is number => index !== null),
      ),
    [values.additionalLinks],
  );
  const hasInvalidAdditionalLinks = invalidAdditionalLinkIndexes.size > 0;
  const canSubmit =
    !isPending &&
    !imageUpload.isUploading &&
    values.name.trim() !== "" &&
    (!form.showsWishlistPicker || targetWishlistId !== "") &&
    !productLinkInvalid &&
    !imageUrlInvalid &&
    !hasInvalidAdditionalLinks;

  React.useEffect(() => {
    if (open) {
      const nextValues =
        mode === "edit"
          ? toItemFormValues(item ?? undefined)
          : { ...EMPTY_ITEM_FORM, priority_id: null };
      reset(nextValues);
      setDescriptionInputHeight(estimateDescriptionInputHeight(nextValues.description));
      setSelectedWishlistId("");
      setScrapeError(null);
      imageUpload.reset();
      currentUrlRef.current = nextValues.url.trim();
      lastScrapedUrlRef.current = nextValues.url.trim();
    }
  }, [createSource, imageUpload.reset, item, mode, open, reset]);

  // Priority options can arrive after the sheet opens (they come from settings),
  // so defaulting can't happen in the open/reset effect above.
  React.useEffect(() => {
    if (!open || mode !== "create" || !isPro || priorityOptions.length === 0) return;
    if (priorityOptions.some((option) => option.priority_id === values.priority_id)) return;

    setValue("priority_id", priorityOptions[0].priority_id);
  }, [isPro, mode, open, priorityOptions, setValue, values.priority_id]);

  React.useEffect(() => {
    currentUrlRef.current = values.url.trim();
  }, [values.url]);

  React.useEffect(() => {
    const url = values.url.trim();
    if (
      !open ||
      !form.showsProductLink ||
      url === "" ||
      !isValidHttpUrl(url) ||
      url === lastScrapedUrlRef.current
    ) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void handleScrape(url);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [form.showsProductLink, open, values.url]);

  if (!open) return null;

  function patchValues(patch: Partial<ItemFormValues>) {
    for (const [key, value] of Object.entries(patch)) {
      setValue(key as keyof ItemFormValues, value as never);
    }
  }

  function clearProductLinkAndScraperFields() {
    scrapeRequestIdRef.current += 1;
    setIsScraping(false);
    setScrapeError(null);
    imageUpload.onClear();
    lastScrapedUrlRef.current = "";
    patchValues({
      url: "",
      name: "",
      description: "",
      imageUrl: "",
      price: "",
      currency: EMPTY_ITEM_FORM.currency,
      discountPrice: EMPTY_ITEM_FORM.discountPrice,
      hasDiscount: EMPTY_ITEM_FORM.hasDiscount,
      discountEndDate: EMPTY_ITEM_FORM.discountEndDate,
    });
  }

  const canClearScrapedFields =
    form.productLinkPosition === "top" &&
    (values.url.trim() !== "" ||
      values.name.trim() !== "" ||
      values.description.trim() !== "" ||
      values.imageUrl.trim() !== "" ||
      values.price.trim() !== "" ||
      values.discountPrice.trim() !== "" ||
      values.discountEndDate.trim() !== "" ||
      values.hasDiscount);

  function handleClose() {
    void sheetRef.current?.dismiss();
  }

  const productLinkField = form.showsProductLink ? (
    <View className={cn("gap-2", form.productLinkPosition === "top" && "mt-2")}>
      <View className="flex-row items-center gap-2">
        <Controller
          control={control}
          name="url"
          render={({ field: { onChange, value } }) => (
            <Input
              value={value}
              onChangeText={(url) => {
                onChange(url);
                if (scrapeError) setScrapeError(null);
              }}
              placeholder={t("Product URL")}
              autoCapitalize="none"
              keyboardType="url"
              returnKeyType="done"
              className={cn(
                "min-w-0 flex-1 border-primary",
                productLinkInvalid && "border-destructive",
              )}
            />
          )}
        />
        {canClearScrapedFields ? (
          <Button
            variant="destructive"
            size="icon"
            disabled={isScraping || isPending}
            onPress={clearProductLinkAndScraperFields}
            accessibilityLabel={t("Clear product link and autofill")}
          >
            <Icon as={X} className="size-4 text-white" />
          </Button>
        ) : null}
      </View>
      {productLinkInvalid ? (
        <Text className="text-sm font-semibold text-destructive">{t("Enter valid Url")}</Text>
      ) : isScraping ? (
        <Text className="text-sm font-semibold text-text-muted">{t("Searching...")}</Text>
      ) : scrapeError ? (
        <Text className="text-sm font-semibold text-destructive">{scrapeError}</Text>
      ) : null}
    </View>
  ) : null;

  async function handleScrape(url: string) {
    if (!url) return;
    if (!isValidHttpUrl(url)) {
      setScrapeError(t("Enter valid Url"));
      return;
    }

    const requestId = scrapeRequestIdRef.current + 1;
    scrapeRequestIdRef.current = requestId;
    setIsScraping(true);
    setScrapeError(null);
    lastScrapedUrlRef.current = url;

    try {
      const product = await scrapeProductLink(url);
      const isEmpty =
        !product.title &&
        !(form.scrapeDescription && product.description) &&
        !product.image &&
        !product.price;

      if (isEmpty) {
        if (requestId === scrapeRequestIdRef.current && currentUrlRef.current === url) {
          setScrapeError(t("Could not fetch product data"));
        }
        return;
      }

      if (requestId !== scrapeRequestIdRef.current || currentUrlRef.current !== url) return;

      if (product.image) {
        imageUpload.onClear();
      }
      patchValues({
        ...(product.title ? { name: product.title } : {}),
        ...(form.scrapeDescription && product.description
          ? { description: product.description }
          : {}),
        ...(product.image ? { imageUrl: product.image } : {}),
        ...(product.price ? { price: product.price } : {}),
        ...(product.currency ? { currency: product.currency } : {}),
        discountPrice: product.discount_price ?? "",
        hasDiscount: product.has_discount,
        discountEndDate: product.discount_end_date ?? "",
      });
    } catch (error) {
      if (requestId === scrapeRequestIdRef.current && currentUrlRef.current === url) {
        setScrapeError(error instanceof Error ? error.message : t("Could not fetch product data"));
      }
    } finally {
      if (requestId === scrapeRequestIdRef.current) {
        setIsScraping(false);
      }
    }
  }

  async function submitForm(formValues: ItemFormValues) {
    const name = formValues.name.trim();
    if (!canSubmit) return;
    if (
      mode === "create" &&
      isGated &&
      (targetWishlist?.items_count ?? 0) >= FREE_LIMITS.maxItemsPerWishlist
    ) {
      openPaywall();
      return;
    }

    const imageUrl = await imageUpload.resolveImageUrl(formValues.imageUrl);
    if (imageUrl === undefined) return;

    const payload = {
      name,
      description: form.showsDescription ? formValues.description.trim() || null : null,
      price: formValues.price.trim() || null,
      priority_id: mode === "create" && isGated ? null : formValues.priority_id,
      image_url: imageUrl,
      url: formValues.url.trim() || null,
      currency: formValues.currency.trim() || null,
      discount_price: formValues.discountPrice.trim() || null,
      has_discount: formValues.hasDiscount,
      discount_end_date: formValues.discountEndDate.trim() || null,
      additional_links:
        mode === "create" && isGated ? [] : cleanAdditionalLinks(formValues.additionalLinks),
    };

    if (mode === "edit" && item) {
      updateMutation.mutate(
        { id: item.id, updates: payload },
        {
          onSuccess: () => {
            void imageUpload.commitPendingUpload(item.image_url);
            handleClose();
          },
          onError: () => void imageUpload.discardPendingUpload(),
        },
      );
      return;
    }

    createMutation.mutate(
      {
        wishlist_id: targetWishlistId,
        ...payload,
      },
      {
        onSuccess: () => {
          void imageUpload.commitPendingUpload();
          completeCreateItemStep();
          handleClose();
        },
        onError: () => void imageUpload.discardPendingUpload(),
      },
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      scrollable
      detents={[0.75, 0.94]}
      onDidDismiss={() => onOpenChange(false)}
      footer={
        <View className="w-full flex-row items-stretch gap-2 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
          <Button
            className="min-w-0 flex-1"
            variant="outline"
            disabled={isPending}
            onPress={handleClose}
          >
            <Text>{t("Cancel")}</Text>
          </Button>
          <GuideTarget id="create-item-submit" portalTooltipAnchor="footer" style={{ flex: 1 }}>
            <Button
              className="min-w-0 flex-1"
              disabled={!canSubmit}
              onPress={handleSubmit(submitForm)}
            >
              {isPending || imageUpload.isUploading ? (
                <ActivityIndicator colorClassName="accent-primary-foreground" />
              ) : null}
              <Text>{mode === "edit" ? t("Save changes") : t("Create item")}</Text>
            </Button>
          </GuideTarget>
        </View>
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-5 px-5 pb-6 pt-5"
      >
        {form.productLinkPosition === "top" ? productLinkField : null}

        <Field label={t("Name")}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input
                value={value}
                onChangeText={onChange}
                placeholder={t("e.g. Noise-cancelling headphones")}
              />
            )}
          />
        </Field>

        {form.showsWishlistPicker ? (
          <Field label={t("Wishlist")}>
            <WishlistPickerField
              value={selectedWishlistId || selectableWishlists[0]?.id || ""}
              wishlists={selectableWishlists}
              isLoading={wishlistsQuery.isLoading}
              onChange={setSelectedWishlistId}
            />
          </Field>
        ) : null}

        {form.productLinkPosition === "middle" ? productLinkField : null}

        <Field label={t("Image")}>
          <SingleImagePicker
            previewUri={
              imageUpload.pickedImage?.uri ?? (imageUrlInvalid ? null : values.imageUrl.trim())
            }
            pickLabel={t("Choose image")}
            changeLabel={t("Change image")}
            onPick={(image) => {
              imageUpload.onPick(image);
              patchValues({ imageUrl: "" });
            }}
            onClear={() => {
              imageUpload.onClear();
              patchValues({ imageUrl: "" });
            }}
            onError={imageUpload.onError}
          />
          {imageUrlInvalid ? (
            <Text className="text-xs font-semibold text-destructive">{t("Enter valid Url")}</Text>
          ) : null}
          {imageUpload.error ? (
            <Text className="text-xs font-semibold text-destructive">{imageUpload.error}</Text>
          ) : null}
        </Field>

        {form.showsDescription ? (
          <Field label={t("Description")}>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, value } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onFocus={() => void sheetRef.current?.resize(1)}
                  placeholder={t("Add details, size, color...")}
                  multiline
                  onContentSizeChange={(event) => {
                    setDescriptionInputHeight(
                      clampDescriptionInputHeight(
                        event.nativeEvent.contentSize.height + DESCRIPTION_INPUT_VERTICAL_OFFSET,
                      ),
                    );
                  }}
                  className="items-start py-3"
                  style={{ height: descriptionInputHeight }}
                  textAlignVertical="top"
                />
              )}
            />
          </Field>
        ) : null}

        <View className="flex-row gap-2">
          <Field label={t("Currency")} className="w-24">
            <Controller
              control={control}
              name="currency"
              render={({ field: { onChange, value } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  placeholder={t("USD")}
                  autoCapitalize="characters"
                />
              )}
            />
          </Field>
          <Field label={t("Price")} className="min-w-0 flex-1">
            <Controller
              control={control}
              name="price"
              render={({ field: { onChange, value } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  placeholder={t("199")}
                  keyboardType="decimal-pad"
                />
              )}
            />
          </Field>
        </View>

        {isGated ? (
          <ProFeatureButton label={t("Pro: Set item priority")} onPress={openPaywall} />
        ) : (
          <Field label={t("Priority")}>
            <Controller
              control={control}
              name="priority_id"
              render={({ field: { onChange, value } }) => (
                <PrioritySelector
                  priorityOptions={priorityOptions}
                  value={value}
                  onChange={onChange}
                />
              )}
            />
          </Field>
        )}

        {isGated ? (
          <ProFeatureButton label={t("Pro: Add multiple links")} onPress={openPaywall} />
        ) : (
          <Field label={t("Additional links")}>
            <View className="gap-2">
              {values.additionalLinks.map((link, index) => (
                <View key={index} className="gap-1">
                  <View className="flex-row gap-2">
                    <Controller
                      control={control}
                      name={`additionalLinks.${index}.url`}
                      render={({ field: { onChange, value } }) => (
                        <Input
                          value={value}
                          onChangeText={onChange}
                          placeholder={t("https://...")}
                          autoCapitalize="none"
                          keyboardType="url"
                          className={cn(
                            "min-w-0 flex-1",
                            invalidAdditionalLinkIndexes.has(index) && "border-destructive",
                          )}
                        />
                      )}
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
                  {invalidAdditionalLinkIndexes.has(index) ? (
                    <Text className="text-xs font-semibold text-destructive">
                      {t("Enter valid Url")}
                    </Text>
                  ) : null}
                </View>
              ))}
              <Button
                variant="outline"
                onPress={() =>
                  patchValues({ additionalLinks: [...values.additionalLinks, { url: "" }] })
                }
              >
                <Icon as={Plus} className="size-4 text-text" />
                <Text>{t("Add another link")}</Text>
              </Button>
            </View>
          </Field>
        )}

        {error ? (
          <Text className="text-sm font-semibold text-destructive">{error.message}</Text>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

function ProFeatureButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Button
      variant="outline"
      onPress={onPress}
      className="justify-start border-brand/30 bg-brand-lighter"
    >
      <Icon as={Lock} className="size-4 text-brand" />
      <Text className="font-bold text-brand">{label}</Text>
    </Button>
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

function WishlistPickerField({
  value,
  wishlists,
  isLoading,
  onChange,
}: {
  value: string;
  wishlists: Wishlist[];
  isLoading: boolean;
  onChange: (wishlistId: string) => void;
}) {
  const t = useGT();
  const options = React.useMemo<AutocompleteDropdownOption[]>(
    () =>
      wishlists.map((wishlist) => ({
        value: wishlist.id,
        label: wishlist.title,
        trailing: t("{count} items", { count: wishlist.items_count ?? 0 }),
        imageUrl: wishlist.image_url,
      })),
    [t, wishlists],
  );
  const selectedOption = options.find((option) => option.value === value) ?? null;

  if (isLoading) {
    return (
      <View className="items-center justify-center rounded-xl border border-border-subtle bg-bg-muted p-4">
        <ActivityIndicator />
      </View>
    );
  }

  if (wishlists.length === 0) {
    return (
      <Text className="text-sm font-semibold text-text-muted">
        {t("Create a wishlist first to add wishes to it.")}
      </Text>
    );
  }

  return (
    <AutocompleteDropdown
      value={selectedOption}
      onValueChange={(option) => onChange(option.value)}
      options={options}
      placeholder={t("Search wishlists")}
      emptyText={t("No wishlists found")}
      attached
      maxVisibleOptions={4}
      optionClassName="min-h-12 py-3"
    />
  );
}

function PrioritySelector({
  priorityOptions,
  value,
  onChange,
}: {
  priorityOptions: ReturnType<typeof getItemPriorityOptions>;
  value: ItemFormValues["priority_id"];
  onChange: (priority: ItemFormValues["priority_id"]) => void;
}) {
  const t = useGT();
  const options = React.useMemo(
    () =>
      priorityOptions.map((option) => ({
        value: option.priority_id,
        label: option.label,
      })),
    [priorityOptions],
  );
  const selectedOption = options.find((option) => option.value === value) ?? null;
  const prioritiesById = React.useMemo(
    () =>
      new Map(
        priorityOptions.map((option) => [option.priority_id, getItemPriority(option.priority_id)]),
      ),
    [priorityOptions],
  );
  const selectedPriority = value ? prioritiesById.get(value) : undefined;

  return (
    <Select
      value={selectedOption ?? undefined}
      onValueChange={(option) => {
        if (option?.value) onChange(option.value);
      }}
    >
      <SelectTrigger
        className="h-10"
        style={
          selectedPriority
            ? {
                backgroundColor: `${selectedPriority.color}1f`,
                borderColor: `${selectedPriority.color}33`,
              }
            : undefined
        }
      >
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          {selectedPriority ? (
            <PriorityFilterIcon priority={selectedPriority} showBackground={false} />
          ) : null}
          <SelectValue className="min-w-0 flex-1" placeholder={t("Select priority")} />
        </View>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => {
          const priority = prioritiesById.get(option.value);

          return (
            <SelectItem
              key={option.value}
              value={option.value}
              label={option.label}
              leading={priority ? <PriorityFilterIcon priority={priority} /> : null}
            />
          );
        })}
      </SelectContent>
    </Select>
  );
}
