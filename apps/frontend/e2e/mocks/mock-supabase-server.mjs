/**
 * Lightweight mock Supabase server for E2E tests.
 *
 * Handles Auth, REST (RPC + table queries) and Storage endpoints.
 * Runs on port 54321 (default Supabase local dev port).
 *
 * All responses return mock data so tests run fully offline
 * without a real Supabase instance.
 */

import http from "node:http";

/* ────── Mock data (inline for zero-dep execution) ────── */

const MOCK_USER_ID = "e2e-mock-user-00000000-0000-0000-0000-000000000001";

const MOCK_USER = {
  id: MOCK_USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: "e2e-test@wishlane.app",
  email_confirmed_at: "2025-01-01T00:00:00Z",
  phone: "",
  confirmed_at: "2025-01-01T00:00:00Z",
  last_sign_in_at: "2026-04-03T10:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2026-04-03T10:00:00Z",
};

const MOCK_SESSION = {
  access_token: "e2e-mock-access-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "e2e-mock-refresh-token",
  user: MOCK_USER,
};

const MOCK_PROFILE = {
  id: MOCK_USER_ID,
  display_name: "Test User",
  nickname: "testuser",
  bio: "E2E test account",
  avatar_url: null,
  created_at: "2025-01-01T00:00:00Z",
};

const MOCK_SETTINGS = {
  user_id: MOCK_USER_ID,
  notify_friend_requests: true,
  notify_reservations: true,
  notify_sale_alerts: true,
  email_digest: false,
  theme: "light",
  default_accent: 0,
  default_wishlist_color: 0,
  display_currency: "USD",
};

const MOCK_WISHLISTS = [
  {
    id: "wl-001",
    user_id: MOCK_USER_ID,
    title: "Birthday Wishes 🎂",
    description: "Things I'd love for my birthday",
    image_url: null,
    created_at: "2026-03-01T10:00:00Z",
    visibility_type: 1,
    accent_type: 0,
    event_date: "2026-05-15T00:00:00Z",
    items_count: 5,
    can_edit: true,
    is_owner: true,
    access_type: null,
    owner_nickname: "testuser",
  },
  {
    id: "wl-002",
    user_id: MOCK_USER_ID,
    title: "Travel Gear",
    description: "For the next adventure",
    image_url: null,
    created_at: "2026-02-10T10:00:00Z",
    visibility_type: 0,
    accent_type: 1,
    event_date: null,
    items_count: 4,
    can_edit: true,
    is_owner: true,
    access_type: null,
    owner_nickname: "testuser",
  },
  {
    id: "wl-003",
    user_id: MOCK_USER_ID,
    title: "Home Office",
    description: null,
    image_url: null,
    created_at: "2026-01-05T10:00:00Z",
    visibility_type: 2,
    accent_type: 4,
    event_date: null,
    items_count: 3,
    can_edit: true,
    is_owner: true,
    access_type: null,
    owner_nickname: "testuser",
  },
];

const MOCK_ITEMS = [
  {
    id: "item-001",
    wishlist_id: "wl-001",
    name: "Wireless Headphones",
    description: "Sony WH-1000XM5 in black",
    price: "349.99",
    priority: 3,
    image_url: null,
    url: "https://example.com/headphones",
    created_at: "2026-03-02T10:00:00Z",
    status: 0,
    reserved_by: null,
    discount_price: null,
    has_discount: false,
    discount_end_date: null,
    currency: "USD",
  },
  {
    id: "item-002",
    wishlist_id: "wl-001",
    name: "Kindle Paperwhite",
    description: "The latest e-reader",
    price: "149.99",
    priority: 2,
    image_url: null,
    url: "https://example.com/kindle",
    created_at: "2026-03-03T10:00:00Z",
    status: 1,
    reserved_by: "friend-001",
    discount_price: null,
    has_discount: false,
    discount_end_date: null,
    currency: "USD",
  },
  {
    id: "item-003",
    wishlist_id: "wl-001",
    name: "Running Shoes",
    description: null,
    price: "120.00",
    priority: 1,
    image_url: null,
    url: null,
    created_at: "2026-03-04T10:00:00Z",
    status: 0,
    reserved_by: null,
    discount_price: "99.00",
    has_discount: true,
    discount_end_date: "2026-04-15T00:00:00Z",
    currency: "USD",
  },
];

const MOCK_FRIENDS = [
  {
    id: "fr-001",
    user_f: MOCK_USER_ID,
    user_s: "friend-001",
    created_at: "2025-06-01T10:00:00Z",
    friend_id: "friend-001",
    display_name: "Alice Johnson",
    nickname: "alice",
    avatar_url: null,
    wishlists_count: 2,
    mutual_friends_count: 1,
  },
  {
    id: "fr-002",
    user_f: "friend-002",
    user_s: MOCK_USER_ID,
    created_at: "2025-09-15T10:00:00Z",
    friend_id: "friend-002",
    display_name: "Bob Smith",
    nickname: "bobsmith",
    avatar_url: null,
    wishlists_count: 5,
    mutual_friends_count: 0,
  },
];

