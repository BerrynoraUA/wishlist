"use client";

import styles from "./TopNav.module.scss";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Gift, Users, Heart, Search } from "lucide-react";
import { ProfileMenu } from "../profile/ProfileMenu";
import { NotificationsMenu } from "../notifications/NotificationsMenu";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { label: "My Wishlists", href: "/home", icon: <Gift size={16} /> },
  { label: "Friends", href: "/friends", icon: <Users size={16} /> },
  { label: "Discover", href: "/discover", icon: <Heart size={16} /> },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const previousSearchModeRef = useRef<"home" | "friends" | "discover" | null>(null);
  const discoverTab = searchParams.get("tab");

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
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, {
        scroll: false,
      });
      setQuery("");
    }
    previousSearchModeRef.current = searchMode;
  }, [searchMode, pathname, searchParams, router]);

  useEffect(() => {
    if (!isSearchVisible) {
      setQuery("");
      return;
    }

    setQuery(searchParams.get(activeSearchKey) ?? "");
  }, [isSearchVisible, searchParams, activeSearchKey]);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <Gift size={16} />
          </div>
          <span>Wishly</span>
        </div>

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
                  placeholder={
                    searchMode === "friends"
                      ? "Search friends..."
                      : searchMode === "discover"
                        ? "Search discover..."
                        : "Search wishlists..."
                  }
                  value={query}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuery(val);

                    const params = new URLSearchParams(searchParams.toString());
                    if (val) params.set(activeSearchKey, val);
                    else params.delete(activeSearchKey);

                    router.replace(
                      params.toString() ? `${pathname}?${params.toString()}` : pathname,
                      { scroll: false },
                    );
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
