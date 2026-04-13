"use client";

import styles from "./TopNav.module.scss";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Gift, Users, Heart, Search } from "lucide-react";
import { useGT } from "gt-next";
import { ProfileMenu } from "../profile/ProfileMenu";
import { NotificationsMenu } from "../notifications/NotificationsMenu";
import { ThemeToggle } from "./ThemeToggle";
import { ProBadge } from "../ui/ProBadge/ProBadge";

export function TopNav() {
  const t = useGT();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const previousSearchModeRef = useRef<"home" | "friends" | "discover" | null>(
    null,
  );
  const discoverTab = searchParams.get("tab");

  const navItems = useMemo(
    () => [
      {
        label: t("My Wishlists", { $id: "nav.myWishlists" }),
        href: "/home",
        icon: <Gift size={16} />,
      },
      {
        label: t("Friends", { $id: "nav.friends" }),
        href: "/friends",
        icon: <Users size={16} />,
      },
      {
        label: t("Discover", { $id: "nav.discover" }),
        href: "/discover",
        icon: <Heart size={16} />,
      },
    ],
    [t],
  );

  const searchMode =
    pathname === "/home"
      ? "home"
      : pathname === "/discover"
        ? "discover"
        : pathname === "/friends"
          ? "friends"
          : null;
  const isSearchVisible = searchMode !== null;
  const activeSearchKey =
    searchMode === "discover"
      ? discoverTab === "reserved"
        ? "reservedSearch"
        : discoverTab === "purchased"
          ? "purchasedSearch"
          : "discoverSearch"
      : "search";

  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isTypingRef = useRef(false);
  const searchParamsRef = useRef(searchParams);
  const pathnameRef = useRef(pathname);
  searchParamsRef.current = searchParams;
  pathnameRef.current = pathname;

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const debouncedUpdateUrl = useCallback(
    (val: string, key: string) => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      isTypingRef.current = true;
      searchTimerRef.current = setTimeout(() => {
        isTypingRef.current = false;
        const params = new URLSearchParams(searchParamsRef.current.toString());
        if (val) params.set(key, val);
        else params.delete(key);
        router.replace(
          params.toString()
            ? `${pathnameRef.current}?${params.toString()}`
            : pathnameRef.current,
          { scroll: false },
        );
      }, 300);
    },
    [router],
  );

  const searchPlaceholder = useMemo(() => {
    if (searchMode === "friends") {
      return t("Search friends...", { $id: "nav.searchFriends" });
    }
    if (searchMode === "discover") {
      return t("Search discover...", { $id: "nav.searchDiscover" });
    }
    return t("Search wishlists...", { $id: "nav.searchWishlists" });
  }, [searchMode, t]);

  function clearSearchParams(params: URLSearchParams) {
    params.delete("search");
    params.delete("discoverSearch");
    params.delete("reservedSearch");
    params.delete("purchasedSearch");
  }

  useEffect(() => {
    const previousMode = previousSearchModeRef.current;
    if (previousMode && previousMode !== searchMode) {
      const params = new URLSearchParams(searchParams.toString());
      clearSearchParams(params);
      router.replace(
        params.toString() ? `${pathname}?${params.toString()}` : pathname,
        {
          scroll: false,
        },
      );
      setQuery("");
    }
    previousSearchModeRef.current = searchMode;
  }, [searchMode, pathname, searchParams, router]);

  useEffect(() => {
    if (isTypingRef.current) return;
    if (!isSearchVisible) {
      setQuery("");
      return;
    }

    setQuery(searchParams.get(activeSearchKey) ?? "");
  }, [isSearchVisible, searchParams, activeSearchKey]);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/home" className={styles.logo}>
          <div className={styles.logoIconWrap}>
            <div className={styles.logoIcon}>
              <Gift size={16} />
            </div>
          </div>
          <span className={styles.logoText}>
            {t("Wishlane", { $id: "brand.name" })}
            <span className={styles.logoBetaBadge}>
              <ProBadge
                size="sm"
                label={
                  typeof window !== "undefined" &&
                  window.location.hostname === "staging.wishlane.net"
                    ? "STAGING"
                    : t("BETA", { $id: "nav.betaBadge" })
                }
              />
            </span>
          </span>
        </Link>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link key={item.href} href={item.href} className={styles.navItem}>
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className={styles.activePill}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 32,
                    }}
                  />
                )}

                <span className={styles.icon}>{item.icon}</span>
                <span className={styles.label}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.right}>
          <div className={styles.searchSlot}>
            {isSearchVisible ? (
              <div className={styles.search}>
                <Search size={16} />
                <input
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuery(val);
                    debouncedUpdateUrl(val, activeSearchKey);
                  }}
                />
              </div>
            ) : (
              <div className={styles.searchPlaceholder} aria-hidden="true" />
            )}
          </div>

          <ThemeToggle />
          <NotificationsMenu />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
