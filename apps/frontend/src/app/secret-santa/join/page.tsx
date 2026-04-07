"use client";

import { useEffect, useRef } from "react";
import { useGT } from "gt-next";
import { useRouter, useSearchParams } from "next/navigation";
import { SecretSantaJoinStatus } from "@/app/secret-santa/components/SecretSantaJoinStatus";
import { SecretSantaPageShell } from "@/app/secret-santa/components/SecretSantaPageShell";
import { useJoinSecretSantaEvent } from "@/hooks/use-secret-santa";

export default function SecretSantaJoinPage() {
  const t = useGT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");
  const joinMutation = useJoinSecretSantaEvent();
  const attempted = useRef(false);

  useEffect(() => {
    if (!eventId || attempted.current) return;
    attempted.current = true;

    joinMutation.mutate(eventId, {
      onSuccess: () => {
        router.replace(`/secret-santa/${eventId}`);
      },
      onError: () => {
        router.replace(`/secret-santa/${eventId}`);
      },
    });
  }, [eventId, joinMutation, router]);

  if (!eventId) {
    return (
      <SecretSantaPageShell narrow>
        <SecretSantaJoinStatus
          message={t("Invalid invite link.", {
            $id: "secretSanta.join.invalidLink",
          })}
        />
      </SecretSantaPageShell>
    );
  }

  return (
    <SecretSantaPageShell narrow>
      <SecretSantaJoinStatus
        message={t("Joining event...", {
          $id: "secretSanta.join.joining",
        })}
      />
    </SecretSantaPageShell>
  );
}
