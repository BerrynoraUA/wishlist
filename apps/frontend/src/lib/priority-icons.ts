import {
  ArrowDown,
  Equal,
  ArrowUp,
  Zap,
  AlertTriangle,
  Sparkles,
  Crown,
  Waves,
  Sparkle,
  Star,
  Gem,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PRIORITY_IDS } from "@/lib/priorities";

export const PRIORITY_ICONS: Record<string, LucideIcon> = {
  [PRIORITY_IDS.LOW]: ArrowDown,
  [PRIORITY_IDS.MEDIUM]: Equal,
  [PRIORITY_IDS.HIGH]: ArrowUp,
  [PRIORITY_IDS.URGENT]: Zap,
  [PRIORITY_IDS.CRITICAL]: AlertTriangle,
  [PRIORITY_IDS.EPIC]: Sparkles,
  [PRIORITY_IDS.LEGENDARY]: Crown,
  [PRIORITY_IDS.MYTHIC]: Waves,
  [PRIORITY_IDS.CELESTIAL]: Sparkle,
  [PRIORITY_IDS.DIVINE]: Gem,
  [PRIORITY_IDS.STAR]: Star,
};