const MOCK_INCOMING_REQUESTS = [
  {
    id: "req-in-001",
    sender_id: "stranger-001",
    receiver_id: MOCK_USER_ID,
    status: 0,
    created_at: "2026-04-01T08:00:00Z",
    display_name: "Charlie Davis",
    nickname: "charlie",
    avatar_url: null,
    mutual_friends_count: 2,
  },
];

const MOCK_OUTGOING_REQUESTS = [
  {
    id: "req-out-001",
    sender_id: MOCK_USER_ID,
    receiver_id: "stranger-002",
    status: 0,
    created_at: "2026-04-02T14:00:00Z",
    display_name: "Diana Prince",
    nickname: "diana",
    avatar_url: null,
    mutual_friends_count: 0,
  },
];

const MOCK_NOTIFICATIONS = [
  {
    id: "notif-001",
    sender_id: "friend-001",
    receiver_id: MOCK_USER_ID,
    sender_name: "Alice Johnson",
    text: "accepted your friend request",
    icon_type: 1,
    is_read: false,
    created_at: "2026-04-03T09:30:00Z",
  },
  {
    id: "notif-002",
    sender_id: "friend-002",
    receiver_id: MOCK_USER_ID,
    sender_name: "Bob Smith",
    text: "reserved an item on your wishlist",
    icon_type: 2,
    is_read: true,
    created_at: "2026-04-02T16:00:00Z",
  },
];

const MOCK_SUBSCRIPTION = {
  plan: "free",
  is_active: false,
  expires_at: null,
  revenuecat_customer_id: null,
};

const MOCK_STATISTICS = {
  wishlists_count: 3,
  total_items_count: 12,
  reserved_items_count: 2,
  purchased_items_count: 1,
};

const MOCK_DISCOVER = [
  {
    id: "disc-001",
    owner: "Alice Johnson",
    username: "alice",
    avatar_url: null,
    wishlist: "Alice's Bookshelf",
    date: "2026-06-01",
    friend_id: "friend-001",
    wishlist_id: "wl-friend-001",
    items: [
      { id: "disc-item-001", name: "Design Anthology", price: "34.00", image: "", url: null, priority: 2, status: 0, currency: "USD" },
      { id: "disc-item-002", name: "Ceramic Mug Set", price: "28.00", image: "", url: null, priority: 1, status: 0, currency: "USD" },
    ],
  },
];

const MOCK_UPCOMING = [
  {
    id: "wl-friend-001",
    user_id: "friend-001",
    title: "Alice's Bookshelf",
    event_date: "2026-06-01T00:00:00Z",
    owner_nickname: "alice",
    owner_display_name: "Alice Johnson",
    avatar_url: null,
  },
];

/* ────── RPC dispatch ────── */

const RPC_HANDLERS = {
  get_friends: () => MOCK_FRIENDS,
  get_incoming_friend_requests_with_details: () => MOCK_INCOMING_REQUESTS,
  get_outgoing_friend_requests_with_details: () => MOCK_OUTGOING_REQUESTS,
  accept_friend_request: () => ({ success: true }),
  reject_friend_request: () => ({ success: true }),
  search_profiles_by_nickname: () => [],
  get_friends_without_wishlist_access: () => [],
  get_wishlist_access_list: () => [],
  toggle_item_reservation: () => ({ success: true }),
  toggle_item_bought: () => ({ success: true }),
  get_my_wishlists_feed: () => MOCK_WISHLISTS,
  get_friends_wishlists_discover: () => MOCK_DISCOVER,
  get_reserved_items_by_me: () => [],
  get_my_bought_items: () => [],
  notify_friends_about_new_wishlist: () => ({ success: true }),
  get_wishlist_by_id: (body) => {
    const wl = MOCK_WISHLISTS.find((w) => w.id === body?.p_wishlist_id);
    return wl || MOCK_WISHLISTS[0];
  },
  get_friends_upcoming_wishlists: () => MOCK_UPCOMING,
  grant_wishlist_access: () => ({ success: true }),
  revoke_wishlist_access: () => ({ success: true }),
  get_user_notifications: () => MOCK_NOTIFICATIONS,
  get_unread_notifications_count: () => 1,
  delete_user_account: () => ({ success: true }),
  create_wishlist_share_token: () => "mock-share-token-123",
  verify_wishlist_share_token: () => ({ valid: true, wishlist_id: "wl-001" }),
  get_wishlist_by_share_token: () => MOCK_WISHLISTS[0],
  get_wishlist_items_by_share_token: () => MOCK_ITEMS,
  get_user_statistics: () => MOCK_STATISTICS,
};

/* ────── Mutable state (persists within a test run) ────── */

let currentSettings = { ...MOCK_SETTINGS };

/* ────── Table dispatch ────── */

