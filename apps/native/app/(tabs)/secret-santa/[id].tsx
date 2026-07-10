import {
  SecretSantaDetailHero,
  SecretSantaGiftSuggestions,
  SecretSantaLaunchCard,
  SecretSantaPeopleSection,
  SecretSantaReceiverCard,
} from "@/components/secret-santa/secret-santa-detail-sections";
import { SecretSantaCreateEditSheet } from "@/components/secret-santa/sheets/secret-santa-create-edit-sheet";
import { SecretSantaLaunchSheet } from "@/components/secret-santa/sheets/secret-santa-launch-sheet";
import { InlineState } from "@/components/shared/inline-state";
import {
  ActionBottomSheetConfirm,
  ActionBottomSheetMessage,
  type ActionBottomSheetMessagePayload,
} from "@/components/ui/action-bottom-sheet";
import { FloatingBackButton } from "@/components/ui/floating-back-button";
import { ScreenTopBackdrop } from "@/components/ui/screen-top-backdrop";
import { StyledImage } from "@/components/ui/styled-image";
import {
  useDeleteSecretSantaEvent,
  useRemoveSecretSantaInvite,
  useRemoveSecretSantaParticipant,
  useSecretSantaDetails,
} from "@/hooks/use-secret-santa";
import { useCurrentUserId } from "@/hooks/use-user";
import { MIN_PARTICIPANTS_TO_LAUNCH, buildSecretSantaJoinUrl } from "@/lib/secret-santa";
import { cn } from "@/lib/utils";
import { getWishlistAccentClass } from "@/lib/wishlists";
import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SheetState = "edit" | "launch" | "delete" | null;

