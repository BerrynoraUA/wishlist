"use client";

import { useGT } from "gt-next";
import { useState } from "react";
import type { ReactNode } from "react";
import styles from "../landing.module.scss";

export function MockupItem({
  emoji,
  bg,
  name,
  price,
  priority,
}: {
  emoji: string;
  bg: string;
  name: string;
  price: string;
  priority: "high" | "med" | "low";
}) {
  const priorityClass =
    priority === "high"
      ? styles.mockupPriorityHigh
      : priority === "med"
        ? styles.mockupPriorityMed
        : styles.mockupPriorityLow;

  return (
    <div className={styles.mockupItem}>
      <div className={styles.mockupItemImg} style={{ background: bg }}>
        {emoji}
      </div>
      <div className={styles.mockupItemInfo}>
        <span className={styles.mockupItemName}>{name}</span>
        <span className={styles.mockupItemPrice}>{price}</span>
      </div>
      <span className={`${styles.mockupPriority} ${priorityClass}`} />
    </div>
  );
}

export function StatItem({
  count,
  suffix,
  label,
  delay,
}: {
  count: number;
  suffix?: string;
  label: string;
  delay?: number;
}) {
  return (
    <div className={`${styles.statItem} ${styles.animateIn}`} data-delay={delay}>
      <span className={styles.statNumber}>
        <span data-count={count}>0</span>
        {suffix}
      </span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

export function SectionHeader({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionBadge}>{badge}</span>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {subtitle ? <p className={styles.sectionSubtitle}>{subtitle}</p> : null}
    </div>
  );
}

export function FeatureCard({
  icon,
  iconBg,
  iconColor,
  title,
  desc,
  delay,
}: {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  delay?: number;
}) {
  return (
    <div className={`${styles.featureCard} ${styles.animateIn}`} data-delay={delay}>
      <div className={styles.featureIcon} style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDesc}>{desc}</p>
    </div>
  );
}

