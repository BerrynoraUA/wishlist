import { Skeleton, TextBone } from "@/components/ui/Skeleton/Skeleton";
import dashboardStyles from "../dashboard-header/DashboardHeader.module.scss";
import statsStyles from "../stats-row/StatsRow.module.scss";
import statCardStyles from "../stat-card/StatCard.module.scss";
import gridStyles from "../wishlist-grid/WishlistGrid.module.scss";
import cardStyles from "../wishlist-card/WishlistCard.module.scss";

/*
 * Skeletons render the EXACT DOM and CSS classes of the real components,
 * with TextBone placed inside the real h1/p/strong/span/h3 elements.
 * Because TextBone is an inline-block with \u00A0 content, it inherits
 * the parent's font-size × line-height precisely, so the final text
 * lands in the same box — no width/height jump on handoff.
 */

export function DashboardHeaderSkeleton() {
  return (
    <div className={dashboardStyles.header}>
      <div>
        <h1>
          <TextBone width={280} />
        </h1>
        <p>
          <TextBone width={360} />
        </p>
      </div>

      <div className={dashboardStyles.actions}>
        {/* Button size="sm": padding 7×16 + fs-label 13 → ~36 */}
        <Skeleton variant="pill" width={168} height={36} />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className={statCardStyles.card}>
      <div className={statCardStyles.iconWrapper} style={{ background: "transparent" }}>
        <Skeleton width={44} height={44} style={{ borderRadius: 14 }} />
      </div>

      <div className={statCardStyles.text}>
        <strong>
          <TextBone width={64} />
        </strong>
        <span>
          <TextBone width={92} />
        </span>
      </div>
    </div>
  );
}

export function StatsRowSkeleton() {
  return (
    <div className={statsStyles.row}>
      {[0, 1, 2, 3].map((i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function WishlistGridToolbarSkeleton() {
  return (
    <div className={gridStyles.toolbar}>
      <h2 className={gridStyles.title}>
        <TextBone width={120} />
      </h2>
      <Skeleton variant="pill" width={260} height={40} style={{ flexShrink: 0 }} />
    </div>
  );
}

export function WishlistCardSkeleton() {
  return (
    <div className={cardStyles.card} style={{ cursor: "default" }}>
      <div
        style={{
          height: 120,
          borderRadius: "16px 16px 0 0",
          overflow: "hidden",
        }}
      >
        <Skeleton width="100%" height="100%" style={{ display: "block", borderRadius: 0 }} />
      </div>
      <div className={cardStyles.content}>
        <div className={cardStyles.titleRow}>
          <h3 className={cardStyles.title}>
            <TextBone width="70%" />
          </h3>
        </div>
        <div className={cardStyles.meta}>
          <span className={cardStyles.items}>
            <TextBone width={64} />
          </span>
          <span className={cardStyles.visibility}>
            <TextBone width={80} />
          </span>
        </div>
      </div>
    </div>
  );
}

export function WishlistGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={gridStyles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <WishlistCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      <DashboardHeaderSkeleton />
      <StatsRowSkeleton />
      <div>
        <WishlistGridToolbarSkeleton />
        <WishlistGridSkeleton />
      </div>
    </main>
  );
}
