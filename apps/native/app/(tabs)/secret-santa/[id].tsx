import {
  SecretSantaDetailHero,
  SecretSantaGiftSuggestions,
  SecretSantaLaunchCard,
  SecretSantaPeopleSection,
  SecretSantaReceiverCard,
} from "@/components/secret-santa/secret-santa-detail-sections";
import { SecretSantaCreateEditSheet } from "@/components/secret-santa/sheets/secret-santa-create-edit-sheet";
import { SecretSantaInviteSheet } from "@/components/secret-santa/sheets/secret-santa-invite-sheet";
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
import {
  MIN_PARTICIPANTS_TO_LAUNCH,
  buildSecretSantaJoinUrl,
  getSecretSantaPersonName,
} from "@/lib/secret-santa";
import { cn } from "@/lib/utils";
import { getWishlistAccentClass } from "@/lib/wishlists";
import type {
  SecretSantaPendingInvite,
  SecretSantaPerson,
} from "@wishlist/backend/types/secret-santa";
import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, ScrollView, Share, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SheetState = "edit" | "invite" | "launch" | "delete" | null;

type RemoveTarget = {
  kind: "participant" | "invite";
  id: string;
  name: string;
};

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
  const [removeTarget, setRemoveTarget] = React.useState<RemoveTarget | null>(null);
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

  async function shareInviteLink() {
    if (!eventId) return;

    const url = buildSecretSantaJoinUrl(eventId);
    const inviteMessage = t('Join our Secret Santa "{name}" on Wishlane!', {
      name: data?.name ?? t("Secret Santa"),
    });

    try {
      if (process.env.EXPO_OS === "ios") {
        await Share.share({ message: inviteMessage, url });
      } else {
        await Share.share({ message: `${inviteMessage}\n${url}` });
      }
    } catch {
      // The user dismissed the share sheet or no share target is available.
    }
  }

  async function copyInviteLink() {
    if (!eventId) return;

    try {
      await Clipboard.setStringAsync(buildSecretSantaJoinUrl(eventId));
      setMessage({ title: t("Link copied"), message: t("Invite link copied to clipboard.") });
    } catch {
      setMessage({ title: t("Copy failed"), message: t("Failed to copy invite link.") });
    }
  }

  function requestRemove(person: SecretSantaPerson | SecretSantaPendingInvite) {
    setRemoveTarget(
      "invite_id" in person
        ? { kind: "invite", id: person.invite_id, name: getSecretSantaPersonName(person, t) }
        : { kind: "participant", id: person.id, name: getSecretSantaPersonName(person, t) },
    );
  }

  function handleRemoveConfirm() {
    if (!removeTarget) return;

    const callbacks = {
      onSuccess: () => setRemoveTarget(null),
      onError: (error: Error) => {
        setRemoveTarget(null);
        setMessage({ title: t("Remove failed"), message: error.message });
      },
    };

    if (removeTarget.kind === "invite") {
      removeInvite.mutate({ eventId, inviteId: removeTarget.id }, callbacks);
    } else {
      removeParticipant.mutate({ eventId, userId: removeTarget.id }, callbacks);
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
                  onInvite={isOwner ? () => setSheet("invite") : shareInviteLink}
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
                      <SecretSantaGiftSuggestions
                        receiverId={data.my_receiver?.id}
                        budget={data.budget}
                        currency={data.currency}
                      />
                      <SecretSantaPeopleSection
                        title={t("Participants")}
                        emptyText={t("No participants have accepted yet.")}
                        emptyMascot="sad-alone"
                        people={participants}
                        ownerId={data.owner_id ?? undefined}
                      />
                    </>
                  ) : isOwner ? (
                    <>
                      <SecretSantaLaunchCard
                        canLaunch={canLaunch}
                        pendingInvitesCount={pendingInvites.length}
                        participantsCount={participants.length}
                        onLaunch={() => setSheet("launch")}
                        onInvite={() => setSheet("invite")}
                      />
                      <SecretSantaPeopleSection
                        title={t("People")}
                        emptyText={t("No one has joined yet. Invite friends to get started.")}
                        emptyMascot="sad-alone"
                        people={[...participants, ...pendingInvites]}
                        ownerId={data.owner_id ?? undefined}
                        onRemove={requestRemove}
                      />
                    </>
                  ) : (
                    <SecretSantaPeopleSection
                      title={t("Participants")}
                      emptyText={t("No participants have accepted yet.")}
                      emptyMascot="sad-alone"
                      people={participants}
                      ownerId={data.owner_id ?? undefined}
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
          <SecretSantaInviteSheet
            open={sheet === "invite"}
            eventId={eventId}
            eventName={data.name}
            excludedUserIds={[
              ...participants.map((person) => person.id),
              ...pendingInvites.map((person) => person.id),
            ]}
            onOpenChange={(open) => {
              if (!open) setSheet(null);
            }}
            onShareLink={shareInviteLink}
            onCopyLink={copyInviteLink}
            onInvited={() =>
              setMessage({
                title: t("Invites sent"),
                message: t("Your friends will get a notification to join."),
              })
            }
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
          <ActionBottomSheetConfirm
            open={Boolean(removeTarget)}
            title={removeTarget?.kind === "invite" ? t("Remove invite") : t("Remove participant")}
            message={t("Remove {name} from this Secret Santa?", {
              name: removeTarget?.name ?? "",
            })}
            confirmLabel={t("Remove")}
            tone="destructive"
            isPending={removeParticipant.isPending || removeInvite.isPending}
            onClose={() => setRemoveTarget(null)}
            onConfirm={handleRemoveConfirm}
          />
        </>
      ) : null}
      <ActionBottomSheetMessage message={message} onClose={() => setMessage(null)} />
    </>
  );
}
