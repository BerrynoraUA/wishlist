"use client";

import { useCallback, useMemo, useState } from "react";
import { useGT } from "gt-next";
import { toast } from "sonner";
import { useSecretSantaDetails } from "@/hooks/use-secret-santa";
import { useCurrentUserId } from "@/hooks/use-user";
import type { SecretSantaPendingInvite } from "@/api/types/secret-santa";
import { buildSecretSantaJoinUrl } from "../helpers";
import { COPY_FEEDBACK_DURATION_MS, MIN_PARTICIPANTS_TO_LAUNCH } from "../constants";

/**
 * Encapsulates the Secret Santa detail page: data query, modal state,
 * participant/pending-invite view-model projection, copy-link handler, and
 * derived `canLaunch` / `isOwner` / `isStarted` flags.
 */
export function useSecretSantaDetailPage(eventId: string) {
  const t = useGT();
  const { data: currentUserId = "" } = useCurrentUserId();
  const detailsQuery = useSecretSantaDetails(eventId);

  const [launchOpen, setLaunchOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const data = detailsQuery.data;

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

  const handleCopyLink = useCallback(() => {
    const url = buildSecretSantaJoinUrl(eventId);
    if (!url) return;
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        window.setTimeout(() => {
          setCopied(false);
        }, COPY_FEEDBACK_DURATION_MS);
        toast.success(
          t("Link copied", {
            $id: "secretSanta.detail.linkCopied",
          }),
        );
      },
      () => {
        toast.error(
          t("Failed to copy invite link", {
            $id: "secretSanta.detail.copyFailed",
          }),
        );
      },
    );
  }, [eventId, t]);

  const isOwner = !!currentUserId && currentUserId === data?.owner_id;
  const isStarted = !!data?.is_started;
  const participants = data?.participants ?? [];
  const pendingInvites = data?.pending_invites ?? [];
  const totalPeople = participants.length + pendingInvites.length;
  const canLaunch =
    pendingInvites.length === 0 && participants.length >= MIN_PARTICIPANTS_TO_LAUNCH;

  return {
    data,
    isLoading: detailsQuery.isLoading,
    isError: detailsQuery.isError,
    peopleParticipants,
    peoplePending,
    participants,
    pendingInvites,
    totalPeople,
    canLaunch,
    isOwner,
    isStarted,
    launchOpen,
    setLaunchOpen,
    editOpen,
    setEditOpen,
    deleteOpen,
    setDeleteOpen,
    copied,
    handleCopyLink,
  };
}
