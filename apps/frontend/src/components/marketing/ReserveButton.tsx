"use client";

import { motion } from "framer-motion";
import { useGT } from "gt-next";
import { ReservationLockIcon } from "@/components/ui/ReservationLockIcon/ReservationLockIcon";
import styles from "./marketing.module.scss";
import { pressSpring, tap } from "./motion";

type Props = {
  reserved: boolean;
  onToggle: () => void;
  /** Id of the item name, so "Reserve" is announced with what it reserves. */
  describedBy?: string;
};

/** The app's Reserve button: lock icon that snaps shut, pink once reserved. */
export function ReserveButton({ reserved, onToggle, describedBy }: Props) {
  const t = useGT();

  return (
    <motion.button
      type="button"
      className={styles.reserveBtn}
      data-reserved={reserved}
      aria-pressed={reserved}
      aria-describedby={describedBy}
      onClick={onToggle}
      whileTap={tap}
      transition={pressSpring}
    >
      <ReservationLockIcon isReserved={reserved} size={15} animateOnReserve />
      <span>
        {reserved
          ? t("Reserved", { $id: "marketing.demo.reserved" })
          : t("Reserve", { $id: "marketing.demo.reserve" })}
      </span>
    </motion.button>
  );
}
