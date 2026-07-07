/**
 * Mock data fixtures for Playwright E2E tests.
 *
 * These represent realistic API responses so the UI renders
 * with meaningful content without needing a real database.
 */

/* ── Auth ── */

export const MOCK_USER_ID = "e2e-mock-user-00000000-0000-0000-0000-000000000001";

export const MOCK_USER = {
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

export const MOCK_SESSION = {
  access_token: "e2e-mock-access-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "e2e-mock-refresh-token",
  user: MOCK_USER,
};

/* ── Profile ── */

export const MOCK_PROFILE = {
  id: MOCK_USER_ID,
  display_name: "Test User",
  nickname: "testuser",
  bio: "E2E test account",
  avatar_url: null,
  userGuideStep: 15,
  created_at: "2025-01-01T00:00:00Z",
};

/* ── Settings ── */

export const MOCK_SETTINGS = {
  user_id: MOCK_USER_ID,
  notify_friend_requests: true,
  notify_reservations: true,
  notify_secret_santa: true,
  notify_new_wishlists: true,
  notify_upcoming_events: true,
  notify_group_added: true,
  notify_wishlist_access: true,
  notify_reserved_item_updates: true,
  email_digest: false,
  theme: "light" as const,
  default_accent: 0,
  default_wishlist_color: 0,
  display_currency: "USD",
};

/* ── Statistics ── */

export const MOCK_STATISTICS = {
  wishlists_count: 3,
  total_items_count: 12,
  reserved_items_count: 2,
  purchased_items_count: 1,
};

/* ── Subscription ── */

export const MOCK_SUBSCRIPTION = {
  plan: "free",
  is_active: false,
  expires_at: null,
  revenuecat_customer_id: null,
};

/* ── Wishlists ── */

export const MOCK_WISHLISTS = [
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

/* ── Items ── */

export const MOCK_ITEMS = [
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

/* ── Friends ── */

export const MOCK_FRIENDS = [
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

export const MOCK_INCOMING_REQUESTS = [
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

export const MOCK_OUTGOING_REQUESTS = [
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

/* ── Notifications ── */

export const MOCK_NOTIFICATIONS = [
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

/* ── Discover ── */

export const MOCK_DISCOVER_SECTIONS = [
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
      {
        id: "disc-item-001",
        name: "Design Anthology",
        price: "34.00",
        image: "",
        url: null,
        priority: 2,
        status: 0,
        currency: "USD",
      },
      {
        id: "disc-item-002",
        name: "Ceramic Mug Set",
        price: "28.00",
        image: "",
        url: null,
        priority: 1,
        status: 0,
        currency: "USD",
      },
    ],
  },
];

/* ── Exchange Rates ── */

export const MOCK_EXCHANGE_RATES = [
  {
    base: "USD",
    rates: { EUR: 0.92, GBP: 0.79, UAH: 41.3, PLN: 4.05 },
    updated_at: "2026-04-03T06:00:00Z",
  },
];

/* ── Upcoming Events ── */

export const MOCK_UPCOMING_EVENTS = [
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