function handleTableQuery(tableName, url, method, body) {
  switch (tableName) {
    case "profiles":
      return [MOCK_PROFILE];
    case "user_settings":
      if (method === "PATCH" || method === "POST" || method === "PUT") {
        currentSettings = { ...currentSettings, ...(body || {}) };
        return [currentSettings];
      }
      return [currentSettings];
    case "user_subscriptions":
      return [MOCK_SUBSCRIPTION];
    case "exchange_rates":
      return [{ base: "USD", rates: { EUR: 0.92, GBP: 0.79, UAH: 41.3, PLN: 4.05 }, updated_at: "2026-04-03T06:00:00Z" }];
    case "item":
      if (method === "GET") return MOCK_ITEMS;
      if (method === "POST") return MOCK_ITEMS[0];
      if (method === "PATCH") return MOCK_ITEMS[0];
      if (method === "DELETE") return null;
      return MOCK_ITEMS;
    case "wishlist":
      if (method === "GET") return MOCK_WISHLISTS;
      if (method === "POST") return MOCK_WISHLISTS[0];
      if (method === "PATCH") return MOCK_WISHLISTS[0];
      if (method === "DELETE") return null;
      return MOCK_WISHLISTS;
    case "friend_requests":
      if (method === "POST") return { id: "req-new", sender_id: MOCK_USER_ID, receiver_id: "someone", status: 0 };
      if (method === "DELETE") return null;
      return [];
    case "friends":
      if (method === "DELETE") return null;
      return MOCK_FRIENDS;
    case "notifications":
      if (method === "DELETE") return null;
      if (method === "PATCH") return { success: true };
      return MOCK_NOTIFICATIONS;
    default:
      return [];
  }
}

/* ────── Request handler ────── */

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString();
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw || null);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  // CORS headers (browser makes cross-origin requests to mock)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Expose-Headers", "content-range,x-supabase-api-version");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const json = (data, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  /* ── Auth endpoints ── */

  // GET /auth/v1/user → always return mock user
  if (pathname === "/auth/v1/user" && method === "GET") {
    return json({ ...MOCK_USER });
  }

  // PUT /auth/v1/user → update user (password change etc.)
  if (pathname === "/auth/v1/user" && method === "PUT") {
    return json({ ...MOCK_USER });
  }

  // POST /auth/v1/token → sign in (password or refresh)
  if (pathname === "/auth/v1/token") {
    return json(MOCK_SESSION);
  }

  // POST /auth/v1/signup → register
  if (pathname === "/auth/v1/signup") {
    return json(MOCK_SESSION);
  }

  // POST /auth/v1/signout or /auth/v1/logout
  if (pathname === "/auth/v1/signout" || pathname === "/auth/v1/logout") {
    return json({});
  }

  // GET /auth/v1/authorize → OAuth redirect (shouldn't be hit in tests)
  if (pathname.startsWith("/auth/v1/authorize")) {
    res.writeHead(302, { Location: "http://localhost:3000/auth/callback" });
    res.end();
    return;
  }

  /* ── RPC endpoints ── */

  const rpcMatch = pathname.match(/^\/rest\/v1\/rpc\/(.+)$/);
  if (rpcMatch) {
    const funcName = rpcMatch[1];
    const handler = RPC_HANDLERS[funcName];
    if (handler) {
      const body = await readBody(req);
      return json(handler(body));
    }
    return json({ message: `Unknown RPC: ${funcName}` }, 404);
  }

  /* ── Table endpoints ── */

  const tableMatch = pathname.match(/^\/rest\/v1\/([a-z_]+)/);
  if (tableMatch) {
    const tableName = tableMatch[1];
    const body = method !== "GET" ? await readBody(req) : null;
    const result = handleTableQuery(tableName, url, method, body);

    // Supabase PostgREST: .single() sends Accept: application/vnd.pgrst.object+json
    const accept = req.headers["accept"] || "";
    const wantsSingle = accept.includes("vnd.pgrst.object+json");

    if (result === null) {
      return json(null, 204);
    }

    // Return single object when .single() was used
    if (wantsSingle && Array.isArray(result)) {
      return json(result[0] ?? null);
    }

    // Add content-range header for list responses
    if (Array.isArray(result)) {
      res.setHeader("content-range", `0-${result.length - 1}/${result.length}`);
    }

    return json(result);
  }

  /* ── Storage endpoints ── */

  if (pathname.startsWith("/storage/v1/")) {
    if (method === "POST") {
      // Upload → return fake key
      return json({ Key: pathname.replace("/storage/v1/object/", "") });
    }
    if (method === "DELETE") {
      return json([]);
    }
    // GET public → return empty image
    res.writeHead(200, { "Content-Type": "image/png" });
    res.end(Buffer.alloc(0));
    return;
  }

  /* ── Health check (Playwright webServer polls this) ── */
  if (pathname === "/" || pathname === "/health") {
    return json({ status: "ok" });
  }

  /* ── Catch-all ── */
  console.log(`[mock-supabase] Unhandled: ${method} ${pathname}`);
  json({ error: "Not found" }, 404);
});

const PORT = Number(process.env.MOCK_SUPABASE_PORT) || 54321;
server.listen(PORT, () => {
  console.log(`🧪 Mock Supabase server running on http://localhost:${PORT}`);
});