export function StepDemoCreate() {
  const t = useGT();
  const colors = ["#f472b6", "#60a5fa", "#fdba74", "#6ee7b7", "#c4b5fd"];
  const [activeColor, setActiveColor] = useState(0);
  const [activePrivacy, setActivePrivacy] = useState(0);

  const privacyOptions = [
    t("Public", { $id: "landing.demo.privacy.public" }),
    t("Friends", { $id: "landing.demo.privacy.friends" }),
    t("Private", { $id: "landing.demo.privacy.private" }),
  ];

  const color = colors[activeColor];

  return (
    <div className={`${styles.stepDemo} ${styles.stepDemoCreate}`}>
      <div className={styles.demoInput}>
        <span className={styles.demoInputLabel}>
          {t("Wishlist Name", { $id: "landing.how.step1.demoLabel" })}
        </span>
        <span className={styles.demoInputValue} style={{ borderColor: color }}>
          {t("Christmas 2026", { $id: "landing.how.step1.demoValue" })}
        </span>
      </div>
      <div className={styles.demoColors}>
        {colors.map((currentColor, index) => (
          <span
            key={currentColor}
            className={`${styles.demoColor} ${index === activeColor ? styles.demoColorActive : ""}`}
            style={{
              background: currentColor,
              borderColor: index === activeColor ? currentColor : "transparent",
            }}
            onClick={() => setActiveColor(index)}
          />
        ))}
      </div>
      <div className={styles.demoPrivacy}>
        {privacyOptions.map((label, index) => (
          <span
            key={label}
            className={`${styles.demoPrivacyOption} ${index === activePrivacy ? styles.demoPrivacyOptionActive : ""}`}
            style={
              index === activePrivacy
                ? { background: `${color}18`, borderColor: color, color }
                : undefined
            }
            onClick={() => setActivePrivacy(index)}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DemoFriend({
  initial,
  bg,
  color,
  name,
  user,
}: {
  initial: string;
  bg: string;
  color: string;
  name: string;
  user: string;
}) {
  return (
    <div className={styles.demoFriend}>
      <div className={styles.demoFriendAvatar} style={{ background: bg, color }}>
        {initial}
      </div>
      <div>
        <span className={styles.demoFriendName}>{name}</span>
        <span className={styles.demoFriendUser}>{user}</span>
      </div>
    </div>
  );
}

export function DemoReserve() {
  const t = useGT();

  return (
    <div className={`${styles.stepDemo} ${styles.stepDemoReserve}`}>
      <DemoReserveItem
        emoji="Headphones"
        bg="#fde7f3"
        name={t("Sony WH-1000XM5", {
          $id: "landing.demo.reserve.item1.name",
        })}
        price="$349.99"
        active
      />
      <DemoReserveItem
        emoji="Book"
        bg="#e0f2fe"
        name={t("Atomic Habits", {
          $id: "landing.demo.reserve.item2.name",
        })}
        price="$18.99"
      />
    </div>
  );
}

function DemoReserveItem({
  emoji,
  bg,
  name,
  price,
  active,
}: {
  emoji: string;
  bg: string;
  name: string;
  price: string;
  active?: boolean;
}) {
  return (
    <div className={styles.demoReserveItem}>
      <div className={styles.demoReserveItemImg} style={{ background: bg }}>
        {emoji}
      </div>
      <div className={styles.demoReserveItemInfo}>
        <span className={styles.demoReserveItemName}>{name}</span>
        <span className={styles.demoReserveItemPrice}>{price}</span>
      </div>
      <button
        className={`${styles.demoReserveItemBtn} ${active ? styles.demoReserveItemBtnActive : ""}`}
      >
        {active ? "Reserved" : "Claim"}
      </button>
    </div>
  );
}

export function DiscoverCard({
  gradient,
  emoji,
  store,
  title,
  price,
  priority,
  delay,
}: {
  gradient: string;
  emoji: string;
  store: string;
  title: string;
  price: string;
  priority: "high" | "med" | "low";
  delay?: number;
}) {
  const t = useGT();
  const priorityClass =
    priority === "high"
      ? styles.discoverCardPriorityHigh
      : priority === "med"
        ? styles.discoverCardPriorityMed
        : styles.discoverCardPriorityLow;
  const priorityLabel =
    priority === "high"
      ? t("High", { $id: "landing.discover.priority.high" })
      : priority === "med"
        ? t("Medium", { $id: "landing.discover.priority.medium" })
        : t("Low", { $id: "landing.discover.priority.low" });

  return (
    <div className={`${styles.discoverCard} ${styles.animateIn}`} data-delay={delay}>
      <div className={styles.discoverCardImg} style={{ background: gradient }}>
        <span className={styles.discoverCardEmoji}>{emoji}</span>
      </div>
      <div className={styles.discoverCardBody}>
        <span className={styles.discoverCardStore}>{store}</span>
        <h4 className={styles.discoverCardTitle}>{title}</h4>
        <div className={styles.discoverCardFooter}>
          <span className={styles.discoverCardPrice}>{price}</span>
          <span className={`${styles.discoverCardPriority} ${priorityClass}`}>{priorityLabel}</span>
        </div>
      </div>
    </div>
  );
}

export function Testimonial({
  text,
  name,
  role,
  initial,
  bg,
  color,
  delay,
}: {
  text: string;
  name: string;
  role: string;
  initial: string;
  bg: string;
  color: string;
  delay?: number;
}) {
  return (
    <div className={`${styles.testimonial} ${styles.animateIn}`} data-delay={delay}>
      <div className={styles.testimonialStars}>*****</div>
      <p className={styles.testimonialText}>{text}</p>
      <div className={styles.testimonialAuthor}>
        <div className={styles.testimonialAvatar} style={{ background: bg, color }}>
          {initial}
        </div>
        <div>
          <span className={styles.testimonialName}>{name}</span>
          <span className={styles.testimonialRole}>{role}</span>
        </div>
      </div>
    </div>
  );
}
