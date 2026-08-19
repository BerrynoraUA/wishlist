/**
 * The sample account the app-store capture photographs. These rows are shaped exactly
 * like the ones the production RPCs return, so every screen renders them through its
 * normal queries — see `./client.ts`.
 */

import { PRIORITY_IDS } from "../../lib/priorities";
import type { Notification } from "../../types";
import type { DiscoverItem, DiscoverSection, FriendUpcomingWishlist } from "../../types/discover";
import type { BlockedUser, FriendRequestWithDetails, FriendWithDetails } from "../../types/friends";
import type { Item } from "../../types/item";
import type {
  SecretSantaDetails,
  SecretSantaListResponse,
  VisibleItemsResponse,
} from "../../types/secret-santa";
import type { UserProfile, UserSettings } from "../../types/settings";
import type { UserStatistics, Wishlist } from "../../types/wishlist";
import {
  SHOWCASE_EVENT_ID,
  SHOWCASE_FRIEND_IDS,
  SHOWCASE_OWNER_ID,
  SHOWCASE_REQUESTER_ID,
  SHOWCASE_WISHLIST_ID,
  showcaseAssetUrl,
  showcaseAvatarUrl,
} from "./constants";

/**
 * One capture run is minutes long, so a single origin keeps every relative label
 * ("in 24 days", "2 days ago") identical across devices and scenes.
 */
const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromNow(days: number): string {
  return new Date(NOW + days * DAY_MS).toISOString();
}

function dateDaysFromNow(days: number): string {
  return daysFromNow(days).slice(0, 10);
}

interface ShowcasePerson {
  readonly id: string;
  readonly displayName: string;
  readonly nickname: string;
  readonly avatarUrl: string;
}

function person(
  id: string,
  displayName: string,
  nickname: string,
  gradient: readonly [string, string],
): ShowcasePerson {
  const initials = displayName
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => [...part][0]?.toUpperCase() ?? "")
    .join("");
  return { id, displayName, nickname, avatarUrl: showcaseAvatarUrl(initials, ...gradient) };
}

const OWNER = person(SHOWCASE_OWNER_ID, "Alex Morgan", "alexm", ["#F9A8D4", "#DB2777"]);

const FRIENDS: readonly ShowcasePerson[] = [
  person(SHOWCASE_FRIEND_IDS[0], "Jamie Chen", "jamiechen", ["#A5B4FC", "#4338CA"]),
  person(SHOWCASE_FRIEND_IDS[1], "Priya Shah", "priya_s", ["#6EE7B7", "#047857"]),
  person(SHOWCASE_FRIEND_IDS[2], "Sam Carter", "samc", ["#FCD34D", "#B45309"]),
  person(SHOWCASE_FRIEND_IDS[3], "Rachel Morgan", "rachelm", ["#7DD3FC", "#0369A1"]),
  person(SHOWCASE_FRIEND_IDS[4], "Dan O'Brien", "danob", ["#C4B5FD", "#6D28D9"]),
];

const REQUESTER = person(SHOWCASE_REQUESTER_ID, "Nora Patel", "norap", ["#FDA4AF", "#BE123C"]);

export const SHOWCASE_USER = {
  id: OWNER.id,
  email: "alex@wishlane.showcase",
  displayName: OWNER.displayName,
};

/** Pink, Blue, Peach, Mint, Lavender — matches WishlistAccent. */
const ACCENT = { pink: 0, blue: 1, peach: 2, mint: 3, lavender: 4 } as const;
/** Public, FriendsOnly, Private — matches WishlistVisibility. */
const VISIBILITY = { public: 0, friends: 1, private: 2 } as const;

function wishlistId(suffix: number): string {
  return `5b0f9c40-0000-4000-8000-0000000001${String(suffix).padStart(2, "0")}`;
}

function itemId(wishlistIndex: number, itemIndex: number): string {
  return `5b0f9c40-0000-4000-8000-00000000${String(wishlistIndex + 3).padStart(2, "0")}${String(itemIndex).padStart(2, "0")}`;
}

interface ShowcaseItemSeed {
  readonly name: string;
  readonly description: string;
  readonly price: string;
  readonly priorityId?: string;
  readonly url: string;
  readonly imageAsset: string;
  readonly discountPrice?: string;
}

