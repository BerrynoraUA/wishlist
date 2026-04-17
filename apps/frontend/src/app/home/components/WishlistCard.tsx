"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGT } from "gt-next";
import styles from "./WishlistCard.module.scss";
import { Wishlist } from "@/types/wishlist";
import { Gift, Link2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuItem,
} from "@/components/ui/DropdownMenu/DropdownMenu";
import {
  WISHLIST_VISIBILITY_ICONS,
  getWishlistAccentClass,
  getWishlistVisibilityLabels,
} from "@/lib/helpers/wishlist-metadata";

type Props = {
  wishlist: Wishlist;
  showSharedMeta?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function WishlistCard({
  wishlist,
  showSharedMeta = true,
  onEdit,
  onDelete,
}: Props) {
  const t = useGT();
  const router = useRouter();
  const [menuKey, setMenuKey] = useState(0);
  const visibilityLabels = getWishlistVisibilityLabels(t);

  const accent = getWishlistAccentClass(wishlist.accent_type);
  const hasImage = Boolean(wishlist.image_url);
  const visibility = wishlist.visibility_type;
  const VisibilityIcon = WISHLIST_VISIBILITY_ICONS[visibility];
  const itemsCount =
    wishlist.items_count ??
    (wishlist as Wishlist & { itemsCount?: number }).itemsCount ??
    0;
  const isShared = showSharedMeta && wishlist.is_owner === false;
  const showMenu = Boolean(onEdit || onDelete);
  const ownerNickname = wishlist.owner_nickname?.trim();
  const sharedTooltip = ownerNickname
    ? t("Shared by {name}", {
        name: `@${ownerNickname}`,
        $id: "wishlistCard.sharedBy",
      })
    : t("Shared wishlist", { $id: "wishlistCard.sharedWishlist" });

  return (
    <div
      className={styles.card}
      onClick={() => router.push(`/wishlist/${wishlist.id}`)}
      onMouseLeave={() => setMenuKey((k) => k + 1)}
      style={{ cursor: "pointer" }}
    >
      <div className={`${styles.top} ${styles[accent]}`}>
        {hasImage && (
          <img
            src={wishlist.image_url as string}
            alt={wishlist.title}
            className={styles.coverImage}
          />
        )}
        {isShared && (
          <div
            className={styles.sharedBadge}
            aria-label={sharedTooltip}
            title={sharedTooltip}
          >
            <Link2 size={12} />
            <span>{t("Shared", { $id: "wishlistCard.shared" })}</span>
            <span className={styles.sharedTooltip} role="tooltip">
              {sharedTooltip}
            </span>
          </div>
        )}
        {!hasImage && <Gift size={40} className={styles.icon} />}
      </div>

      <div className={styles.content}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{wishlist.title}</h3>
          {showMenu && (
            <div
              className={styles.menuWrap}
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu
                key={menuKey}
                trigger={({ toggle, open }) => (
                  <button
                    type="button"
                    className={`${styles.menuButton} iconTooltipTrigger`}
                    aria-label={t("Wishlist actions", {
                      $id: "wishlist.header.moreAria",
                    })}
                    data-tooltip={t("More options", {
                      $id: "itemCard.moreOptions",
                    })}
                    aria-expanded={open}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle();
                    }}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                )}
                className={styles.menuDropdown}
              >
                {onEdit && (
                  <DropdownMenuItem variant="edit" onClick={() => onEdit()}>
                    <span>{t("Edit", { $id: "common.edit" })}</span>
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem variant="danger" onClick={() => onDelete()}>
                    <span>{t("Delete", { $id: "common.delete" })}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className={styles.meta}>
          <span className={styles.items}>
            {itemsCount === 1
              ? t("{n} item", { n: itemsCount, $id: "wishlist.itemCount.one" })
              : t("{n} items", {
                  n: itemsCount,
                  $id: "wishlist.itemCount.other",
                })}
          </span>

          <span className={styles.visibility}>
            <VisibilityIcon size={14} />
            {visibilityLabels[visibility]}
          </span>
        </div>
      </div>
    </div>
  );
}
