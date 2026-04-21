"use client";

import { Suspense, useState } from "react";
import { SecretSantaPageShell } from "./components/SecretSantaPageShell";
import { SecretSantaHeader } from "./components/SecretSantaHeader";
import { SecretSantaGrid } from "./components/SecretSantaGrid";
import { CreateSecretSantaModal } from "./components/CreateSecretSantaModal";
import { useSessionDraftPresence } from "@/hooks/use-session-draft";
import { useCurrentUserId } from "@/hooks/use-user";

function SecretSantaPageContent() {
  const { data: currentUserId = "" } = useCurrentUserId();
  const [open, setOpen] = useState(false);
  const hasCreateDraft = useSessionDraftPresence({
    userId: currentUserId,
    kind: "create-secret-santa",
  });

  return (
    <SecretSantaPageShell>
      <SecretSantaHeader
        onNewEvent={() => setOpen(true)}
        hasDraft={hasCreateDraft}
      />
      <SecretSantaGrid />
      <CreateSecretSantaModal open={open} onClose={() => setOpen(false)} />
    </SecretSantaPageShell>
  );
}

export default function SecretSantaPage() {
  return (
    <Suspense fallback={null}>
      <SecretSantaPageContent />
    </Suspense>
  );
}
