"use client";

import { Suspense } from "react";
import { SecretSantaPageShell } from "./components/secret-santa-page-shell/SecretSantaPageShell";
import { SecretSantaHeader } from "./components/secret-santa-header/SecretSantaHeader";
import { SecretSantaGrid } from "./components/secret-santa-grid/SecretSantaGrid";
import { CreateSecretSantaModal } from "./components/create-secret-santa-modal/CreateSecretSantaModal";
import { useSecretSantaListPage } from "./hooks/use-secret-santa-list-page";

function SecretSantaPageContent() {
  const { createOpen, setCreateOpen, hasCreateDraft } = useSecretSantaListPage();

  return (
    <SecretSantaPageShell>
      <SecretSantaHeader onNewEvent={() => setCreateOpen(true)} hasDraft={hasCreateDraft} />
      <SecretSantaGrid />
      <CreateSecretSantaModal open={createOpen} onClose={() => setCreateOpen(false)} />
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
