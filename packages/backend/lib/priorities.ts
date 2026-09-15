import type { ItemPriority } from "../types/priority";

// Fixed UUIDs match the migration seed — no DB round-trip needed
export const PRIORITY_IDS = {
  LOW: "11111111-0000-0000-0000-000000000001",
  MEDIUM: "11111111-0000-0000-0000-000000000002",
  HIGH: "11111111-0000-0000-0000-000000000003",
  STAR: "11111111-0000-0000-0000-000000000011",
} as const;

// Starred items float to the top of the default ordering and are capped per
// wishlist — the DB functions match on this id directly, so keep it in sync
// with the migration seed.
export const STAR_PRIORITY_ID = PRIORITY_IDS.STAR;

export function isStarPriorityId(priorityId: string | null | undefined) {
  return priorityId === STAR_PRIORITY_ID;
}

export const ALL_PRIORITIES: ItemPriority[] = [
  {
    id: PRIORITY_IDS.LOW,
    name: "Low",
    color: "#22c55e",
    emoji: "🟢",
    sort_order: 1,
    is_free: true,
  },
  {
    id: PRIORITY_IDS.MEDIUM,
    name: "Medium",
    color: "#eab308",
    emoji: "🟡",
    sort_order: 2,
    is_free: true,
  },
  {
    id: PRIORITY_IDS.HIGH,
    name: "High",
    color: "#ef4444",
    emoji: "🔴",
    sort_order: 3,
    is_free: true,
  },
  {
    id: PRIORITY_IDS.STAR,
    name: "Starred",
    color: "#c0267e",
    emoji: "⭐",
    sort_order: 11,
    is_free: true,
  },
];

/**
 * CSS colour to paint a priority with. Starred follows the user's chosen accent
 * (`--color-brand`) the way the old star card did, so it stays blue for a blue
 * accent instead of the fixed pink stored in the DB.
 */
export function getPriorityCssColor(priority: Pick<ItemPriority, "id" | "color">): string {
  return isStarPriorityId(priority.id) ? "var(--color-brand)" : priority.color;
}