interface ShowcaseWishlistSeed {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly accent: number;
  readonly visibility: number;
  readonly pinned?: boolean;
  /** Days from capture time; omitted wishlists have no event. */
  readonly eventInDays?: number;
  /** Omitted on purpose for one wishlist, so a capture shows the accent gradient. */
  readonly coverAsset?: string;
  readonly items: readonly ShowcaseItemSeed[];
}

const PRIORITY_NAMES: Readonly<Record<string, string>> = {
  [PRIORITY_IDS.LOW]: "Low",
  [PRIORITY_IDS.MEDIUM]: "Medium",
  [PRIORITY_IDS.HIGH]: "High",
};

const WISHLIST_SEEDS: readonly ShowcaseWishlistSeed[] = [
  {
    id: SHOWCASE_WISHLIST_ID,
    title: "Birthday",
    description: "A few ideas — no pressure 🙂",
    accent: ACCENT.pink,
    visibility: VISIBILITY.friends,
    pinned: true,
    eventInDays: 24,
    coverAsset: "birthday-wishes.jpg",
    items: [
      {
        name: "Sony WH-1000XM5 headphones",
        description: "Black — the XM5s, not a similar pair",
        price: "279.00",
        discountPrice: "249.00",
        priorityId: PRIORITY_IDS.HIGH,
        url: "https://www.sony.co.uk/electronics/headband-headphones/wh-1000xm5",
        imageAsset: "items/sony-wh-1000xm5.jpg",
      },
      {
        name: "iPhone 17 Pro 256GB",
        description: "Deep Blue, SIM-free",
        price: "1099.00",
        priorityId: PRIORITY_IDS.MEDIUM,
        url: "https://www.apple.com/uk/shop/buy-iphone/iphone-17-pro",
        imageAsset: "items/iphone-17-pro.jpg",
      },
      {
        name: "13-inch MacBook Air (M5)",
        description: "Silver, 16GB memory and 512GB storage",
        price: "1099.00",
        priorityId: PRIORITY_IDS.HIGH,
        url: "https://www.apple.com/uk/shop/buy-mac/macbook-air",
        imageAsset: "items/macbook-air-13.jpg",
      },
      {
        name: "AirPods Pro 3",
        description: "With the MagSafe USB-C charging case",
        price: "219.00",
        priorityId: PRIORITY_IDS.LOW,
        url: "https://www.apple.com/uk/shop/buy-airpods/airpods-pro-3",
        imageAsset: "items/airpods-pro-3.jpg",
      },
      {
        name: "Apple Watch Series 11",
        description: "42mm Space Grey with the Dark Grey Sport Loop",
        price: "369.00",
        priorityId: PRIORITY_IDS.MEDIUM,
        url: "https://www.apple.com/uk/shop/buy-watch/apple-watch",
        imageAsset: "items/apple-watch-series-11.jpg",
      },
      {
        name: "iPad mini (A17 Pro)",
        description: "128GB Wi-Fi in Purple",
        price: "599.00",
        priorityId: PRIORITY_IDS.LOW,
        url: "https://www.apple.com/uk/shop/buy-ipad/ipad-mini",
        imageAsset: "items/ipad-mini.jpg",
      },
    ],
  },
  {
    id: wishlistId(2),
    title: "For the flat",
    description: "Things to pick up eventually",
    accent: ACCENT.mint,
    visibility: VISIBILITY.public,
    // No cover: the second card in the list is where a capture shows the accent
    // gradient placeholder an image-less wishlist actually gets.
    items: [
      {
        name: "Dyson V15 Detect Absolute",
        description: "The Gold/Iron model with the Fluffy Optic head",
        price: "649.99",
        url: "https://www.dyson.co.uk/vacuum-cleaners/cordless/v15/detect-absolute-gold-iron",
        imageAsset: "items/dyson-v15-detect.jpg",
      },
      {
        name: "Ninja Foodi MAX AF400UK",
        description: "9.5L Dual Zone air fryer in Black",
        price: "229.99",
        url: "https://ninjakitchen.co.uk/product/ninja-foodi-max-dual-zone-air-fryer-af400uk",
        imageAsset: "items/ninja-foodi-max-af400uk.jpg",
      },
    ],
  },
  {
    id: wishlistId(3),
    title: "Reading upgrades",
    description: "For the commute and holidays",
    accent: ACCENT.lavender,
    visibility: VISIBILITY.private,
    coverAsset: "reading-list.jpg",
    items: [
      {
        name: "Kindle Paperwhite (12th gen)",
        description: "16GB in Black, without lock-screen ads",
        price: "159.99",
        url: "https://www.amazon.co.uk/dp/B0CFPJYX7P",
        imageAsset: "items/kindle-paperwhite.jpg",
      },
      {
        name: "Kobo Libra Colour",
        description: "White, with the page-turn buttons",
        price: "239.99",
        url: "https://www.kobo.com/gb/en/ereaders",
        imageAsset: "items/kobo-libra-colour.jpg",
      },
    ],
  },
  {
    id: wishlistId(4),
    title: "Bike bits",
    description: "For the commute",
    accent: ACCENT.blue,
    visibility: VISIBILITY.friends,
    coverAsset: "cycling-kit.jpg",
    items: [
      {
        name: "Garmin Edge 540",
        description: "Standard edition, not the Solar bundle",
        price: "349.99",
        url: "https://www.garmin.com/en-GB/p/798938/",
        imageAsset: "items/garmin-edge-540.jpg",
      },
      {
        name: "Garmin Varia RTL515",
        description: "Rear-view radar with the tail light",
        price: "169.99",
        url: "https://www.garmin.com/en-GB/p/698893/",
        imageAsset: "items/garmin-varia-rtl515.jpg",
      },
    ],
  },
];

