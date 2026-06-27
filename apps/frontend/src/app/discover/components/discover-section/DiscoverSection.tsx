"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGT } from "gt-next";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import styles from "./DiscoverSection.module.scss";
import { ItemCard, normalizeDiscoverItem } from "@/components/shared/ItemCard";
import { ItemDetailModal } from "../item-detail-modal/ItemDetailModal";
import { DiscoverSection as Section } from "@/api/types/wishilst";

const SCROLL_EDGE_THRESHOLD = 15;
const SCROLL_AMOUNT_RATIO = 0.5;
const MIN_SCROLL_AMOUNT = 220;
const MAX_SCROLL_AMOUNT = 390;
const SCROLL_ANIMATION_MIN_DURATION = 300;
const SCROLL_ANIMATION_MAX_DURATION = 460;

type ScrollState = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

type Props = Section & {
  onToggleReserve?: (itemId: string) => void;
  onToggleBought?: (itemId: string) => void;
  avatarUrl?: string | null;
  showDiscountBadge?: boolean;
};

export function DiscoverSection({
  owner,
  username,
  avatar_url,
  wishlist,
  wishlist_id,
  date,
  friend_id,
  items,
  avatarUrl,
  onToggleReserve,
  onToggleBought,
  showDiscountBadge = false,
}: Props) {
  const t = useGT();
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const scrollStateFrameRef = useRef<number | null>(null);
  const scrollStateRef = useRef<ScrollState>({
    canScrollLeft: false,
    canScrollRight: false,
  });
  const [scrollState, setScrollState] = useState<ScrollState>(scrollStateRef.current);
  const itemCount = items.length;
  const resolvedAvatarUrl = avatarUrl ?? avatar_url ?? null;

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    const canScroll = maxScrollLeft > 1;
    const scrollLeft = track.scrollLeft;
    const nextScrollState = {
      canScrollLeft: canScroll && scrollLeft > SCROLL_EDGE_THRESHOLD,
      canScrollRight: canScroll && scrollLeft < maxScrollLeft - SCROLL_EDGE_THRESHOLD,
    };

    if (
      scrollStateRef.current.canScrollLeft === nextScrollState.canScrollLeft &&
      scrollStateRef.current.canScrollRight === nextScrollState.canScrollRight
    ) {
      return;
    }

    scrollStateRef.current = nextScrollState;
    setScrollState(nextScrollState);
  }, []);

  const scheduleScrollStateUpdate = useCallback(() => {
    if (scrollStateFrameRef.current !== null) {
      return;
    }

    scrollStateFrameRef.current = window.requestAnimationFrame(() => {
      scrollStateFrameRef.current = null;
      updateScrollState();
    });
  }, [updateScrollState]);

  useEffect(() => {
    updateScrollState();

    const track = trackRef.current;

    if (!track) {
      return;
    }

    track.addEventListener("scroll", scheduleScrollStateUpdate, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      track.removeEventListener("scroll", scheduleScrollStateUpdate);
      window.removeEventListener("resize", updateScrollState);

      if (scrollAnimationRef.current !== null) {
        window.cancelAnimationFrame(scrollAnimationRef.current);
      }

      if (scrollStateFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollStateFrameRef.current);
      }
    };
  }, [items.length, scheduleScrollStateUpdate, updateScrollState]);

  const scrollItems = useCallback(
    (direction: "left" | "right") => {
      const track = trackRef.current;

      if (!track) {
        return;
      }

      if (scrollAnimationRef.current !== null) {
        window.cancelAnimationFrame(scrollAnimationRef.current);
      }

      const scrollAmount = Math.min(
        MAX_SCROLL_AMOUNT,
        Math.max(MIN_SCROLL_AMOUNT, track.clientWidth * SCROLL_AMOUNT_RATIO),
      );
      const start = track.scrollLeft;
      const maxScrollLeft = track.scrollWidth - track.clientWidth;
      const target = Math.min(
        maxScrollLeft,
        Math.max(0, start + (direction === "left" ? -scrollAmount : scrollAmount)),
      );

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        track.scrollLeft = target;
        updateScrollState();
        return;
      }

      const distance = Math.abs(target - start);
      const duration = Math.min(
        SCROLL_ANIMATION_MAX_DURATION,
        Math.max(SCROLL_ANIMATION_MIN_DURATION, distance * 1.15),
      );
      const startedAt = performance.now();
      const easeSmoothStep = (progress: number) => progress * progress * (3 - 2 * progress);

      const animate = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);

        track.scrollLeft = start + (target - start) * easeSmoothStep(progress);

        if (progress < 1) {
          scrollAnimationRef.current = window.requestAnimationFrame(animate);
          return;
        }

        scrollAnimationRef.current = null;
        updateScrollState();
      };

      scrollAnimationRef.current = window.requestAnimationFrame(animate);
    },
    [updateScrollState],
  );

  return (
    <section className={styles.section}>
      <header>
        <div className={styles.meta}>
          <div className={styles.identity}>
            <span
              className={`${styles.avatar} ${friend_id ? styles.avatarClickable : ""}`}
              role={friend_id ? "link" : undefined}
              aria-label={friend_id ? owner : undefined}
              onClick={() => {
                if (friend_id) {
                  router.push(`/friends/${friend_id}`);
                }
              }}
            >
              {resolvedAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolvedAvatarUrl} alt="" className={styles.avatarImg} />
              ) : (
                <UserRound size={16} />
              )}
            </span>

            <div className={styles.title}>
              <div className={styles.titleRow}>
                {friend_id ? (
                  <Link href={`/friends/${friend_id}`} className={styles.ownerLink}>
                    {owner}
                  </Link>
                ) : (
                  <span className={styles.owner}>{owner}</span>
                )}
                <span className={styles.arrow} aria-hidden="true">
                  &gt;
                </span>
              </div>

              <span className={styles.subline}>
                @{username}
                {date && ` · ${date}`}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.headerAside}>
          <span className={styles.wishlist}>{wishlist}</span>

          {wishlist_id ? (
            <Link href={`/wishlist/${wishlist_id}`} className={styles.viewAll}>
              {t("View all {count}", {
                count: itemCount,
                $id: "discover.section.viewAll",
              })}
            </Link>
          ) : friend_id ? (
            <Link href={`/friends/${friend_id}`} className={styles.viewAll}>
              {t("View all {count}", {
                count: itemCount,
                $id: "discover.section.viewAll",
              })}
            </Link>
          ) : (
            <span className={styles.viewAll}>
              {t("View all ({count})", {
                count: itemCount,
                $id: "discover.section.viewAllParen",
              })}
            </span>
          )}
        </div>
      </header>

      <div className={styles.carousel}>
        {scrollState.canScrollLeft && (
          <button
            type="button"
            className={`${styles.scrollButton} ${styles.scrollButtonLeft}`}
            aria-label={t("Scroll gifts left", { $id: "discover.section.scrollLeft" })}
            onClick={() => scrollItems("left")}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
        )}

        <div ref={trackRef} className={styles.grid}>
          {items.map((item) => (
            <div className={styles.item} key={item.id}>
              <ItemCard
                {...normalizeDiscoverItem(item)}
                variant="discover"
                showDiscountBadge={showDiscountBadge}
                onToggleReserve={onToggleReserve}
                onToggleBought={onToggleBought}
                renderDetailModal={({ open, onClose }) => (
                  <ItemDetailModal
                    open={open}
                    onClose={onClose}
                    item={item}
                    onToggleReserve={onToggleReserve}
                    onToggleBought={onToggleBought}
                  />
                )}
              />
            </div>
          ))}
        </div>

        {scrollState.canScrollRight && (
          <button
            type="button"
            className={`${styles.scrollButton} ${styles.scrollButtonRight}`}
            aria-label={t("Scroll gifts right", { $id: "discover.section.scrollRight" })}
            onClick={() => scrollItems("right")}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
