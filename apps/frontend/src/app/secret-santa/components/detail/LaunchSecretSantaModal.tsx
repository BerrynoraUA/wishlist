"use client";

import { useState, useMemo, useCallback } from "react";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import type { SecretSantaPerson } from "@/api/types/secret-santa";
import type { SecretSantaExclusion } from "@/api/types/secret-santa";
import { generateSecretSantaAssignment } from "@/api/secret-santa";
import { useLaunchSecretSanta } from "@/hooks/use-secret-santa";
import { SecretSantaPersonAvatar } from "./SecretSantaPersonAvatar";
import {
  Ban,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import styles from "./LaunchSecretSantaModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  eventId: string;
  participants: SecretSantaPerson[];
};

export function LaunchSecretSantaModal({
  open,
  onClose,
  eventId,
  participants,
}: Props) {
  const t = useGT();
  // exclusions[giverId] = Set of receiverIds they must NOT get
  const [exclusions, setExclusions] = useState<Record<string, Set<string>>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const launch = useLaunchSecretSanta();

  const toggleExclusion = useCallback((giverId: string, excludedId: string) => {
    setExclusions((prev) => {
      const next = { ...prev };
      const set = new Set(prev[giverId] ?? []);
      if (set.has(excludedId)) {
        set.delete(excludedId);
      } else {
        set.add(excludedId);
      }
      next[giverId] = set;
      return next;
    });
  }, []);

  const exclusionList: SecretSantaExclusion[] = useMemo(
    () =>
      Object.entries(exclusions)
        .filter(([, set]) => set.size > 0)
        .map(([user_id, set]) => ({ user_id, excluded_ids: [...set] })),
    [exclusions],
  );

  // Pre-validate feasibility on the client
  const validationError = useMemo(() => {
    if (participants.length < 2)
      return t("At least 2 participants required.", {
        $id: "secretSanta.launchModal.error.minParticipants",
      });

    const ids = participants.map((p) => p.id);
    const exMap = new Map<string, Set<string>>();
    for (const ex of exclusionList) {
      exMap.set(ex.user_id, new Set(ex.excluded_ids));
    }

    const result = generateSecretSantaAssignment(ids, exMap, 200);
    return result
      ? null
      : t("These exclusions make a valid assignment impossible.", {
          $id: "secretSanta.launchModal.error.impossibleExclusions",
        });
  }, [participants, exclusionList, t]);

  function handleLaunch() {
    launch.mutate(
      { event_id: eventId, exclusions: exclusionList },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  }

  function getName(person: SecretSantaPerson) {
    return (
      person.display_name ??
      person.nickname ??
      t("User", { $id: "secretSanta.launchModal.fallbackUser" })
    );
  }

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Launch Secret Santa", {
        $id: "secretSanta.launchModal.title",
      })}
    >
      <div className={styles.container}>
        <p className={styles.subtitle}>
          {t("Optionally choose who should ", {
            $id: "secretSanta.launchModal.subtitleBefore",
          })}
          <strong>
            {t("not", { $id: "secretSanta.launchModal.subtitleEmphasis" })}
          </strong>
          {t(" be matched together, then launch the event.", {
            $id: "secretSanta.launchModal.subtitleAfter",
          })}
        </p>

        <div className={styles.participantList}>
          {participants.map((giver) => {
            const isExpanded = expandedId === giver.id;
            const excluded = exclusions[giver.id] ?? new Set<string>();
            const others = participants.filter((p) => p.id !== giver.id);

            return (
              <div key={giver.id} className={styles.giverBlock}>
                <button
                  type="button"
                  className={styles.giverRow}
                  onClick={() => setExpandedId(isExpanded ? null : giver.id)}
                >
                  <SecretSantaPersonAvatar person={giver} />
                  <span className={styles.giverName}>{getName(giver)}</span>
                  {excluded.size > 0 && (
                    <span className={styles.excludedCount}>
                      <Ban size={12} />
                      {excluded.size}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp size={16} className={styles.chevron} />
                  ) : (
                    <ChevronDown size={16} className={styles.chevron} />
                  )}
                </button>

                {isExpanded && (
                  <div className={styles.exclusionGrid}>
                    {others.map((other) => {
                      const isExcluded = excluded.has(other.id);
                      return (
                        <button
                          key={other.id}
                          type="button"
                          className={
                            isExcluded
                              ? styles.personChipExcluded
                              : styles.personChip
                          }
                          onClick={() => toggleExclusion(giver.id, other.id)}
                        >
                          <SecretSantaPersonAvatar person={other} />
                          <span>{getName(other)}</span>
                          {isExcluded && <Ban size={12} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {validationError && (
          <div className={styles.warning}>
            <AlertTriangle size={14} />
            <span>{validationError}</span>
          </div>
        )}

        {launch.isError && (
          <div className={styles.warning}>
            <AlertTriangle size={14} />
            <span>
              {(launch.error as Error)?.message ??
                t("Failed to launch event.", {
                  $id: "secretSanta.launchModal.error.launchFailed",
                })}
            </span>
          </div>
        )}

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            {t("Cancel", { $id: "secretSanta.launchModal.cancel" })}
          </Button>
          <Button
            onClick={handleLaunch}
            disabled={!!validationError || launch.isPending}
          >
            <Sparkles size={16} />
            <span>
              {launch.isPending
                ? t("Launching...", {
                    $id: "secretSanta.launchModal.launching",
                  })
                : t("Start", { $id: "secretSanta.launchModal.start" })}
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