/** Newest first, matching the default `newest` sort of `get_my_wishlists_feed`. */
export const SHOWCASE_WISHLISTS: readonly Wishlist[] = WISHLIST_SEEDS.map((seed, index) => ({
  id: seed.id,
  user_id: OWNER.id,
  title: seed.title,
  description: seed.description,
  image_url: seed.coverAsset ? showcaseAssetUrl(`content/${seed.coverAsset}`) : null,
  created_at: daysFromNow(-(index + 1) * 3),
  visibility_type: seed.visibility,
  accent_type: seed.accent,
  event_date: seed.eventInDays === undefined ? null : dateDaysFromNow(seed.eventInDays),
  items_count: seed.items.length,
  can_edit: true,
  is_owner: true,
  access_type: null,
  owner_nickname: OWNER.nickname,
  is_pinned: seed.pinned ?? false,
}));

export const SHOWCASE_ITEMS: readonly Item[] = WISHLIST_SEEDS.flatMap((seed, wishlistIndex) =>
  seed.items.map((item, index) => ({
    id: itemId(wishlistIndex, index),
    wishlist_id: seed.id,
    name: item.name,
    description: item.description,
    price: item.price,
    priority_id: item.priorityId ?? null,
    priority_name: item.priorityId ? (PRIORITY_NAMES[item.priorityId] ?? null) : null,
    image_url: showcaseAssetUrl(`content/${item.imageAsset}`),
    url: item.url,
    created_at: daysFromNow(-(index + 1)),
    status: 0,
    reserved_by: null,
    discount_price: item.discountPrice ?? null,
    has_discount: Boolean(item.discountPrice),
    discount_end_date: item.discountPrice ? dateDaysFromNow(9) : null,
    currency: "GBP",
    additional_links: null,
  })),
);

export const SHOWCASE_PROFILE: UserProfile = {
  id: OWNER.id,
  display_name: OWNER.displayName,
  nickname: OWNER.nickname,
  bio: "Mostly things I would otherwise lose in my tabs.",
  height: null,
  shoe_size: null,
  avatar_url: OWNER.avatarUrl,
  // USER_GUIDE_COMPLETE_STEP: keeps the onboarding coach marks off every capture.
  userGuideStep: 15,
  created_at: daysFromNow(-420),
};

export const SHOWCASE_PUBLIC_PROFILES = [OWNER, ...FRIENDS, REQUESTER].map((entry) => ({
  id: entry.id,
  display_name: entry.displayName,
  nickname: entry.nickname,
  avatar_url: entry.avatarUrl,
}));

export const SHOWCASE_SETTINGS: Partial<UserSettings> = {
  user_id: OWNER.id,
  // `system` lets the runner drive light/dark purely from the device appearance.
  theme: "system",
  display_currency: "GBP",
  email_digest: false,
  selected_priorities: [PRIORITY_IDS.LOW, PRIORITY_IDS.MEDIUM, PRIORITY_IDS.HIGH],
};

export const SHOWCASE_SUBSCRIPTION = {
  user_id: OWNER.id,
  plan: "pro",
  is_active: true,
  expires_at: daysFromNow(300),
  revenuecat_customer_id: null,
  paddle_subscription_id: null,
};

