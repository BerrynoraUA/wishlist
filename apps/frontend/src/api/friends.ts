import { supabaseBrowser } from "@/lib/supabase-browser";
import type {
  FriendRequest,
  FriendWithDetails,
  FriendRequestWithDetails,
  ProfileSearchResult,
} from "./types/friends";

export async function getIncomingFriendRequests({
  skip = 0,
  take = 10,
}: PaginationParams = {}): Promise<FriendRequestWithDetails[]> {
  const session = (await supabaseBrowser.auth.getSession()).data.session;
  const myUserId = session?.user.id;

  if (!myUserId) throw new Error('Not authenticated');

  const { data, error } = await supabaseBrowser.rpc(
    'get_incoming_friend_requests_with_details',
    {
      p_user_id: myUserId,
      p_skip: skip,
      p_take: take,
    }
  );

  if (error) throw error;

  return data ?? [];
}

export async function getOutgoingFriendRequests({
  skip = 0,
  take = 10,
}: PaginationParams = {}): Promise<FriendRequestWithDetails[]> {
  const session = (await supabaseBrowser.auth.getSession()).data.session;
  const myUserId = session?.user.id;

  if (!myUserId) throw new Error('Not authenticated');

  const { data, error } = await supabaseBrowser.rpc(
    'get_outgoing_friend_requests_with_details',
    {
      p_user_id: myUserId,
      p_skip: skip,
      p_take: take,
    }
  );

  if (error) throw error;

  return data ?? [];
}

export async function sendFriendRequest(
  receiverId: string,
): Promise<FriendRequest> {
  const {
    data: { session },
    error: sessionError,
  } = await supabaseBrowser.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error("Not authenticated");

  if (session.user.id === receiverId) {
    throw new Error("Cannot send friend request to yourself");
  }

  const { data, error } = await supabaseBrowser
    .from("friend_requests")
    .insert({
      sender_id: session.user.id,
      receiver_id: receiverId,
      status: 0,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabaseBrowser.rpc("accept_friend_request", {
    p_request_id: requestId,
  });

  if (error) throw error;
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabaseBrowser.rpc("reject_friend_request", {
    p_request_id: requestId,
  });

  if (error) throw error;
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  const {
    data: { session },
    error: sessionError,
  } = await supabaseBrowser.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error("Not authenticated");

  const { error } = await supabaseBrowser
    .from("friend_requests")
    .delete()
    .eq("id", requestId)
    .eq("sender_id", session.user.id);

  if (error) throw error;
}

export async function getFriends({
  skip = 0,
  take = 10,
}: PaginationParams = {}): Promise<FriendWithDetails[]> {
  const session = (await supabaseBrowser.auth.getSession()).data.session;
  const myUserId = session?.user.id;

  if (!myUserId) throw new Error('Not authenticated');

  const { data, error } = await supabaseBrowser.rpc('get_friends_with_details', {
    p_user_id: myUserId,
    p_skip: skip,
    p_take: take,
  });

  if (error) throw error;

  return data ?? [];
}

export async function searchProfilesByNickname({
  query,
  skip = 0,
  take = 20,
}: {
  query: string;
  skip?: number;
  take?: number;
}): Promise<ProfileSearchResult[]> {
  const session = (await supabaseBrowser.auth.getSession()).data.session;
  const myUserId = session?.user?.id;

  if (!myUserId) throw new Error("Not authenticated");

  const trimmed = query?.trim();
  if (!trimmed) return [];

  const { data, error } = await supabaseBrowser.rpc(
    "search_profiles_by_nickname",
    {
      p_query: trimmed,
      p_skip: skip,
      p_take: take,
    },
  );

  if (error) throw error;

  return data ?? [];
}

export async function checkFriendship(userId: string): Promise<boolean> {
  const {
    data: { session },
    error: sessionError,
  } = await supabaseBrowser.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error("Not authenticated");

  const { data, error } = await supabaseBrowser
    .from("friends")
    .select("id")
    .or(
      `and(user_f.eq.${session.user.id},user_s.eq.${userId}),and(user_f.eq.${userId},user_s.eq.${session.user.id})`,
    )
    .maybeSingle();

  if (error) throw error;

  return !!data;
}

export async function removeFriend(userId: string): Promise<void> {
  const {
    data: { session },
    error: sessionError,
  } = await supabaseBrowser.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error("Not authenticated");

  const { error } = await supabaseBrowser
    .from("friends")
    .delete()
    .or(
      `and(user_f.eq.${session.user.id},user_s.eq.${userId}),and(user_f.eq.${userId},user_s.eq.${session.user.id})`,
    );

  if (error) throw error;
}
