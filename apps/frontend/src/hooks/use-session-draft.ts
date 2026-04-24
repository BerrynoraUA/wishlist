"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  SESSION_DRAFT_CHANGE_EVENT,
  type SessionDraftDescriptor,
  type SessionDraftKind,
} from "@/types/session-storage";
import {
  buildSessionDraftKey,
  clearSessionDraft,
  hasSessionDraft,
  readSessionDraft,
  writeSessionDraft,
} from "@/lib/session-drafts";

type UseSessionDraftOptions<T> = {
  userId?: string | null;
  kind: SessionDraftKind;
  scopeId?: string | null;
  open: boolean;
  value: T;
  onRestore: (draft: T) => void;
  isMeaningful: (draft: T) => boolean;
  debounceMs?: number;
};

function useDraftDescriptor(
  userId: string | null | undefined,
  kind: SessionDraftKind,
  scopeId?: string | null,
) {
  return useMemo<SessionDraftDescriptor | null>(() => {
    if (!userId) {
      return null;
    }

    return { userId, kind, scopeId };
  }, [kind, scopeId, userId]);
}

export function useSessionDraft<T>({
  userId,
  kind,
  scopeId,
  open,
  value,
  onRestore,
  isMeaningful,
  debounceMs = 250,
}: UseSessionDraftOptions<T>) {
  const descriptor = useDraftDescriptor(userId, kind, scopeId);
  const descriptorKey = descriptor ? buildSessionDraftKey(descriptor) : "";
  const restoreHandlerRef = useRef(onRestore);
  const meaningfulCheckRef = useRef(isMeaningful);
  const hydratedRef = useRef(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  useEffect(() => {
    restoreHandlerRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    meaningfulCheckRef.current = isMeaningful;
  }, [isMeaningful]);

  useEffect(() => {
    hydratedRef.current = false;
    setHasDraft(false);
    setIsDraftRestored(false);
    setLastSavedAt(null);
  }, [descriptorKey]);

  useEffect(() => {
    if (!descriptor || !open || hydratedRef.current) {
      return;
    }

    hydratedRef.current = true;
    const storedDraft = readSessionDraft<T>(descriptor);

    if (storedDraft && meaningfulCheckRef.current(storedDraft.data)) {
      restoreHandlerRef.current(storedDraft.data);
      setHasDraft(true);
      setIsDraftRestored(true);
      setLastSavedAt(storedDraft.updatedAt);
      return;
    }

    setHasDraft(false);
    setIsDraftRestored(false);
    setLastSavedAt(null);
  }, [descriptor, open]);

  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      setIsDraftRestored(false);
    }
  }, [open]);

  useEffect(() => {
    if (!descriptor || !hydratedRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (meaningfulCheckRef.current(value)) {
        const nextSavedAt = Date.now();
        writeSessionDraft(descriptor, value);
        setHasDraft(true);
        setLastSavedAt(nextSavedAt);
        return;
      }

      clearSessionDraft(descriptor);
      setHasDraft(false);
      setLastSavedAt(null);
    }, debounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [debounceMs, descriptor, value]);

  function clearDraft() {
    if (!descriptor) {
      return;
    }

    clearSessionDraft(descriptor);
    setHasDraft(false);
    setIsDraftRestored(false);
    setLastSavedAt(null);
  }

  return {
    hasDraft,
    isDraftRestored,
    lastSavedAt,
    clearDraft,
  };
}

type UseSessionDraftPresenceOptions = {
  userId?: string | null;
  kind: SessionDraftKind;
  scopeId?: string | null;
};

export function useSessionDraftPresence({ userId, kind, scopeId }: UseSessionDraftPresenceOptions) {
  const descriptor = useDraftDescriptor(userId, kind, scopeId);
  const descriptorKey = descriptor ? buildSessionDraftKey(descriptor) : "";
  const [hasDraft, setHasDraft] = useState(() =>
    descriptor ? hasSessionDraft(descriptor) : false,
  );

  useEffect(() => {
    setHasDraft(descriptor ? hasSessionDraft(descriptor) : false);
  }, [descriptor, descriptorKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function syncPresence() {
      setHasDraft(descriptor ? hasSessionDraft(descriptor) : false);
    }

    window.addEventListener(SESSION_DRAFT_CHANGE_EVENT, syncPresence);
    return () => {
      window.removeEventListener(SESSION_DRAFT_CHANGE_EVENT, syncPresence);
    };
  }, [descriptor]);

  return hasDraft;
}