export const SHOWCASE_STATISTICS: UserStatistics = {
  wishlists_count: SHOWCASE_WISHLISTS.length,
  total_items_count: SHOWCASE_ITEMS.length,
  reserved_items_count: 3,
  purchased_items_count: 2,
};

export const SHOWCASE_FRIENDS: readonly FriendWithDetails[] = FRIENDS.map((friend, index) => ({
  id: `5b0f9c40-0000-4000-8000-00000000030${index}`,
  user_f: OWNER.id,
  user_s: friend.id,
  created_at: daysFromNow(-(index + 2) * 17),
  friend_id: friend.id,
  display_name: friend.displayName,
  nickname: friend.nickname,
  avatar_url: friend.avatarUrl,
  wishlists_count: [4, 2, 3, 1, 2][index] ?? 1,
  mutual_friends_count: [6, 3, 4, 2, 1][index] ?? 1,
}));

export const SHOWCASE_INCOMING_REQUESTS: readonly FriendRequestWithDetails[] = [
  {
    id: "5b0f9c40-0000-4000-8000-000000000401",
    sender_id: REQUESTER.id,
    receiver_id: OWNER.id,
    status: 0,
    created_at: daysFromNow(-2),
    display_name: REQUESTER.displayName,
    nickname: REQUESTER.nickname,
    avatar_url: REQUESTER.avatarUrl,
    mutual_friends_count: 2,
  },
];

export const SHOWCASE_BLOCKED_USERS: readonly BlockedUser[] = [];

interface ShowcaseDiscoverSeed {
  readonly friendIndex: number;
  readonly wishlist: string;
  /** Days from capture time; drives both the section label and the upcoming card. */
  readonly eventInDays: number;
  readonly items: readonly {
    readonly title: string;
    readonly price: string;
    readonly store: string;
    readonly imageAsset: string;
    readonly url: string;
    readonly priorityId?: string;
    readonly reserved?: boolean;
  }[];
}

/**
 * Discover is the friends-facing half of the app, so these are other people's lists
 * rather than the owner's. One item is already reserved, which is what stops two people
 * buying the same present and is the whole point of the screen.
 */
const DISCOVER_SEEDS: readonly ShowcaseDiscoverSeed[] = [
  {
    friendIndex: 0,
    // Discover already prefixes the owner's name, so a possessive title reads as
    // "Jamie Chen's Jamie's birthday".
    wishlist: "Birthday",
    eventInDays: 9,
    items: [
      {
        title: "Sony WH-1000XM5 headphones",
        price: "279.00",
        store: "sony.co.uk",
        imageAsset: "items/sony-wh-1000xm5.jpg",
        url: "https://www.sony.co.uk/electronics/headband-headphones/wh-1000xm5",
        priorityId: PRIORITY_IDS.HIGH,
      },
      {
        title: "Kindle Paperwhite (12th gen)",
        price: "159.99",
        store: "amazon.co.uk",
        imageAsset: "items/kindle-paperwhite.jpg",
        url: "https://www.amazon.co.uk/dp/B0CFPJYX7P",
        reserved: true,
      },
      {
        title: "AirPods Pro 3",
        price: "219.00",
        store: "apple.com",
        imageAsset: "items/airpods-pro-3.jpg",
        url: "https://www.apple.com/uk/shop/buy-airpods/airpods-pro-3",
        priorityId: PRIORITY_IDS.MEDIUM,
      },
    ],
  },
  {
    friendIndex: 1,
    wishlist: "Housewarming",
    eventInDays: 21,
    items: [
      {
        title: "Ninja Foodi MAX AF400UK",
        price: "229.99",
        store: "ninjakitchen.co.uk",
        imageAsset: "items/ninja-foodi-max-af400uk.jpg",
        url: "https://ninjakitchen.co.uk/product/ninja-foodi-max-dual-zone-air-fryer-af400uk",
        priorityId: PRIORITY_IDS.HIGH,
      },
      {
        title: "Dyson V15 Detect Absolute",
        price: "649.99",
        store: "dyson.co.uk",
        imageAsset: "items/dyson-v15-detect.jpg",
        url: "https://www.dyson.co.uk/vacuum-cleaners/cordless/v15/detect-absolute-gold-iron",
      },
    ],
  },
  {
    friendIndex: 2,
    wishlist: "Cycling kit",
    eventInDays: 34,
    items: [
      {
        title: "Garmin Edge 540",
        price: "349.99",
        store: "garmin.com",
        imageAsset: "items/garmin-edge-540.jpg",
        url: "https://www.garmin.com/en-GB/p/798938/",
        priorityId: PRIORITY_IDS.MEDIUM,
      },
      {
        title: "Garmin Varia RTL515",
        price: "169.99",
        store: "garmin.com",
        imageAsset: "items/garmin-varia-rtl515.jpg",
        url: "https://www.garmin.com/en-GB/p/698893/",
      },
    ],
  },
];

