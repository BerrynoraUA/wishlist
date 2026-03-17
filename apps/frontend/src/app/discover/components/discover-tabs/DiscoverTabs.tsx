import styles from "./DiscoverTabs.module.scss";

type Props = {
  active: "wishlists" | "reserved";
  wishlistsCount: number;
  reservedCount: number;
  onChange: (v: "wishlists" | "reserved") => void;
};

export function DiscoverTabs({
  active,
  wishlistsCount,
  reservedCount,
  onChange,
}: Props) {
  return (
    <div className={styles.tabs}>
      <button
        className={active === "wishlists" ? styles.active : ""}
        onClick={() => onChange("wishlists")}
      >
        All Wishlists <span>{wishlistsCount}</span>
      </button>

      <button
        className={active === "reserved" ? styles.active : ""}
        onClick={() => onChange("reserved")}
      >
        Reserved <span className={styles.badge}>{reservedCount}</span>
      </button>
    </div>
  );
}
