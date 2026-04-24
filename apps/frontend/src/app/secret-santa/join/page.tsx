"use client";

import { useGT } from "gt-next";
import { SecretSantaJoinStatus } from "@/app/secret-santa/components/secret-santa-join-status/SecretSantaJoinStatus";
import { SecretSantaPageShell } from "@/app/secret-santa/components/secret-santa-page-shell/SecretSantaPageShell";
import { useSecretSantaJoinPage } from "../hooks/use-secret-santa-join-page";

export default function SecretSantaJoinPage() {
  const t = useGT();
  const { eventId } = useSecretSantaJoinPage();

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
