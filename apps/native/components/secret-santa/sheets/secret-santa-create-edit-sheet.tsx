import {
  AutocompleteDropdown,
  type AutocompleteDropdownOption,
} from "@/components/ui/autocomplete-dropdown";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import { useFriends } from "@/hooks/use-friends";
import { useCreateSecretSantaEvent, useUpdateSecretSantaEvent } from "@/hooks/use-secret-santa";
import { useSettings } from "@/hooks/use-settings";
import {
  SECRET_SANTA_MAX_IMAGE_BYTES,
  getSecretSantaCurrencyOptions,
  getSecretSantaPersonName,
} from "@/lib/secret-santa";
import type {
  SecretSantaDetails,
  SecretSantaImageInput,
} from "@wishlist/backend/types/secret-santa";
import * as ImagePicker from "expo-image-picker";
import { Camera, CalendarDays, ImagePlus, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

type SheetMode = "create" | "edit";

type SelectedImage = SecretSantaImageInput & {
  previewUri: string;
};

export function SecretSantaCreateEditSheet({
  mode,
  open,
  event,
  onOpenChange,
  onSaved,
}: {
  mode: SheetMode;
  open: boolean;
  event?: SecretSantaDetails;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const { data: settings } = useSettings();
  const friendsQuery = useFriends({ take: 50 });
  const createEvent = useCreateSecretSantaEvent();
  const updateEvent = useUpdateSecretSantaEvent();
  const currencyOptions = React.useMemo(() => getSecretSantaCurrencyOptions(), []);
  const defaultCurrency = settings?.display_currency ?? "USD";
  const [name, setName] = React.useState(event?.name ?? "");
  const [eventDate, setEventDate] = React.useState(event?.event_date?.slice(0, 10) ?? "");
  const [budget, setBudget] = React.useState(event ? String(event.budget) : "");
  const [currency, setCurrency] = React.useState(event?.currency ?? defaultCurrency);
  const [image, setImage] = React.useState<SelectedImage | null>(null);
  const [imageUrl, setImageUrl] = React.useState(event?.image_url ?? "");
  const [removeImage, setRemoveImage] = React.useState(false);
  const [participants, setParticipants] = React.useState<AutocompleteDropdownOption[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const isSaving = createEvent.isPending || updateEvent.isPending;
  const selectedCurrencyOption =
    currencyOptions.find((option) => option.value === currency) ?? currencyOptions[0];

  React.useEffect(() => {
    if (!open) return;
    setName(event?.name ?? "");
    setEventDate(event?.event_date?.slice(0, 10) ?? "");
    setBudget(event ? String(event.budget) : "");
    setCurrency(event?.currency ?? defaultCurrency);
    setImage(null);
    setImageUrl(event?.image_url ?? "");
    setRemoveImage(false);
    setParticipants([]);
    setError(null);
  }, [defaultCurrency, event, open]);

  const friendOptions = React.useMemo<AutocompleteDropdownOption[]>(() => {
    return (friendsQuery.data ?? []).map((friend) => ({
      value: friend.friend_id,
      label: friend.display_name || friend.nickname || t("Friend"),
      description: friend.nickname ? `@${friend.nickname}` : undefined,
      keywords: [friend.display_name, friend.nickname].filter(Boolean) as string[],
    }));
  }, [friendsQuery.data, t]);

  if (!open) return null;

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError(t("Allow photo library access to choose an image."));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) return;

    if (asset.fileSize && asset.fileSize > SECRET_SANTA_MAX_IMAGE_BYTES) {
      setError(t("Choose an image that is 5 MB or less."));
      return;
    }

    setImage({
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      previewUri: asset.uri,
    });
    setImageUrl("");
    setRemoveImage(false);
    setError(null);
  }

  function clearImage() {
    setImage(null);
    setImageUrl("");
    setRemoveImage(true);
  }

  function closeSheet() {
    void sheetRef.current?.dismiss();
  }

  function submit() {
    const parsedBudget = Number(budget);

    if (!name.trim()) {
      setError(t("Event name is required."));
      return;
    }

    if (!eventDate) {
      setError(t("Choose an event date."));
      return;
    }

    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      setError(t("Enter a valid budget."));
      return;
    }

    setError(null);

    if (mode === "edit" && event) {
      updateEvent.mutate(
        {
          eventId: event.id,
          updates: {
            name: name.trim(),
            event_date: eventDate,
            budget: parsedBudget,
            currency,
            image,
            imageUrl: image ? null : imageUrl || null,
            removeImage,
          },
        },
        {
          onSuccess: () => {
            onSaved?.();
            closeSheet();
          },
          onError: (mutationError) => setError(mutationError.message),
        },
      );
      return;
    }

    createEvent.mutate(
      {
        name: name.trim(),
        event_date: eventDate,
        budget: parsedBudget,
        currency,
        image,
        imageUrl: image ? null : imageUrl || null,
        invited_user_ids: participants.map((participant) => participant.value),
      },
      {
        onSuccess: () => {
          onSaved?.();
          closeSheet();
        },
        onError: (mutationError) => setError(mutationError.message),
      },
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      detents={[0.85, 1]}
      scrollable
      dismissOnBack={false}
      onDidDismiss={() => onOpenChange(false)}
    >
      <View className="gap-5 px-5 pb-6 pt-5">
        <View className="gap-1">
          <Text className="text-xl font-extrabold text-text">
            {mode === "edit" ? t("Edit Secret Santa Event") : t("Create Secret Santa Event")}
          </Text>
          <Text className="text-sm leading-5 text-text-muted">
            {mode === "edit"
              ? t("Update the event details without changing accepted participants.")
              : t("Set up a gift exchange with your friends.")}
          </Text>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-text">{t("Event Name")}</Text>
          <Input value={name} onChangeText={setName} placeholder={t("Family Gift Exchange")} />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-text">{t("Event Date")}</Text>
          <DatePicker value={eventDate || null} onChange={(value) => setEventDate(value ?? "")}>
            {({ displayValue, openPicker }) => (
              <Button variant="outline" onPress={openPicker} className="justify-between">
                <View className="flex-row items-center gap-2">
                  <Icon as={CalendarDays} className="size-4 text-text-muted" />
                  <Text>{eventDate ? displayValue : t("Choose date")}</Text>
                </View>
              </Button>
            )}
          </DatePicker>
        </View>

        <View className="flex-row gap-3">
          <View className="min-w-0 flex-1 gap-2">
            <Text className="text-sm font-semibold text-text">{t("Budget")}</Text>
            <Input
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
              placeholder="25"
            />
          </View>
          <View className="w-32 gap-2">
            <Text className="text-sm font-semibold text-text">{t("Currency")}</Text>
            <AutocompleteDropdown
              options={currencyOptions}
              value={selectedCurrencyOption}
              onValueChange={(option) => setCurrency(option.value)}
              placeholder={t("Currency")}
              emptyText={t("No currencies found.")}
            />
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-text">{t("Cover Image")}</Text>
          <View className="overflow-hidden rounded-xl border border-border-subtle bg-bg-muted">
            {image?.previewUri || imageUrl ? (
              <View className="relative h-40">
                <StyledImage
                  source={{ uri: image?.previewUri ?? imageUrl }}
                  contentFit="cover"
                  className="absolute inset-0 size-full"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  accessibilityLabel={t("Remove image")}
                  onPress={clearImage}
                  className="absolute right-3 top-3 rounded-full"
                >
                  <Icon as={X} className="size-4 text-text" />
                </Button>
              </View>
            ) : (
              <Button variant="ghost" onPress={pickImage} className="h-32 flex-col gap-2">
                <Icon as={ImagePlus} className="size-7 text-brand" />
                <Text>{t("Choose cover image")}</Text>
              </Button>
            )}
          </View>
          {image?.previewUri || imageUrl ? (
            <Button variant="outline" onPress={pickImage} className="self-start">
              <Icon as={Camera} className="size-4 text-text" />
              <Text>{t("Change image")}</Text>
            </Button>
          ) : null}
        </View>

        {mode === "create" ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-text">{t("Participants")}</Text>
            <AutocompleteDropdown
              multiple
              options={friendOptions}
              value={participants}
              onValueChange={setParticipants}
              placeholder={t("Search friends")}
              emptyText={friendsQuery.isLoading ? t("Loading friends...") : t("No friends to add.")}
            />
          </View>
        ) : null}

        {mode === "edit" && event?.participants.length ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-text">{t("Accepted participants")}</Text>
            <Text className="text-sm text-text-muted">
              {event.participants.map((person) => getSecretSantaPersonName(person, t)).join(", ")}
            </Text>
          </View>
        ) : null}

        {error ? <Text className="text-sm font-semibold text-destructive">{error}</Text> : null}

        <View className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" disabled={isSaving} onPress={closeSheet}>
            <Text>{t("Cancel")}</Text>
          </Button>
          <Button disabled={isSaving} onPress={submit}>
            {isSaving ? <ActivityIndicator colorClassName="accent-white" /> : null}
            <Text>
              {isSaving
                ? mode === "edit"
                  ? t("Saving...")
                  : t("Creating...")
                : mode === "edit"
                  ? t("Save Changes")
                  : t("Create Event")}
            </Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
