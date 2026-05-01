import { Skeleton, TextBone } from "@/components/ui/Skeleton/Skeleton";
import headerStyles from "../friends-header/FriendsHeader.module.scss";
import cardStyles from "../friend-card/FriendCard.module.scss";
import tabsStyles from "@/components/ui/Tabs/Tabs.module.scss";

/*
 * Renders the real DOM and classes of each friends component so
 * the box model during loading matches the loaded state exactly.
 */

export function FriendsHeaderSkeleton() {
  return (
    <div className={headerStyles.header}>
      <div>
        <h1>
          <TextBone width={150} />
        </h1>
        <p>
          <TextBone width={340} />
        </p>
      </div>
      {/* Button md: padding 10×20 + fs-body 14 → ~40 */}
      <Skeleton variant="pill" width={160} height={40} />
    </div>
  );
}

export function FriendsTabsSkeleton() {
  return (
    <div
      className={`${tabsStyles.tabs} ${tabsStyles.sm}`}
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      {[112, 108, 96].map((w, i) => (
        <div key={i} className={tabsStyles.tab} style={{ cursor: "default" }}>
          <TextBone width={w} />
        </div>
      ))}
    </div>
  );
}

export function FriendCardSkeleton() {
  return (
    <div className={cardStyles.card} style={{ cursor: "default" }}>
      <Skeleton variant="circle" width={42} height={42} style={{ flexShrink: 0 }} />
      <div className={cardStyles.info}>
        <strong>
          <TextBone width="60%" />
        </strong>
        <span>
          <TextBone width="40%" />
        </span>
        <div className={cardStyles.meta}>
          <TextBone width="75%" />
        </div>
      </div>
      <Skeleton variant="circle" width={32} height={32} style={{ flexShrink: 0 }} />
    </div>
  );
}

export function FriendsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 16,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <FriendCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function FriendsSkeleton() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
      <FriendsHeaderSkeleton />
      <FriendsTabsSkeleton />
      <FriendsGridSkeleton />
    </main>
  );
}
