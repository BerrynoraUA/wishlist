import "server-only";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/* =======================
   ENV
======================= */

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL) as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env
  .SUPABASE_SERVICE_ROLE_KEY as string;
const SUPABASE_ANON_KEY = (process.env
  .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase env variables");
}

/* =======================
   CLIENT
======================= */

const adminClient: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);

const anonClient: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);

/* =======================
   TYPES
======================= */

type User = {
  id: string;
  email: string | null;
};

type FriendRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: number;
};

type Wishlist = {
  id: string;
  user_id: string;
  name: string;
};

/* =======================
   HELPERS
======================= */

const TEST_PASSWORD = "password123";

async function resetTables(): Promise<void> {
  const tables = ["item", "wishlist", "friends", "friend_requests"] as const;

  for (const table of tables) {
    const { error } = await adminClient
      .from(table)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) throw error;
  }
}

async function createUser(email: string): Promise<User> {
  const { data: usersData, error: listError } =
    await adminClient.auth.admin.listUsers({ perPage: 200 });

  if (listError) throw listError;

  const existingUser = usersData.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );

  if (existingUser) {
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      existingUser.id,
    );

    if (deleteError) throw deleteError;
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (error || !data.user) throw error;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}

async function sendFriendRequest(
  senderId: string,
  receiverId: string,
): Promise<void> {
  const { error } = await adminClient.from("friend_requests").insert({
    sender_id: senderId,
    receiver_id: receiverId,
    status: 0,
  });

  if (error) throw error;
}

async function acceptFriendRequest(
  requestId: string,
  receiverEmail: string,
): Promise<void> {
  const { error: signInError } = await anonClient.auth.signInWithPassword({
    email: receiverEmail,
    password: TEST_PASSWORD,
  });

  if (signInError) throw signInError;

  const { error } = await anonClient.rpc("accept_friend_request", {
    p_request_id: requestId,
  });

  if (error) throw error;
}

async function createWishlist(
  userId: string,
  name: string,
  access = true,
): Promise<Wishlist> {
  const { data, error } = await adminClient
    .from("wishlist")
    .insert({
      user_id: userId,
      name,
      description: `${name} description`,
      access,
    })
    .select()
    .single();

  if (error || !data) throw error;

  return data;
}

async function createItems(wishlistId: string): Promise<void> {
  const items = [
    {
      wishlist_id: wishlistId,
      name: "Item 1",
      description: "First item",
      price: "$10",
      priority: 1,
    },
    {
      wishlist_id: wishlistId,
      name: "Item 2",
      description: "Second item",
      price: "$20",
      priority: 2,
    },
  ];

  const { error } = await adminClient.from("item").insert(items);
  if (error) throw error;
}

/* =======================
   PUBLIC API 
======================= */

export async function runSeed(): Promise<void> {
  await resetTables();

  const user1 = await createUser("user1@test.com");
  const user2 = await createUser("user2@test.com");

  await sendFriendRequest(user1.id, user2.id);

  const { data: request, error } = await adminClient
    .from("friend_requests")
    .select("*")
    .single<FriendRequest>();

  if (error || !request) throw error;

  await acceptFriendRequest(request.id, user2.email ?? "user2@test.com");

  const wishlist1 = await createWishlist(user1.id, "User 1 Wishlist");
  const wishlist2 = await createWishlist(user2.id, "User 2 Wishlist");

  await createItems(wishlist1.id);
  await createItems(wishlist2.id);
}
