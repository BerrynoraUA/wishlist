"use client";

import { useState } from "react";
import { useSessionDraftPresence } from "@/hooks/use-session-draft";
import { useCurrentUserId } from "@/hooks/use-user";

/**
 * Owns the Secret Santa list page state: the "create event" modal flag and
 * the draft-presence indicator.
 */
export function useSecretSantaListPage() {
  const { data: currentUserId = "" } = useCurrentUserId();
  const [createOpen, setCreateOpen] = useState(false);
  const hasCreateDraft = useSessionDraftPresence({
    userId: currentUserId,
    kind: "create-secret-santa",
  });

  return { createOpen, setCreateOpen, hasCreateDraft };
}
