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
import { useSearchWishlists } from "@/hooks/use-wishlists";

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
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const isSearchVisible =
    pathname === "/home" || (pathname?.startsWith("/friends/") ?? false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!isSearchVisible) {
      setQuery("");
      setDebouncedQuery("");
      setShowResults(false);
    } else {
      const initial = searchParams.get("search") ?? "";
      setQuery(initial);
      setDebouncedQuery(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearchVisible]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { data: results = [] } = useSearchWishlists(
    isSearchVisible ? debouncedQuery : "",
  );

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
              <div className={styles.search} ref={searchRef}>
                <Search size={16} />
                <input
                  placeholder="Search wishlists..."
                  value={query}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuery(val);
                    setShowResults(true);
                    const params = new URLSearchParams(searchParams.toString());
                    if (val) params.set("search", val);
                    else params.delete("search");
                    router.replace(`${pathname}?${params.toString()}`, {
                      scroll: false,
                    });
                  }}
                  onFocus={() => query && setShowResults(true)}
                />

                {showResults && debouncedQuery && (
                  <div className={styles.searchDropdown}>
                    {results.length === 0 ? (
                      <div className={styles.searchEmpty}>No wishlists found</div>
                    ) : (
                      results.map((w) => (
                        <div
                          key={w.id}
                          className={styles.searchItem}
                          onClick={() => {
                            router.push(`/wishlist/${w.id}`);
                            setQuery("");
                            setShowResults(false);
                          }}
                        >
                          <strong>{w.title}</strong>
                          <span>{w.itemsCount ?? 0} items</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
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
