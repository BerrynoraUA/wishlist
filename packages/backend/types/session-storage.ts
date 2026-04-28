export type SessionDraftKind =
  | "create-item"
  | "edit-item"
  | "create-wishlist"
  | "edit-wishlist"
  | "create-secret-santa";

export type SessionDraftDescriptor = {
  userId: string;
  kind: SessionDraftKind;
  scopeId?: string | null;
};

export type StoredSessionDraft<T> = {
  updatedAt: number;
  data: T;
};

export const STORAGE_PREFIX = "wishlist:session-draft:v1";
export const GLOBAL_SCOPE = "global";
export const SESSION_DRAFT_CHANGE_EVENT = "wishlist:session-draft-change";
