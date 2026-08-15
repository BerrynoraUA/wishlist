import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetScrollView,
  type BottomSheetRef,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { CurrencyPicker } from "@/components/ui/currency-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { PeoplePickerField, type PeoplePickerItem } from "@/components/ui/people-picker";
import { SingleImagePicker } from "@/components/ui/single-image-picker";
import { Text } from "@/components/ui/text";
import { useInfiniteFriends } from "@/hooks/use-friends";
import { useInfiniteListData } from "@/hooks/use-infinite-page";
import { useProGate } from "@/hooks/use-pro-gate";
import {
  useCreateSecretSantaEvent,
  useInfiniteSecretSantaEvents,
  useUpdateSecretSantaEvent,
} from "@/hooks/use-secret-santa";
import { useSettings } from "@/hooks/use-settings";
import type { NativePickedImage } from "@/lib/image-upload";
import { getSecretSantaPersonName } from "@/lib/secret-santa";
import type {
  SecretSantaDetails,
  SecretSantaImageInput,
} from "@wishlist/backend/types/secret-santa";
import { FREE_LIMITS } from "@wishlist/backend/types/subscription";
import { CalendarDays, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";

type SheetMode = "create" | "edit";

type SelectedImage = SecretSantaImageInput & {
  previewUri: string;
};

const PARTICIPANT_PAGE_SIZE = 10;
/** Used for the very first frame, before the form has reported its height. */
const INITIAL_SHEET_DETENT = 0.75;
const MIN_SHEET_DETENT = 0.4;
const MAX_SHEET_DETENT = 0.94;

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
  const { isGated, openPaywall } = useProGate();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const { height: windowHeight } = useWindowDimensions();
  const [contentHeight, setContentHeight] = React.useState(0);
  // Edit mode remains scrollable and uses a single detent sized to the form, so the sheet
  // can neither open with dead space nor be dragged past its content. Creation uses the
  // native `auto` detent instead.
  // Rounded to whole percents so typing in the description does not retrigger a resize
  // on every keystroke.
  const contentDetent =
    contentHeight > 0
      ? Math.round(
          Math.min(MAX_SHEET_DETENT, Math.max(MIN_SHEET_DETENT, contentHeight / windowHeight)) *
            100,
        ) / 100
      : INITIAL_SHEET_DETENT;
  const { data: settings } = useSettings();
  const [participantSearch, setParticipantSearch] = React.useState("");
  const deferredParticipantSearch = React.useDeferredValue(participantSearch);
  const friendsQuery = useInfiniteFriends(
    { search: deferredParticipantSearch },
    PARTICIPANT_PAGE_SIZE,
    { enabled: open && mode === "create" },
  );
  const { items: friends, loadMore: loadMoreFriends } = useInfiniteListData(friendsQuery);
  const createEvent = useCreateSecretSantaEvent();
  const updateEvent = useUpdateSecretSantaEvent();
  const eventsQuery = useInfiniteSecretSantaEvents({}, 1);
  const defaultCurrency = settings?.display_currency ?? "USD";
  const [name, setName] = React.useState(event?.name ?? "");
  const [eventDate, setEventDate] = React.useState(event?.event_date?.slice(0, 10) ?? "");
  const [budget, setBudget] = React.useState(event ? String(event.budget) : "");
  const [currency, setCurrency] = React.useState(event?.currency ?? defaultCurrency);
  const [image, setImage] = React.useState<SelectedImage | null>(null);
  const [imageUrl, setImageUrl] = React.useState(event?.image_url ?? "");
  const [removeImage, setRemoveImage] = React.useState(false);
  const [participants, setParticipants] = React.useState<PeoplePickerItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const isSaving = createEvent.isPending || updateEvent.isPending;
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
    setParticipantSearch("");
    setError(null);
  }, [defaultCurrency, event, open]);

  const friendOptions = React.useMemo<PeoplePickerItem[]>(() => {
    return friends.map((friend) => ({
      id: friend.friend_id,
      name: friend.display_name || friend.nickname || t("Friend"),
      subtitle: friend.nickname ? `@${friend.nickname}` : null,
      avatarUrl: friend.avatar_url,
    }));
  }, [friends, t]);

  if (!open) return null;

  function pickImage(picked: NativePickedImage) {
    setImage({ ...picked, previewUri: picked.uri });
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

    if (
      mode === "create" &&
      isGated &&
      (eventsQuery.data?.pages[0]?.total ?? 0) >= FREE_LIMITS.maxSecretSantaEvents
    ) {
      openPaywall();
      return;
    }

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
        invited_user_ids: participants.map((participant) => participant.id),
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
      scrollable={mode === "edit"}
      detents={mode === "create" ? ["auto"] : [contentDetent]}
      footerInsetMode="scroll-content"
      onDidDismiss={() => onOpenChange(false)}
      header={
        <BottomSheetHeader title={mode === "edit" ? t("Edit event") : t("Create an event")} />
      }
      footer={
        <View className="w-full flex-row items-stretch gap-2 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
          <Button
            className="min-w-0 flex-1"
            variant="outline"
            disabled={isSaving}
            onPress={closeSheet}
          >
            <Text>{t("Cancel")}</Text>
          </Button>
          <Button className="min-w-0 flex-1" disabled={isSaving} onPress={submit}>
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
      }
    >
      <BottomSheetScrollView
        className="max-h-full"
        contentContainerClassName="gap-5 px-5"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        onContentSizeChange={(_width, height) => setContentHeight(height)}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2">
          <Text className="text-sm font-semibold text-text">{t("Event Name")}</Text>
          <Input value={name} onChangeText={setName} placeholder={t("Family Gift Exchange")} />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-text">{t("Event Date")}</Text>
          <DatePicker value={eventDate || null} onChange={(value) => setEventDate(value ?? "")}>
            {({ displayValue, openPicker }) => (
              <View className="flex-row gap-2">
                <Button variant="outline" onPress={openPicker} className="flex-1 justify-between">
                  <View className="flex-row items-center gap-2">
                    <Icon as={CalendarDays} className="size-4 text-text-muted" />
                    <Text>{eventDate ? displayValue : t("Choose date")}</Text>
                  </View>
                </Button>
                {eventDate ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    accessibilityLabel={t("Clear event date")}
                    onPress={() => setEventDate("")}
                  >
                    <Icon as={X} className="size-4 text-text-muted" />
                  </Button>
                ) : null}
              </View>
            )}
          </DatePicker>
        </View>

        <View className="flex-row gap-3">
          <View className="min-w-0 basis-0 flex-1 gap-2">
            <Text className="text-sm font-semibold text-text">{t("Budget")}</Text>
            <Input
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
              placeholder="25"
            />
          </View>
          <View className="min-w-0 basis-0 flex-1 gap-2">
            <Text className="text-sm font-semibold text-text">{t("Currency")}</Text>
            <CurrencyPicker value={currency} onValueChange={setCurrency} />
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-text">{t("Cover Image")}</Text>
          <SingleImagePicker
            previewUri={image?.previewUri ?? imageUrl}
            aspect={[16, 9]}
            pickLabel={t("Choose cover image")}
            changeLabel={t("Change image")}
            onPick={pickImage}
            onClear={clearImage}
            onError={setError}
          />
        </View>

        {mode === "create" ? (
          <PeoplePickerField
            label={t("Participants")}
            title={t("Add participants")}
            addLabel={t("Add participants")}
            items={friendOptions}
            selected={participants}
            onChange={setParticipants}
            query={participantSearch}
            onQueryChange={setParticipantSearch}
            onEndReached={loadMoreFriends}
            isLoading={friendsQuery.isLoading}
            isError={friendsQuery.isError}
            isFetchingMore={friendsQuery.isFetchingNextPage}
            searchPlaceholder={t("Search friends")}
            emptyLabel={t("No friends to add.")}
          />
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
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
