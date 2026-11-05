"use client";

import Link from "next/link";
import { useGT } from "gt-next";
import { Gift } from "lucide-react";
import styles from "./ShareBrandBar.module.scss";

type Props = {
  signedIn: boolean;
};

/** Brand bar for the public share page, which most visitors reach before they have an account. */
export function ShareBrandBar({ signedIn }: Props) {
  const t = useGT();

  return (
    <header className={styles.bar}>
      <Link href={signedIn ? "/home" : "/"} className={styles.brand}>
        <span className={styles.brandIcon}>
          <Gift size={16} />
        </span>
        {t("Wishlane", { $id: "brand.name" })}
      </Link>
      {signedIn ? (
        <Link href="/home" className={styles.secondary}>
          {t("My Wishlists", { $id: "nav.myWishlists" })}
        </Link>
      ) : (
        <Link href="/register" className={styles.cta}>
          {t("Create your own wishlist", { $id: "share.brandBar.cta" })}
        </Link>
      )}
    </header>
  );
}
