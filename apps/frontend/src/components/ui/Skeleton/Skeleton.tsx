import styles from "./Skeleton.module.scss";

type Props = {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  variant?: "text" | "heading" | "circle" | "pill";
  className?: string;
  style?: React.CSSProperties;
};

export function Skeleton({
  width,
  height,
  borderRadius,
  variant,
  className,
  style,
}: Props) {
  const classes = [
    styles.bone,
    variant === "circle" && styles.circle,
    variant === "pill" && styles.pill,
    variant === "text" && styles.text,
    variant === "heading" && styles.heading,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export function SkeletonCard({
  children,
  className,
  style,
}: {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={[styles.card, className].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
    </div>
  );
}
