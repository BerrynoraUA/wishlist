"use client";

import { useMemo, useState } from "react";
import { useGT } from "gt-next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { SecretSantaPendingInvite } from "@/api/types/secret-santa";
import { SecretSantaPageShell } from "@/app/secret-santa/components/SecretSantaPageShell";
import { SecretSantaDetailHero } from "@/app/secret-santa/components/detail/SecretSantaDetailHero";
import { SecretSantaLaunchCard } from "@/app/secret-santa/components/detail/SecretSantaLaunchCard";
import { LaunchSecretSantaModal } from "@/app/secret-santa/components/detail/LaunchSecretSantaModal";
import { SecretSantaPeopleSection } from "@/app/secret-santa/components/detail/SecretSantaPeopleSection";
import { SecretSantaReceiverCard } from "@/app/secret-santa/components/detail/SecretSantaReceiverCard";
import { SecretSantaGiftSuggestions } from "@/app/secret-santa/components/detail/SecretSantaGiftSuggestions";
import { EditSecretSantaModal } from "@/app/secret-santa/components/EditSecretSantaModal";
import { getAccentFromId } from "@/app/secret-santa/components/detail/secretSantaDetail.utils";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal/DeleteConfirmModal";
import {
  useDeleteSecretSantaEvent,
  useRemoveSecretSantaInvite,
  useRemoveSecretSantaParticipant,
  useSecretSantaDetails,
} from "@/hooks/use-secret-santa";
import { useCurrentUserId } from "@/hooks/use-user";
import styles from "./SecretSantaDetailPage.module.scss";

export default function SecretSantaDetailPage() {
  const t = useGT();
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { data: currentUserId = "" } = useCurrentUserId();
  const { data, isLoading, isError } = useSecretSantaDetails(eventId);
  const removeParticipant = useRemoveSecretSantaParticipant();
  const removeInvite = useRemoveSecretSantaInvite();
  const deleteEvent = useDeleteSecretSantaEvent();
  const [copied, setCopied] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const peopleParticipants = useMemo(
    () =>
      (data?.participants ?? []).map((person) => ({
        ...person,
        key: person.id,
        subtitle: person.nickname
          ? `@${person.nickname}`
          : t("Wishlane member", { $id: "secretSanta.detail.wishlyMember" }),
      })),
    [data?.participants, t],
  );

  const peoplePending = useMemo(
    () =>
      (data?.pending_invites ?? []).map((person: SecretSantaPendingInvite) => ({
        ...person,
        key: person.invite_id,
        subtitle: person.nickname
          ? `@${person.nickname}`
          : t("Invitation pending", {
              $id: "secretSanta.detail.invitationPending",
            }),
        badge: t("Pending", { $id: "secretSanta.detail.pendingBadge" }),
      })),
    [data?.pending_invites, t],
  );

  if (isLoading) {
    return null;
  }

  if (isError || !data) {
    return (
      <SecretSantaPageShell>
        <p className={styles.message}>
          {t("Failed to load Secret Santa event.", {
            $id: "secretSanta.detail.loadError",
          })}
        </p>
      </SecretSantaPageShell>
    );
  }

  const isOwner = !!currentUserId && currentUserId === data.owner_id;
  const isStarted = !!data.is_started;
  const participants = data.participants ?? [];
  const pendingInvites = data.pending_invites ?? [];
  const totalPeople = participants.length + pendingInvites.length;
  const canLaunch = pendingInvites.length === 0 && participants.length >= 2;
  const participantsSection = (
    <SecretSantaPeopleSection
      title={t("Participants", { $id: "secretSanta.detail.participantsTitle" })}
      description={t(
        "Everyone in the event can see accepted participants.",
        { $id: "secretSanta.detail.participantsDescription" },
      )}
      emptyText={t("No participants have accepted yet.", {
        $id: "secretSanta.detail.participantsEmpty",
      })}
      people={peopleParticipants}
      onRemove={
        isOwner && !isStarted
          ? (userId) => removeParticipant.mutate({ eventId, userId })
          : undefined
      }
      removeLabel={t("Remove participant", {
        $id: "secretSanta.detail.removeParticipant",
      })}
    />
  );

  function handleCopyLink() {
    const url = `${window.location.origin}/secret-santa/join?event=${eventId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <SecretSantaPageShell>
      <div className={styles.shell}>
        <Link href="/secret-santa" className={styles.backLink}>
          <ArrowLeft size={15} />
          <span>
            {t("Back to events", { $id: "secretSanta.detail.backToEvents" })}
          </span>
        </Link>

        <SecretSantaDetailHero
          event={data}
          accent={getAccentFromId(data.id)}
          isOwner={isOwner}
          totalPeople={totalPeople}
          copied={copied}
          onCopyLink={handleCopyLink}
          onEdit={isOwner ? () => setEditOpen(true) : undefined}
          onDelete={isOwner ? () => setDeleteOpen(true) : undefined}
        />

        <div className={styles.layout}>
          {isStarted ? (
            <div className={styles.startedLayout}>
              <div className={styles.startedTopRow}>
                <div className={styles.startedMainColumn}>
                  {participantsSection}
                </div>

                {data.my_receiver && (
                  <aside className={styles.startedSidebar}>
                    <SecretSantaReceiverCard receiver={data.my_receiver} />
                  </aside>
                )}
              </div>

              <div className={styles.startedItemsRow}>
                <SecretSantaGiftSuggestions
                  budget={data.budget}
                  receiverId={data.my_receiver?.id}
                />
              </div>
            </div>
          ) : isOwner ? (
            <div className={styles.ownerLayout}>
              <div className={styles.mainColumn}>
                {participantsSection}

                <SecretSantaPeopleSection
                  title={t("Pending invites", {
                    $id: "secretSanta.detail.pendingTitle",
                  })}
                  description={t(
                    "These people still need to accept the invite.",
                    { $id: "secretSanta.detail.pendingDescription" },
                  )}
                  emptyText={t("No pending invites.", {
                    $id: "secretSanta.detail.pendingEmpty",
                  })}
                  people={peoplePending}
                  onRemove={(inviteId) =>
                    removeInvite.mutate({ eventId, inviteId })
                  }
                  removeLabel={t("Remove invite", {
                    $id: "secretSanta.detail.removeInvite",
                  })}
                />
              </div>

              <aside className={styles.sidebarColumn}>
                <SecretSantaLaunchCard
                  canLaunch={canLaunch}
                  pendingInvitesCount={pendingInvites.length}
                  participantsCount={participants.length}
                  onLaunch={() => setLaunchOpen(true)}
                />
              </aside>
            </div>
          ) : (
            <div className={styles.topRow}>{participantsSection}</div>
          )}
        </div>

        <LaunchSecretSantaModal
          open={launchOpen}
          onClose={() => setLaunchOpen(false)}
          eventId={eventId}
          participants={participants}
        />

        <EditSecretSantaModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          event={data}
        />

        <DeleteConfirmModal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => {
            deleteEvent.mutate(eventId, {
              onSuccess: () => router.push("/secret-santa"),
            });
          }}
          title={t("Delete Event", {
            $id: "secretSanta.detail.deleteModalTitle",
          })}
          description={t(
            "Are you sure you want to delete this Secret Santa event? This action cannot be undone.",
            { $id: "secretSanta.detail.deleteModalDescription" },
          )}
          confirmLabel={t("Delete Event", {
            $id: "secretSanta.detail.deleteModalConfirm",
          })}
          isPending={deleteEvent.isPending}
        />
      </div>
    </SecretSantaPageShell>
  );
}