export default function SecretSantaDetailScreen() {
  const t = useGT();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const eventId = String(params.id ?? "");
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { data: currentUserId = "" } = useCurrentUserId();
  const detailsQuery = useSecretSantaDetails(eventId);
  const removeParticipant = useRemoveSecretSantaParticipant();
  const removeInvite = useRemoveSecretSantaInvite();
  const deleteEvent = useDeleteSecretSantaEvent();
  const [sheet, setSheet] = React.useState<SheetState>(null);
  const [copied, setCopied] = React.useState(false);
  const [message, setMessage] = React.useState<ActionBottomSheetMessagePayload | null>(null);

  const contentWidth = Math.min(width - 32, 900);
  const data = detailsQuery.data;
  const isOwner = Boolean(currentUserId && data?.owner_id === currentUserId);
  const isStarted = Boolean(data?.is_started);
  const participants = data?.participants ?? [];
  const pendingInvites = data?.pending_invites ?? [];
  const totalPeople = participants.length + pendingInvites.length;
  const canLaunch =
    pendingInvites.length === 0 && participants.length >= MIN_PARTICIPANTS_TO_LAUNCH;

  React.useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function copyInviteLink() {
    if (!eventId) return;

    try {
      await Clipboard.setStringAsync(buildSecretSantaJoinUrl(eventId));
      setCopied(true);
      setMessage({ title: t("Link copied"), message: t("Invite link copied to clipboard.") });
    } catch {
      setMessage({ title: t("Copy failed"), message: t("Failed to copy invite link.") });
    }
  }

  function handleDelete() {
    if (!eventId) return;

    deleteEvent.mutate(eventId, {
      onSuccess: () => {
        setSheet(null);
        router.replace("/secret-santa" as never);
      },
      onError: (error) => {
        setMessage({ title: t("Delete failed"), message: error.message });
      },
    });
  }

  return (
    <>
      <Stack.Screen options={{ title: data?.name ?? t("Secret Santa") }} />
      <View className="flex-1 bg-bg">
        {data ? (
          <ScreenTopBackdrop>
            <View className={cn("absolute inset-0", getWishlistAccentClass(null))} />
            {data.image_url ? (
              <StyledImage
                source={{ uri: data.image_url }}
                contentFit="cover"
                className="absolute inset-0 w-full"
              />
            ) : null}
            <View className="absolute inset-0 bg-black/25" />
          </ScreenTopBackdrop>
        ) : null}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        >
          <View className="gap-5 bg-bg">
            {detailsQuery.isLoading ? (
              <View
                className="items-center justify-center self-center rounded-xl border border-border-subtle bg-card-bg p-8"
                style={{ marginTop: 20, width: contentWidth }}
              >
                <ActivityIndicator colorClassName="accent-brand" />
              </View>
            ) : null}

            {detailsQuery.isError ? (
              <View className="self-center" style={{ marginTop: 20, width: contentWidth }}>
                <InlineState message={t("Failed to load Secret Santa event.")} />
              </View>
            ) : null}

            {data ? (
              <>
                <SecretSantaDetailHero
                  event={data}
                  totalPeople={totalPeople}
                  isOwner={isOwner}
                  copied={copied}
                  onCopyLink={copyInviteLink}
                  onEdit={() => setSheet("edit")}
                  onDelete={() => setSheet("delete")}
                  topInset={insets.top}
                />

                <View className="gap-5 self-center" style={{ width: contentWidth }}>
                  {isStarted ? (
                    <>
                      {data.my_receiver ? (
                        <SecretSantaReceiverCard receiver={data.my_receiver} />
                      ) : null}
                      <SecretSantaPeopleSection
                        title={t("Participants")}
                        emptyText={t("No participants have accepted yet.")}
                        emptyMascot="sad-alone"
                        people={participants}
                      />
                      <SecretSantaGiftSuggestions
                        receiverId={data.my_receiver?.id}
                        budget={data.budget}
                        currency={data.currency}
                      />
                    </>
                  ) : isOwner ? (
                    <>
                      <SecretSantaLaunchCard
                        canLaunch={canLaunch}
                        pendingInvitesCount={pendingInvites.length}
                        participantsCount={participants.length}
                        onLaunch={() => setSheet("launch")}
                      />
                      <SecretSantaPeopleSection
                        title={t("Participants")}
                        emptyText={t("No participants have accepted yet.")}
                        emptyMascot="sad-alone"
                        people={participants}
                        onRemove={(userId) => {
                          removeParticipant.mutate(
                            { eventId, userId },
                            {
                              onError: (error) =>
                                setMessage({
                                  title: t("Remove failed"),
                                  message: error.message,
                                }),
                            },
                          );
                        }}
                      />
                      <SecretSantaPeopleSection
                        title={t("Pending invites")}
                        emptyText={t("No pending invites.")}
                        people={pendingInvites}
                        onRemove={(inviteId) => {
                          removeInvite.mutate(
                            { eventId, inviteId },
                            {
                              onError: (error) =>
                                setMessage({
                                  title: t("Remove failed"),
                                  message: error.message,
                                }),
                            },
                          );
                        }}
                      />
                    </>
                  ) : (
                    <SecretSantaPeopleSection
                      title={t("Participants")}
                      emptyText={t("No participants have accepted yet.")}
                      emptyMascot="sad-alone"
                      people={participants}
                    />
                  )}
                </View>
              </>
            ) : null}
          </View>
        </ScrollView>

        <FloatingBackButton />
      </View>

      {data ? (
        <>
          <SecretSantaCreateEditSheet
            mode="edit"
            open={sheet === "edit"}
            event={data}
            onOpenChange={(open) => {
              if (!open) setSheet(null);
            }}
          />
          <SecretSantaLaunchSheet
            open={sheet === "launch"}
            eventId={eventId}
            participants={participants}
            onOpenChange={(open) => {
              if (!open) setSheet(null);
            }}
            onLaunched={() =>
              setMessage({
                title: t("Secret Santa launched!"),
                message: t("Matches are ready."),
              })
            }
          />
          <ActionBottomSheetConfirm
            open={sheet === "delete"}
            title={t("Delete Event")}
            message={t(
              "Are you sure you want to delete this Secret Santa event? This action cannot be undone.",
            )}
            confirmLabel={t("Delete Event")}
            tone="destructive"
            isPending={deleteEvent.isPending}
            onClose={() => setSheet(null)}
            onConfirm={handleDelete}
          />
        </>
      ) : null}
      <ActionBottomSheetMessage message={message} onClose={() => setMessage(null)} />
    </>
  );
}
