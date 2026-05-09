export type NativeThemeMode = "light" | "dark";
export type NativeAccentName = "pink" | "blue" | "peach" | "mint" | "lavender";
export type NativeGradientColors = readonly [string, string, string];

export const PRIMARY_GRADIENT_COLORS: Record<
  NativeThemeMode,
  Record<NativeAccentName, NativeGradientColors>
> = {
  light: {
    pink: ["#ec4899", "#c0267e", "#f472b6"],
    blue: ["#60a5fa", "#2563eb", "#93c5fd"],
    peach: ["#f59e0b", "#d97706", "#fbbf24"],
    mint: ["#10b981", "#059669", "#34d399"],
    lavender: ["#8b5cf6", "#7c3aed", "#a78bfa"],
  },
  dark: {
    pink: ["#f472b6", "#e052a0", "#f9a8d4"],
    blue: ["#93c5fd", "#60a5fa", "#bfdbfe"],
    peach: ["#fde68a", "#fbbf24", "#fef3c7"],
    mint: ["#6ee7b7", "#34d399", "#a7f3d0"],
    lavender: ["#c4b5fd", "#a78bfa", "#ddd6fe"],
  },
};

export const ACCENT_GRADIENT_COLORS: Record<
  NativeThemeMode,
  Record<NativeAccentName, NativeGradientColors>
> = {
  light: {
    pink: ["#fde7f3", "#fbcfe8", "#f9a8d4"],
    blue: ["#e0f2fe", "#bae6fd", "#7dd3fc"],
    peach: ["#fef3c7", "#fde68a", "#fcd34d"],
    mint: ["#d1fae5", "#a7f3d0", "#6ee7b7"],
    lavender: ["#ede9fe", "#ddd6fe", "#c4b5fd"],
  },
  dark: {
    pink: ["#3d1a2e", "#4a1834", "#551540"],
    blue: ["#142030", "#1a2d45", "#203a58"],
    peach: ["#2d2510", "#3a3015", "#453a1a"],
    mint: ["#0f2a1a", "#143520", "#1a4028"],
    lavender: ["#1e1a30", "#252040", "#2e2850"],
  },
};