export const SHOWCASE_DISCOVER_SECTIONS: readonly DiscoverSection[] = DISCOVER_SEEDS.map(
  (seed, sectionIndex) => {
    const friend = FRIENDS[seed.friendIndex] as ShowcasePerson;
    const items: DiscoverItem[] = seed.items.map((item, index) => ({
      id: `5b0f9c40-0000-4000-8000-0000000008${String(sectionIndex)}${String(index)}`,
      title: item.title,
      price: item.price,
      store: item.store,
      image: showcaseAssetUrl(`content/${item.imageAsset}`),
      image_url: showcaseAssetUrl(`content/${item.imageAsset}`),
      url: item.url,
      description: null,
      priority: item.priorityId ? (PRIORITY_NAMES[item.priorityId] ?? null) : null,
      priority_id: item.priorityId ?? null,
      status: 0,
      isReserved: item.reserved ?? false,
      reserved_by: item.reserved ? OWNER.id : null,
      reservedBy: item.reserved ? OWNER.id : null,
      reservedByName: item.reserved ? OWNER.displayName : null,
      discount_price: null,
      currency: "GBP",
      additional_links: null,
    }));

    return {
      id: `5b0f9c40-0000-4000-8000-00000000070${String(sectionIndex)}`,
      owner: friend.displayName,
      username: friend.nickname,
      avatar_url: friend.avatarUrl,
      wishlist: seed.wishlist,
      date: dateDaysFromNow(seed.eventInDays),
      friend_id: friend.id,
      wishlist_id: `5b0f9c40-0000-4000-8000-00000000070${String(sectionIndex)}`,
      items,
    };
  },
);

export const SHOWCASE_UPCOMING_WISHLISTS: readonly FriendUpcomingWishlist[] = DISCOVER_SEEDS.map(
  (seed, index) => ({
    friend_name: (FRIENDS[seed.friendIndex] as ShowcasePerson).displayName,
    wishlist_title: seed.wishlist,
    event_date: dateDaysFromNow(seed.eventInDays),
    wishlist_id: `5b0f9c40-0000-4000-8000-00000000070${String(index)}`,
    friend_id: (FRIENDS[seed.friendIndex] as ShowcasePerson).id,
  }),
);

const SECRET_SANTA_PARTICIPANTS = [OWNER, ...FRIENDS.slice(0, 3)].map((entry) => ({
  id: entry.id,
  nickname: entry.nickname,
  display_name: entry.displayName,
  avatar_url: entry.avatarUrl,
}));

export const SHOWCASE_SECRET_SANTA_LIST: SecretSantaListResponse = {
  items: [
    {
      id: SHOWCASE_EVENT_ID,
      name: "Family Secret Santa",
      event_date: dateDaysFromNow(45),
      budget: 50,
      currency: "GBP",
      // No cover, so the list shows both states side by side: this one falls back to
      // the accent gradient while the event below carries a real photo.
      image_url: null,
      owner_id: OWNER.id,
      is_owner: true,
      participants_count: SECRET_SANTA_PARTICIPANTS.length,
    },
    {
      id: "5b0f9c40-0000-4000-8000-000000000202",
      name: "Studio gift swap",
      event_date: dateDaysFromNow(12),
      budget: 25,
      currency: "GBP",
      image_url: showcaseAssetUrl("content/secret-santa-swap.jpg"),
      owner_id: FRIENDS[0].id,
      is_owner: false,
      participants_count: 6,
    },
  ],
  total: 2,
  limit: 20,
  offset: 0,
};

