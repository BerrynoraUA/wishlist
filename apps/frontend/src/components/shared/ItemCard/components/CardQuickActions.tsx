import { useState } from "react";
import { useGT } from "gt-next";
import { MoreHorizontal, Store } from "lucide-react";
import { DraftBadge } from "@/components/ui/DraftBadge/DraftBadge";
import { SaveToWishlistButton } from "@/components/ui/SaveToWishlistModal/SaveToWishlistButton";
import { useSessionDraftPresence } from "@/hooks/use-session-draft";
import { useCurrentUserId } from "@/hooks/use-user";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/DropdownMenu/DropdownMenu";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal/DeleteConfirmModal";
import { useReportItem } from "@/hooks/use-items";
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
  const reportItem = useReportItem();
  const [reportOpen, setReportOpen] = useState(false);
  const hasProductLink = Boolean(url);
  const hasShareLink = Boolean(shareUrl);
  const hasEditDraft = useSessionDraftPresence({
    userId: currentUserId,
    kind: "edit-item",
    scopeId: id,
  });

  return (
    <>
      {/* Saving someone else's idea is a keeper action, not a menu one, so it gets the
          free corner of the image to itself. */}
      {!isOwner && (
        <div className={styles.saveAction}>
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
        </div>
      )}

      <div className={styles.quickActions}>
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
        ) : (
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
            {hasProductLink && (
              <DropdownMenuItem
                icon={<Store size={16} />}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(url!, "_blank", "noopener,noreferrer");
                }}
              >
                <span>{t("Go to store", { $id: "itemCard.goToStore" })}</span>
              </DropdownMenuItem>
            )}
            {!isWishlist && hasShareLink && (
              <DropdownMenuItem variant="share" onClick={() => shareItemLink(shareUrl!)}>
                <span>{t("Share", { $id: "itemCard.share" })}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                setReportOpen(true);
              }}
            >
              <span>{t("Report", { $id: "itemCard.report" })}</span>
            </DropdownMenuItem>
          </DropdownMenu>
        )}

        <DeleteConfirmModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          onConfirm={() =>
            reportItem.mutate(id, {
              onSuccess: () => setReportOpen(false),
            })
          }
          title={t("Report this item", { $id: "itemCard.reportTitle" })}
          description={t(
            "Tell us this item breaks the rules and our team will take a look. You can only report an item once.",
            { $id: "itemCard.reportDescription" },
          )}
          confirmLabel={t("Report", { $id: "itemCard.reportConfirm" })}
          isPending={reportItem.isPending}
        />
      </div>
    </>
  );
}
