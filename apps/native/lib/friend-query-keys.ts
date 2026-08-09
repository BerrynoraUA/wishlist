export type FriendPaginationParams = {
  skip?: number;
  take?: number;
  search?: string;
};

export const friendKeys = {
  all: ["friends"] as const,
  lists: () => [...friendKeys.all, "list"] as const,
  list: (authUserId: string | null | undefined, params?: FriendPaginationParams) =>
    [...friendKeys.lists(), "finite", authUserId ?? "anonymous", params] as const,
  infiniteList: (authUserId: string | null | undefined, params?: FriendPaginationParams) =>
    [...friendKeys.lists(), "infinite", authUserId ?? "anonymous", params] as const,
  requests: () => [...friendKeys.all, "requests"] as const,
  incoming: (authUserId: string | null | undefined, params?: FriendPaginationParams) =>
    [...friendKeys.requests(), "incoming", authUserId ?? "anonymous", params] as const,
  outgoing: (authUserId: string | null | undefined, params?: FriendPaginationParams) =>
    [...friendKeys.requests(), "outgoing", authUserId ?? "anonymous", params] as const,
  search: (authUserId: string | null | undefined, query: string, params?: FriendPaginationParams) =>
    [...friendKeys.all, "search", authUserId ?? "anonymous", query, params] as const,
  groups: () => [...friendKeys.all, "groups"] as const,
  groupList: (authUserId: string | null | undefined, params?: FriendPaginationParams) =>
    [...friendKeys.groups(), "finite", authUserId ?? "anonymous", params] as const,
  infiniteGroupList: (authUserId: string | null | undefined, params?: FriendPaginationParams) =>
    [...friendKeys.groups(), "infinite", authUserId ?? "anonymous", params] as const,
  groupMembers: (authUserId: string | null | undefined, groupId?: string) =>
    [...friendKeys.groups(), "members", authUserId ?? "anonymous", groupId] as const,
  groupMembersRoot: () => [...friendKeys.groups(), "members"] as const,
  check: (authUserId: string | null | undefined, userId: string) =>
    [...friendKeys.all, "check", authUserId ?? "anonymous", userId] as const,
  profilesByIds: (authUserId: string | null | undefined, idsKey: string) =>
    [...friendKeys.all, "profiles-by-ids", authUserId ?? "anonymous", idsKey] as const,
};
