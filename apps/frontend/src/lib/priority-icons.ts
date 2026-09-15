import { ArrowDown, Equal, ArrowUp, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PRIORITY_IDS } from "@/lib/priorities";

export const PRIORITY_ICONS: Record<string, LucideIcon> = {
  [PRIORITY_IDS.LOW]: ArrowDown,
  [PRIORITY_IDS.MEDIUM]: Equal,
  [PRIORITY_IDS.HIGH]: ArrowUp,
  [PRIORITY_IDS.STAR]: Star,
};