export const SHOWCASE_SECRET_SANTA_DETAILS: SecretSantaDetails = {
  id: SHOWCASE_EVENT_ID,
  name: "Family Secret Santa",
  event_date: dateDaysFromNow(45),
  budget: 50,
  currency: "GBP",
  image_url: null,
  owner_id: OWNER.id,
  is_started: true,
  participants: SECRET_SANTA_PARTICIPANTS,
  pending_invites: [
    {
      invite_id: "5b0f9c40-0000-4000-8000-000000000501",
      id: FRIENDS[4].id,
      nickname: FRIENDS[4].nickname,
      display_name: FRIENDS[4].displayName,
      avatar_url: FRIENDS[4].avatarUrl,
    },
  ],
  my_receiver: SECRET_SANTA_PARTICIPANTS[1],
};

/**
 * What the drawn match has on their own lists under the event budget. Without these the
 * detail screen photographs its empty state, which sells the opposite of the feature —
 * the point is that you are told who you drew *and* what they want.
 */
export const SHOWCASE_GIFT_SUGGESTIONS: VisibleItemsResponse = {
  items: [
    {
      id: "5b0f9c40-0000-4000-8000-000000000901",
      wishlist_id: "5b0f9c40-0000-4000-8000-000000000700",
      wishlist_title: "Birthday",
      wishlist_image_url: null,
      // Both suggestions stay under the event's GBP 50, because the card above them
      // promises exactly that.
      name: "Kindle Paperwhite fabric cover",
      description: "Black, for the 12th-gen Paperwhite",
      price: "34.99",
      discount_price: null,
      has_discount: false,
      effective_price: 34.99,
      discount_end_date: null,
      currency: "GBP",
      priority_id: PRIORITY_IDS.HIGH,
      priority_name: PRIORITY_NAMES[PRIORITY_IDS.HIGH] ?? null,
      url: "https://www.amazon.co.uk/dp/B0CFPJYX7P",
      image_url: showcaseAssetUrl("content/items/kindle-paperwhite.jpg"),
      status: 0,
      reserved_by: null,
      created_at: daysFromNow(-6),
      additional_links: null,
    },
    {
      id: "5b0f9c40-0000-4000-8000-000000000902",
      wishlist_id: "5b0f9c40-0000-4000-8000-000000000700",
      wishlist_title: "Birthday",
      wishlist_image_url: null,
      name: "AirPods Pro 3 silicone case",
      description: "Deep Blue, with the carabiner clip",
      price: "39.99",
      discount_price: "29.99",
      has_discount: true,
      effective_price: 29.99,
      discount_end_date: dateDaysFromNow(9),
      currency: "GBP",
      priority_id: PRIORITY_IDS.MEDIUM,
      priority_name: PRIORITY_NAMES[PRIORITY_IDS.MEDIUM] ?? null,
      url: "https://www.apple.com/uk/shop/buy-airpods/airpods-pro-3",
      image_url: showcaseAssetUrl("content/items/airpods-pro-3.jpg"),
      status: 0,
      reserved_by: null,
      created_at: daysFromNow(-11),
      additional_links: null,
    },
  ],
  total: 2,
  limit: 20,
  offset: 0,
};

export const SHOWCASE_NOTIFICATIONS: readonly Notification[] = [
  {
    id: "5b0f9c40-0000-4000-8000-000000000601",
    sender_id: FRIENDS[0].id,
    receiver_id: OWNER.id,
    sender_name: FRIENDS[0].displayName,
    text: "Jamie reserved something from your Birthday wishlist",
    icon_type: 0,
    type: 0,
    entity_id: SHOWCASE_WISHLIST_ID,
    is_read: false,
    created_at: daysFromNow(-1),
  },
  {
    id: "5b0f9c40-0000-4000-8000-000000000602",
    sender_id: REQUESTER.id,
    receiver_id: OWNER.id,
    sender_name: REQUESTER.displayName,
    text: "Nora Patel sent you a friend request",
    icon_type: 0,
    type: 0,
    entity_id: REQUESTER.id,
    is_read: false,
    created_at: daysFromNow(-2),
  },
];

/**
 * USD-based rates, so price conversion never reaches the network during a capture.
 * The fixture prices are already in the display currency, so only the pair below
 * is ever exercised.
 */
export const SHOWCASE_EXCHANGE_RATES = [
  { base_currency: "USD", target_currency: "GBP", rate: 0.79, updated_at: daysFromNow(-1) },
  { base_currency: "USD", target_currency: "EUR", rate: 0.92, updated_at: daysFromNow(-1) },
];
