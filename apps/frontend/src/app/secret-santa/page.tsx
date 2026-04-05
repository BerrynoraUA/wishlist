"use client";

import { Suspense, useState } from "react";
import { useGT } from "gt-next";
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
  const t = useGT();
  return (
    <Suspense
      fallback={
        <SecretSantaPageShell>
          <p>
            {t("Loading Secret Santa...", {
              $id: "secretSanta.page.loading",
            })}
          </p>
        </SecretSantaPageShell>
      }
    >
      <SecretSantaPageContent />
    </Suspense>
  );
}
