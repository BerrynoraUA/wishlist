import { scrapeProductLink } from "@/api/scrape-product";
import {
  AutocompleteDropdown,
  type AutocompleteDropdownOption,
} from "@/components/ui/autocomplete-dropdown";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { GuideTarget } from "@/components/user-guide/guide-target";
import { useUserGuideStepCompletion } from "@/components/user-guide/user-guide-provider";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { SingleImagePicker } from "@/components/ui/single-image-picker";
import { Text } from "@/components/ui/text";
import { PriorityFilterIcon } from "@/components/items/item-labels";
import { useCreateItem, useUpdateItem } from "@/hooks/use-items";
import { useMyWishlists } from "@/hooks/use-wishlists";
import { useSettings } from "@/hooks/use-settings";
import {
  EMPTY_ITEM_FORM,
  getItemPriority,
  getItemPriorityOptions,
  cleanAdditionalLinks,
  toItemFormValues,
} from "@/lib/items";
import { type NativePickedImage, uploadPickedImage } from "@/lib/image-upload";
import { cn } from "@/lib/utils";
import { hasInvalidOptionalUrl, isValidHttpUrl } from "@/lib/urls";
import type { Item, ItemFormValues } from "@wishlist/backend/types/item";
import { Plus, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ActivityIndicator, ScrollView, View } from "react-native";

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
  const completeCreateItemStep = useUserGuideStepCompletion(6);
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
  const [selectedWishlistId, setSelectedWishlistId] = React.useState("");
  const needsWishlistPicker = mode === "create" && !wishlistId;
  const targetWishlistId = wishlistId || selectedWishlistId;
  const usesProductLink = mode === "edit" || createSource === "link";
  const isCreateFromLink = mode === "create" && createSource === "link";
  const isCreateFromScratch = mode === "create" && createSource === "scratch";
  const [isScraping, setIsScraping] = React.useState(false);
  const [pickedImage, setPickedImage] = React.useState<NativePickedImage | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const [scrapeError, setScrapeError] = React.useState<string | null>(null);
  const currentUrlRef = React.useRef("");
  const lastScrapedUrlRef = React.useRef("");
  const scrapeRequestIdRef = React.useRef(0);
  const productLinkInvalid = usesProductLink && hasInvalidOptionalUrl(values.url);
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
    !isUploadingImage &&
    values.name.trim() !== "" &&
    (mode === "edit" || targetWishlistId !== "") &&
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
      setSelectedWishlistId("");
      setScrapeError(null);
      setPickedImage(null);
      setImageError(null);
      setIsUploadingImage(false);
      currentUrlRef.current = nextValues.url.trim();
      lastScrapedUrlRef.current = nextValues.url.trim();
    }
  }, [createSource, item, mode, open, reset]);

  // Priority options can arrive after the sheet opens (they come from settings),
  // so defaulting can't happen in the open/reset effect above.
  React.useEffect(() => {
    if (!open || mode !== "create" || priorityOptions.length === 0) return;
    if (priorityOptions.some((option) => option.priority_id === values.priority_id)) return;

    setValue("priority_id", priorityOptions[0].priority_id);
  }, [mode, open, priorityOptions, setValue, values.priority_id]);

  React.useEffect(() => {
    currentUrlRef.current = values.url.trim();
  }, [values.url]);

  React.useEffect(() => {
    const url = values.url.trim();
    if (
      !open ||
      !usesProductLink ||
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
  }, [open, usesProductLink, values.url]);

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
    setPickedImage(null);
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
    isCreateFromLink &&
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

  const productLinkField = usesProductLink ? (
    <View className="gap-2">
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
              className={cn("min-w-0 flex-1", productLinkInvalid && "border-destructive")}
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
        !(mode === "edit" && product.description) &&
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
        setPickedImage(null);
      }
      patchValues({
        ...(product.title ? { name: product.title } : {}),
        ...(mode === "edit" && product.description ? { description: product.description } : {}),
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

    setImageError(null);

    let imageUrl = formValues.imageUrl.trim() || null;

    if (pickedImage) {
      setIsUploadingImage(true);
      try {
        imageUrl = await uploadPickedImage(pickedImage, "item");
      } catch (uploadError) {
        setImageError(
          uploadError instanceof Error ? uploadError.message : t("Could not save image."),
        );
        return;
      } finally {
        setIsUploadingImage(false);
      }
    }

    const payload = {
      name,
      description: mode === "edit" ? formValues.description.trim() || null : null,
      price: formValues.price.trim() || null,
      priority_id: formValues.priority_id,
      image_url: imageUrl,
      url: formValues.url.trim() || null,
      currency: formValues.currency.trim() || null,
      discount_price: formValues.discountPrice.trim() || null,
      has_discount: formValues.hasDiscount,
      discount_end_date: formValues.discountEndDate.trim() || null,
      additional_links: cleanAdditionalLinks(formValues.additionalLinks),
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
        wishlist_id: targetWishlistId,
        ...payload,
      },
      {
        onSuccess: () => {
          completeCreateItemStep();
          handleClose();
        },
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
              {isPending || isUploadingImage ? (
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
        {isCreateFromLink ? productLinkField : null}

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

        {needsWishlistPicker ? (
          <Field label={t("Wishlist")}>
            <WishlistPickerField value={selectedWishlistId} onChange={setSelectedWishlistId} />
          </Field>
        ) : null}

        {!isCreateFromLink ? productLinkField : null}

        <Field label={t("Image")}>
          <SingleImagePicker
            previewUri={pickedImage?.uri ?? (imageUrlInvalid ? null : values.imageUrl.trim())}
            pickLabel={t("Choose image")}
            changeLabel={t("Change image")}
            onPick={(image) => {
              setPickedImage(image);
              patchValues({ imageUrl: "" });
              setImageError(null);
            }}
            onClear={() => {
              setPickedImage(null);
              patchValues({ imageUrl: "" });
              setImageError(null);
            }}
            onError={setImageError}
          />
          {imageUrlInvalid ? (
            <Text className="text-xs font-semibold text-destructive">{t("Enter valid Url")}</Text>
          ) : null}
          {imageError ? (
            <Text className="text-xs font-semibold text-destructive">{imageError}</Text>
          ) : null}
        </Field>

        {mode === "edit" ? (
          <Field label={t("Description")}>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, value } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  placeholder={t("Add details, size, color...")}
                  multiline
                  className="h-24 items-start py-3"
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

function WishlistPickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (wishlistId: string) => void;
}) {
  const t = useGT();
  const wishlistsQuery = useMyWishlists();
  const wishlists = React.useMemo(
    () => (wishlistsQuery.data ?? []).filter((wishlist) => wishlist.is_owner || wishlist.can_edit),
    [wishlistsQuery.data],
  );
  const options = React.useMemo<AutocompleteDropdownOption[]>(
    () =>
      wishlists.map((wishlist) => ({
        value: wishlist.id,
        label: wishlist.title,
        description: t("{count} items", { count: wishlist.items_count ?? 0 }),
        imageUrl: wishlist.image_url,
      })),
    [t, wishlists],
  );
  const selectedOption = options.find((option) => option.value === value) ?? null;

  React.useEffect(() => {
    if (!value && wishlists.length > 0) {
      onChange(wishlists[0].id);
    }
  }, [onChange, value, wishlists]);

  if (wishlistsQuery.isLoading) {
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
  const options = React.useMemo<AutocompleteDropdownOption[]>(
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
    <AutocompleteDropdown
      value={selectedOption}
      onValueChange={(option) => onChange(option.value)}
      options={options}
      placeholder={t("Search priority")}
      emptyText={t("No priorities found")}
      attached
      searchable={false}
      highlightSelectedOption={false}
      optionClassName="min-h-10 py-2"
      renderOptionLeading={(option) => {
        const priority = prioritiesById.get(option.value);

        return priority ? <PriorityFilterIcon priority={priority} /> : null;
      }}
      attachedContainerStyle={
        selectedPriority
          ? {
              backgroundColor: `${selectedPriority.color}1f`,
              borderColor: `${selectedPriority.color}33`,
            }
          : undefined
      }
      trailingAccessory={
        selectedPriority ? (
          <PriorityFilterIcon priority={selectedPriority} showBackground={false} />
        ) : null
      }
    />
  );
}
