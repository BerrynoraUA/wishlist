export interface ItemColor {
  color: string;
  label: string;
}

// 10 accent colors for item cards (index 0-9)
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

export const STAR_CARD_COLOR_INDEX = ITEM_COLORS.length;

export function isStarCardColorIndex(colorIndex: number | null | undefined) {
  return colorIndex === STAR_CARD_COLOR_INDEX;
}
