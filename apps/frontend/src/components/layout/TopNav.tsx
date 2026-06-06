"use client";

import styles from "./TopNav.module.scss";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Gift, Users, Heart, TreePine } from "lucide-react";
import { useGT } from "gt-next";
import { ProfileMenu } from "../profile/ProfileMenu";
import { NotificationsMenu } from "../notifications/NotificationsMenu";
import { ThemeToggle } from "./ThemeToggle";
import { ProBadge } from "../ui/ProBadge/ProBadge";
import { useIncomingFriendRequests } from "@/hooks/use-friends";
import { useUserGuide } from "@/components/user-guide/UserGuideProvider";

export function TopNav() {
  const t = useGT();
  const pathname = usePathname();
  const { data: incomingRequests = [] } = useIncomingFriendRequests();
  const { canNavigateTo, completeStep, currentStep } = useUserGuide();
  const requestsCount = incomingRequests.length;

  const navItems = useMemo(
    () => [
      {
        label: t("My Wishlists", { $id: "nav.myWishlists" }),
        href: "/home",
        icon: <Gift size={16} />,
        guideTarget: "nav-home",
      },
      {
        label: t("Friends", { $id: "nav.friends" }),
        href: "/friends",
        icon: <Users size={16} />,
        badgeCount: requestsCount,
        guideTarget: "nav-friends",
      },
      {
        label: t("Discover", { $id: "nav.discover" }),
        href: "/discover",
        icon: <Heart size={16} />,
        guideTarget: "nav-discover",
      },
      {
        label: t("Secret Santa", { $id: "nav.secretSanta" }),
        href: "/secret-santa",
        icon: <TreePine size={16} />,
        isNew: true,
        guideTarget: "nav-secret-santa",
      },
    ],
    [requestsCount, t],
  );

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link
          href="/home"
          className={`${styles.logo} ${!canNavigateTo("/home") ? styles.disabledLink : ""}`.trim()}
          onClick={(event) => {
            if (!canNavigateTo("/home")) event.preventDefault();
          }}
          aria-disabled={!canNavigateTo("/home")}
        >
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

        <nav className={styles.nav} data-guide-target="main-navigation">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const canNavigate = canNavigateTo(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${!canNavigate ? styles.disabledLink : ""}`.trim()}
                onClick={(event) => {
                  if (!canNavigate) event.preventDefault();
                  if (canNavigate && currentStep?.targetId === item.guideTarget) {
                    completeStep(currentStep.id);
                  }
                }}
                aria-disabled={!canNavigate}
                data-guide-target={item.guideTarget}
              >
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
                {item.badgeCount ? (
                  <span className={styles.navBadgeWrap}>
                    <span className={styles.navCountBadge}>{item.badgeCount}</span>
                  </span>
                ) : item.isNew ? (
                  <span className={styles.navBadgeWrap}>
                    <ProBadge size="sm" label={t("NEW", { $id: "nav.secretSanta.newBadge" })} />
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className={styles.right}>
          <ThemeToggle />
          <NotificationsMenu />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
