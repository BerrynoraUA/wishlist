import { useGT } from "gt-next";
import { ExternalLink, MoreHorizontal } from "lucide-react";
import { DraftBadge } from "@/components/ui/DraftBadge/DraftBadge";
import { SaveToWishlistButton } from "@/components/ui/SaveToWishlistModal/SaveToWishlistButton";
import { useSessionDraftPresence } from "@/hooks/use-session-draft";
import { useCurrentUserId } from "@/hooks/use-user";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/DropdownMenu/DropdownMenu";
import { buildSaveItemData, shareItemLink } from "@/lib/helpers/item-card";
import type { ItemCardPriority } from "@/lib/helpers/item-card";
import styles from "../ItemCard.module.scss";

type CardQuickActionsProps = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  price: string | number | null;
  url: string | null;
  shareUrl: string | null;
  priority: ItemCardPriority;
  discountPrice: string | number | null;
  currency: string | null;
  isOwner: boolean;
  isWishlist: boolean;
  onEdit?: () => void;
  onDelete?: (id: string) => void;
};

export function CardQuickActions({
  id,
  name,
  description,
  image,
  price,
  url,
  shareUrl,
  priority,
  discountPrice,
  currency,
  isOwner,
  isWishlist,
  onEdit,
  onDelete,
}: CardQuickActionsProps) {
  const t = useGT();
  const { data: currentUserId = "" } = useCurrentUserId();
  const hasProductLink = Boolean(url);
  const hasShareLink = Boolean(shareUrl);
  const hasEditDraft = useSessionDraftPresence({
    userId: currentUserId,
    kind: "edit-item",
    scopeId: id,
  });

  return (
    <div className={styles.quickActions}>
      {!isOwner && (
        <SaveToWishlistButton
          item={buildSaveItemData({
            name,
            description,
            price,
            imageUrl: image,
            url,
            priority_id: priority,
            discountPrice,
            currency,
          })}
          className={`${styles.iconButton} iconTooltipTrigger`}
        />
      )}

      {hasProductLink && (
        <a
          href={url!}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.iconButton} iconTooltipTrigger`}
          onClick={(e) => e.stopPropagation()}
          aria-label={t("Open product link", { $id: "itemCard.openProduct" })}
          data-tooltip={t("Open product link", { $id: "itemCard.openProduct" })}
        >
          <ExternalLink size={16} />
        </a>
      )}

      {isOwner ? (
        <DropdownMenu
          trigger={({ toggle }) => (
            <button
              className={`${styles.iconButton} iconTooltipTrigger`}
              onClick={(e) => {
                e.stopPropagation();
                toggle();
              }}
              aria-label={t("Open item menu", { $id: "itemCard.menuAria" })}
              data-tooltip={t("More options", { $id: "itemCard.moreOptions" })}
            >
              <MoreHorizontal size={16} />
              {hasEditDraft && <DraftBadge variant="dot" className={styles.iconButtonDraftDot} />}
            </button>
          )}
        >
          <DropdownMenuItem
            variant="edit"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
          >
            <span>{t("Edit", { $id: "common.edit" })}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(id);
            }}
          >
            <span>{t("Delete", { $id: "common.delete" })}</span>
          </DropdownMenuItem>
        </DropdownMenu>
      ) : !isWishlist && hasShareLink ? (
        <DropdownMenu
          trigger={({ toggle }) => (
            <button
              className={`${styles.iconButton} iconTooltipTrigger`}
              onClick={(e) => {
                e.stopPropagation();
                toggle();
              }}
              aria-label={t("Open item menu", { $id: "itemCard.menuAria" })}
              data-tooltip={t("More options", { $id: "itemCard.moreOptions" })}
            >
              <MoreHorizontal size={16} />
            </button>
          )}
        >
          <DropdownMenuItem variant="share" onClick={() => shareItemLink(shareUrl!)}>
            <span>{t("Share", { $id: "itemCard.share" })}</span>
          </DropdownMenuItem>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
