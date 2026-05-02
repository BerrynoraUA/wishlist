import type { ReactNode } from "react";
import type { ItemCardPriority } from "@/lib/helpers/item-card";

export type ItemCardData = {
  id: string;
  name: string;
  image: string | null;
  price: string | number | null;
  store: string | null;
  url: string | null;
  shareUrl: string | null;
  description: string | null;
  priority: ItemCardPriority;
  colorIndex: number | null;
  discountPrice: string | number | null;
  currency: string | null;
  status: number | null;
  isReserved: boolean;
  reservedBy: string | null;
  reservedByName: string | null;
};

export type ItemCardProps = ItemCardData & {
  variant?: "discover" | "reserved" | "wishlist";
  showDiscountBadge?: boolean;
  isOwner?: boolean;
  reservedByCurrentUser?: boolean;
  mode?: "reserved" | "purchased";
  onToggleReserve?: (id: string) => void;
  onToggleBought?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: () => void;
  autoOpen?: boolean;
  onAutoOpenHandled?: (id: string) => void;
  voteCount?: number;
  hasVoted?: boolean;
  onToggleVote?: (id: string) => void;
  renderDetailModal?: (opts: { open: boolean; onClose: () => void }) => ReactNode;
};
