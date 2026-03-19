"use client";

import styles from "./WishlistHeader.module.scss";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Gift,
  KeyRound,
  MoreHorizontal,
  Share2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Wishlist } from "@/types/wishlist";
import { accentClass } from "@/lib/helpers/wishlist-helper";
import { WishlistInfo } from "./WishlistInfo";

type Props = {
  wishlist: Wishlist;
  onAddItem?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onManageAccess?: () => void;
  isOwner?: boolean;
};

export function WishlistHeader({
  wishlist,
  onAddItem,
  onEdit,
  onDelete,
  onShare,
  onManageAccess,
  isOwner = false,
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const showActions = Boolean(onShare || onManageAccess || onEdit || onDelete);
  const showMenu = Boolean(onEdit || onDelete);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const accent = accentClass[wishlist.accent_type] ?? "pink";
  return (
    <div className={styles.header}>
      <div className={`${styles.banner} ${styles[accent]}`}>
        <div className={styles.bannerInner}>
          <button className={styles.back} onClick={() => router.push("/home")}>
            <ArrowLeft size={18} />
          </button>

          <div className={styles.bannerIcon}>
            <Gift size={32} />
          </div>

          {showActions && (
            <div className={styles.bannerActions}>
              {onShare && (
                <button
                  className={styles.menuButton}
                  onClick={onShare}
                  aria-label="Share wishlist"
                >
                  <Share2 size={18} />
                </button>
              )}
              {onManageAccess && (
                <button
                  className={styles.menuButton}
                  onClick={onManageAccess}
                  aria-label="Manage wishlist access"
                >
                  <KeyRound size={18} />
                </button>
              )}
              {showMenu && (
                <div className={styles.menuWrapper} ref={menuRef}>
                  <button
                    className={styles.menuButton}
                    onClick={() => setMenuOpen((prev) => !prev)}
                    aria-label="Wishlist actions"
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {menuOpen && (
                    <div className={styles.menuDropdown}>
                      {onEdit && (
                        <button
                          type="button"
                          className={styles.menuItem}
                          onClick={() => {
                            setMenuOpen(false);
                            onEdit();
                          }}
                        >
                          <span>Edit wishlist</span>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          className={`${styles.menuItem} ${styles.dangerItem}`}
                          onClick={() => {
                            setMenuOpen(false);
                            onDelete();
                          }}
                        >
                          <span>Delete wishlist</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <WishlistInfo
        wishlist={wishlist}
        isOwner={isOwner}
        onAddItem={onAddItem}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
