"use client";

import styles from "./ProfileMenu.module.scss";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Crown, Settings } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { logout } from "@/api/login";
import { useSubscription } from "@/hooks/use-subscription";
import { ProBadge } from "@/components/ui/ProBadge/ProBadge";
import { useProfile } from "@/hooks/use-settings";

type Props = {
  onOpen?: () => void;
};

export function ProfileMenu({ onOpen }: Props) {
  const router = useRouter();
  const { isPro } = useSubscription();
  const { data: profile } = useProfile();

  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userInitial, setUserInitial] = useState("S");

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabaseBrowser.auth
      .getUser()
      .then(({ data }) => {
        const email = data.user?.email;
        if (email) {
          setUserEmail(email);
          setUserInitial(email.charAt(0).toUpperCase());
        }
      })
      .catch(() => {
        setUserEmail("");
      });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      setOpen(false);
      router.push("/login");
    } catch (error) {
      console.error("Failed to logout", error);
    } finally {
      setIsLoggingOut(false);
    }
  }

  function toggleOpen() {
    if (!open && onOpen) onOpen();
    setOpen((prev) => !prev);
  }

  const avatarUrl = profile?.avatar_url ?? null;
  const displayInitial = (
    profile?.display_name ??
    profile?.nickname ??
    userEmail ??
    userInitial ??
    "S"
  )
    .charAt(0)
    .toUpperCase();

  return (
    <div className={styles.profile} ref={ref}>
      <button
        type="button"
        className={styles.avatarButton}
        onClick={toggleOpen}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Avatar" className={styles.avatarImg} />
        ) : (
          displayInitial
        )}
        {isPro && (
          <span className={styles.avatarProBadge}>
            <ProBadge size="sm" />
          </span>
        )}
      </button>

      {open && (
        <div className={styles.profileMenu}>
          <div className={styles.profileHeader}>
            <div className={styles.profileInitial}>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className={styles.avatarImg}
                />
              ) : (
                displayInitial
              )}
            </div>
            <div className={styles.profileMeta}>
              <span className={styles.profileName}>Account</span>
              <span className={styles.profileEmail}>
                {userEmail || "Signed in"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className={styles.menuItemSub}
            onClick={() => {
              setOpen(false);
              router.push("/subscription");
            }}
          >
            <Crown size={16} />
            <span>Subscription</span>
            {isPro && <ProBadge size="sm" />}
          </button>

          <button
            type="button"
            className={styles.menuItemSub}
            onClick={() => {
              setOpen(false);
              router.push("/settings");
            }}
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>

          <button
            type="button"
            className={styles.menuItem}
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut size={16} />
            <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
