import { Skeleton, TextBone } from "@/components/ui/Skeleton/Skeleton";
import headerStyles from "../discover-header/DiscoverHeader.module.scss";
import upcomingStyles from "../upcoming-events/UpcomingEvents.module.scss";
import sectionStyles from "../discover-section/DiscoverSection.module.scss";
import gridStyles from "../reserved-items-grid/ReservedItemsGrid.module.scss";
import itemStyles from "@/components/shared/ItemCard/ItemCard.module.scss";
import tabsStyles from "@/components/ui/Tabs/Tabs.module.scss";

/*
 * Renders the real DOM + classes of each discover component so the
 * loaded content lands exactly in place (no post-load jump/flicker).
 */

export function DiscoverHeaderSkeleton() {
  return (
    <div className={headerStyles.header}>
      <h1>
        <TextBone width={170} />
      </h1>
      <p>
        <TextBone width={360} />
      </p>
    </div>
  );
}

export function UpcomingEventsSkeleton() {
  return (
    <div className={upcomingStyles.card} aria-hidden="true">
      <div className={upcomingStyles.titleRow}>
        <div
          className={upcomingStyles.iconCircle}
          style={{
            background: "transparent",
            border: "none",
            boxShadow: "none",
            cursor: "default",
          }}
        >
          <Skeleton width={36} height={36} style={{ borderRadius: 12 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>
            <TextBone width={170} />
          </strong>
          <p>
            <TextBone width="70%" />
          </p>
        </div>
      </div>

      <div className={upcomingStyles.dates}>
        <span>
          <TextBone width={120} />
        </span>
        <span>
          <TextBone width={140} />
        </span>
      </div>
    </div>
  );
}

export function DiscoverFiltersSkeleton() {
  return (
    <div
      className={`${tabsStyles.tabs} ${tabsStyles.sm}`}
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      {[140, 120, 120, 120].map((w, i) => (
        <div key={i} className={tabsStyles.tab} style={{ cursor: "default" }}>
          <TextBone width={w} />
        </div>
      ))}
    </div>
  );
}

export function ItemCardSkeleton() {
  return (
    <div className={itemStyles.card} style={{ cursor: "default" }}>
      <div className={itemStyles.imageWrapper}>
        <Skeleton width="100%" height="100%" style={{ display: "block", borderRadius: 0 }} />
      </div>
      <div className={itemStyles.info}>
        <strong>
          <TextBone width="88%" />
        </strong>
        <div className={itemStyles.metaRow}>
          <span className={itemStyles.price}>
            <TextBone width={60} />
          </span>
          <span className={itemStyles.store}>
            <TextBone width={90} />
          </span>
        </div>
      </div>
    </div>
  );
}

export function DiscoverSectionSkeleton() {
  return (
    <section className={sectionStyles.section}>
      <header>
        <div className={sectionStyles.meta}>
          <div className={sectionStyles.identity}>
            <Skeleton variant="circle" width={36} height={36} style={{ flexShrink: 0 }} />
            <div className={sectionStyles.title}>
              <div className={sectionStyles.titleRow}>
                <span className={sectionStyles.owner}>
                  <TextBone width={140} />
                </span>
                <span className={sectionStyles.wishlist}>
                  <TextBone width={120} />
                </span>
              </div>
              <span className={sectionStyles.subline}>
                <TextBone width={130} />
              </span>
            </div>
          </div>
        </div>
        <span className={sectionStyles.viewAll}>
          <TextBone width={70} />
        </span>
      </header>
      <div className={gridStyles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <ItemCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function ReservedGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={gridStyles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <ItemCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DiscoverSkeleton() {
  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <DiscoverHeaderSkeleton />
      <UpcomingEventsSkeleton />
      <DiscoverFiltersSkeleton />
      {[0, 1].map((s) => (
        <DiscoverSectionSkeleton key={s} />
      ))}
    </main>
  );
}
