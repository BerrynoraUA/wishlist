import { useMemo, useState, useEffect } from "react";
import { useGT } from "gt-next";
import styles from "./WishlistItemsGrid.module.scss";
import { ItemCard, normalizeWishlistItem } from "@/components/shared/ItemCard";
import { WishlistItemDetailModal } from "./WishlistItemDetailModal";
import { Item } from "@/types/item";
import { useProfilesByIds } from "@/hooks/use-settings";
import { useCurrentUserId } from "@/hooks/use-user";
import { useItemVotes, useToggleItemVote } from "@/hooks/use-items";
import { AddCard } from "@/components/ui/AddCard/AddCard";
import { LayoutGrid, LayoutList } from "lucide-react";

type Props = {
  items: Item[];
  isOwner?: boolean;
  showDiscountBadge?: boolean;
  onToggleReserve?: (id: string) => void;
  onToggleBought?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (item: Item) => void;
  onAddItem?: () => void;
  openItemId?: string | null;
  onOpenItemHandled?: (id: string) => void;
};

export function WishlistItemsGrid({
  items,
  isOwner = false,
  showDiscountBadge = false,
  onToggleReserve,
  onToggleBought,
  onDelete,
  onEdit,
  onAddItem,
  openItemId,
  onOpenItemHandled,
}: Props) {
  const t = useGT();
  const { data: currentUserId = "" } = useCurrentUserId();

  const [isMobile, setIsMobile] = useState(false);
  const [cols, setCols] = useState<1 | 2>(2);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 480px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const reservedByIds = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.reserved_by)
            .filter(
              (id): id is string =>
                !!id && (!currentUserId || id !== currentUserId),
            ),
        ),
      ),
    [items, currentUserId],
  );
  const { data: reservedProfiles = [] } = useProfilesByIds(reservedByIds);

  const reservedByNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of reservedProfiles) {
      map.set(
        p.id,
        p.display_name ||
          p.nickname ||
          t("Unknown user", { $id: "wishlist.grid.unknownUser" }),
      );
    }
    return map;
  }, [reservedProfiles, t]);

  const itemIds = useMemo(() => items.map((i) => i.id), [items]);
  const { data: votesData } = useItemVotes(itemIds);
  const toggleVote = useToggleItemVote(itemIds);

  return (
    <div className={styles.wrapper}>
      {isMobile && (
        <div className={styles.layoutToggle}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${cols === 2 ? styles.toggleActive : ""}`}
            onClick={() => setCols(2)}
            aria-label={t("2 per row", {
              $id: "wishlist.grid.layoutTwoPerRow",
            })}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${cols === 1 ? styles.toggleActive : ""}`}
            onClick={() => setCols(1)}
            aria-label={t("1 per row", {
              $id: "wishlist.grid.layoutOnePerRow",
            })}
          >
            <LayoutList size={16} />
          </button>
        </div>
      )}
      <div
        className={`${styles.grid} ${isMobile && cols === 1 ? styles.gridSingle : ""}`}
      >
        {items.map((item) => (
          <ItemCard
            key={item.id}
            {...normalizeWishlistItem(
              item,
              item.reserved_by
                ? (reservedByNameById.get(item.reserved_by) ?? null)
                : null,
            )}
            variant="wishlist"
            isOwner={isOwner}
            showDiscountBadge={showDiscountBadge}
            onToggleReserve={onToggleReserve}
            onToggleBought={onToggleBought}
            onDelete={onDelete}
            onEdit={onEdit ? () => onEdit(item) : undefined}
            autoOpen={openItemId === item.id}
            onAutoOpenHandled={onOpenItemHandled}
            voteCount={votesData?.counts[item.id] ?? 0}
            hasVoted={votesData?.userVotes.has(item.id) ?? false}
            onToggleVote={!isOwner ? (id) => toggleVote.mutate(id) : undefined}
            renderDetailModal={({ open, onClose }) => (
              <WishlistItemDetailModal
                open={open}
                onClose={onClose}
                item={item}
                isOwner={isOwner}
                onToggleReserve={onToggleReserve}
                onToggleBought={onToggleBought}
                reservedByName={
                  item.reserved_by
                    ? (reservedByNameById.get(item.reserved_by) ?? null)
                    : null
                }
                onDelete={onDelete}
                onEdit={onEdit}
              />
            )}
          />
        ))}
        {onAddItem && (
          <AddCard
            onClick={onAddItem}
            label={t("Add item", { $id: "wishlist.grid.addItemCardLabel" })}
          />
        )}
      </div>
    </div>
  );
}
