"use client";

import { Suspense, useState } from "react";
import { SecretSantaPageShell } from "./components/SecretSantaPageShell";
import { SecretSantaHeader } from "./components/SecretSantaHeader";
import { SecretSantaGrid } from "./components/SecretSantaGrid";
import { CreateSecretSantaModal } from "./components/CreateSecretSantaModal";

function SecretSantaPageContent() {
  const [open, setOpen] = useState(false);

  return (
    <SecretSantaPageShell>
      <SecretSantaHeader onNewEvent={() => setOpen(true)} />
      <SecretSantaGrid />
      <CreateSecretSantaModal open={open} onClose={() => setOpen(false)} />
    </SecretSantaPageShell>
  );
}

export default function SecretSantaPage() {
  return (
    <Suspense
      fallback={
        <SecretSantaPageShell>
          <p>Loading Secret Santa...</p>
        </SecretSantaPageShell>
      }
    >
      <SecretSantaPageContent />
    </Suspense>
  );
}
