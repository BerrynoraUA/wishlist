import { WishlistAccent } from "@/types/wishlist";

export const Colors = {
  // Primary brand colors
  primary: "#E88CA5",
  primaryDark: "#D4708E",
  primaryLight: "#F5B8CA",

  // Background
  background: "#FFFFFF",
  backgroundSecondary: "#F8F9FA",
  card: "#FFFFFF",

  // Text
  text: "#1A1A2E",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  textInverse: "#FFFFFF",

  // Border
  border: "#E5E7EB",
  borderLight: "#F3F4F6",

  // Status
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  // Accent colors (matching web app)
  accentPink: "#E88CA5",
  accentBlue: "#7CB9E8",
  accentPeach: "#FFCBA4",
  accentMint: "#98D8C8",
  accentLavender: "#C4B7EA",

  // Misc
  shadow: "rgba(0, 0, 0, 0.08)",
  overlay: "rgba(0, 0, 0, 0.5)",
  skeleton: "#E5E7EB",
  white: "#FFFFFF",
  black: "#000000",
};

export const ACCENT_COLORS: Record<WishlistAccent, string> = {
  [WishlistAccent.Pink]: Colors.accentPink,
  [WishlistAccent.Blue]: Colors.accentBlue,
  [WishlistAccent.Peach]: Colors.accentPeach,
  [WishlistAccent.Mint]: Colors.accentMint,
  [WishlistAccent.Lavender]: Colors.accentLavender,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;
