import { useMemo, useState, useEffect } from "react";
import styles from "./WishlistItemsGrid.module.scss";
import { WishlistItemCard } from "./WishlistItemCard";
import { Item } from "@/types/item";
import { useProfilesByIds } from "@/hooks/use-settings";
import { useCurrentUserId } from "@/hooks/use-user";
import { LayoutGrid, LayoutList } from "lucide-react";

type Props = {
  items: Item[];
  isOwner?: boolean;
  showDiscountBadge?: boolean;
  onToggleReserve?: (id: string) => void;
  onToggleBought?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (item: Item) => void;
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
  openItemId,
  onOpenItemHandled,
}: Props) {
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
      map.set(p.id, p.display_name || p.nickname || "Unknown user");
    }
    return map;
  }, [reservedProfiles]);

  return (
    <div className={styles.wrapper}>
      {isMobile && (
        <div className={styles.layoutToggle}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${cols === 2 ? styles.toggleActive : ""}`}
            onClick={() => setCols(2)}
            aria-label="2 per row"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${cols === 1 ? styles.toggleActive : ""}`}
            onClick={() => setCols(1)}
            aria-label="1 per row"
          >
            <LayoutList size={16} />
          </button>
        </div>
      )}
      <div
        className={`${styles.grid} ${isMobile && cols === 1 ? styles.gridSingle : ""}`}
      >
        {items.map((item) => (
          <WishlistItemCard
            key={item.id}
            item={item}
            isOwner={isOwner}
            showDiscountBadge={showDiscountBadge}
            onToggleReserve={onToggleReserve}
            onToggleBought={onToggleBought}
            reservedByName={
              item.reserved_by
                ? (reservedByNameById.get(item.reserved_by) ?? null)
                : null
            }
            onDelete={onDelete}
            onEdit={onEdit}
            autoOpen={openItemId === item.id}
            onAutoOpenHandled={onOpenItemHandled}
          />
        ))}
      </div>
    </div>
  );
}
