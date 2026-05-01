import {
  StoredSessionDraft,
  SessionDraftDescriptor,
  SESSION_DRAFT_CHANGE_EVENT,
  GLOBAL_SCOPE,
  STORAGE_PREFIX,
} from "@/types/session-storage";

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function notifySessionDraftChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(SESSION_DRAFT_CHANGE_EVENT));
}

function getScopeId(scopeId?: string | null) {
  const normalized = scopeId?.trim();
  return normalized ? normalized : GLOBAL_SCOPE;
}

export function createSessionDraftScope(...parts: Array<string | null | undefined>) {
  const normalized = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return normalized.length ? normalized.join("::") : GLOBAL_SCOPE;
}

export function buildSessionDraftKey({ userId, kind, scopeId }: SessionDraftDescriptor) {
  return `${STORAGE_PREFIX}:${userId}:${kind}:${getScopeId(scopeId)}`;
}

export function readSessionDraft<T>(descriptor: SessionDraftDescriptor) {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const key = buildSessionDraftKey(descriptor);
  const rawValue = storage.getItem(key);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredSessionDraft<T>;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function writeSessionDraft<T>(descriptor: SessionDraftDescriptor, data: T) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const payload: StoredSessionDraft<T> = {
    updatedAt: Date.now(),
    data,
  };

  storage.setItem(buildSessionDraftKey(descriptor), JSON.stringify(payload));
  notifySessionDraftChange();
}

export function clearSessionDraft(descriptor: SessionDraftDescriptor) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(buildSessionDraftKey(descriptor));
  notifySessionDraftChange();
}

export function hasSessionDraft(descriptor: SessionDraftDescriptor) {
  return readSessionDraft(descriptor) !== null;
}

export function listSessionDraftKeys(userId?: string | null) {
  const storage = getStorage();

  if (!storage) {
    return [] as string[];
  }

  const userPrefix = userId ? `${STORAGE_PREFIX}:${userId}:` : STORAGE_PREFIX;

  return Object.keys(storage).filter((key) => key.startsWith(userPrefix));
}

export function clearSessionDraftsForUser(userId: string) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const keys = listSessionDraftKeys(userId);
  for (const key of keys) {
    storage.removeItem(key);
  }

  if (keys.length > 0) {
    notifySessionDraftChange();
  }
}

export function clearAllSessionDrafts() {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const keys = listSessionDraftKeys();
  for (const key of keys) {
    storage.removeItem(key);
  }

  if (keys.length > 0) {
    notifySessionDraftChange();
  }
}
