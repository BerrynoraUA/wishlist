export interface ItemColor {
  color: string;
  label: string;
}

/**
 * The colours an item card can be painted with, picked by the item's owner. The stored
 * value is the index into this array, so the order is part of the data — append new
 * colours at the end rather than reordering.
 *
 * Only a card with a colour gets the glowing frame; priorities no longer tint the card
 * (Starred is the one exception, and it uses the account's accent instead).
 */
export const ITEM_COLORS: ItemColor[] = [
  { color: "#f43f5e", label: "Rose" },
  { color: "#ec4899", label: "Pink" },
  { color: "#a855f7", label: "Purple" },
  { color: "#6366f1", label: "Indigo" },
  { color: "#3b82f6", label: "Blue" },
  { color: "#06b6d4", label: "Cyan" },
  { color: "#10b981", label: "Emerald" },
  { color: "#f59e0b", label: "Amber" },
  { color: "#f97316", label: "Orange" },
  { color: "#8b5cf6", label: "Violet" },
];

export function getItemColor(colorIndex: number | null | undefined): string | null {
  if (colorIndex == null) return null;
  return ITEM_COLORS[colorIndex]?.color ?? null;
}
