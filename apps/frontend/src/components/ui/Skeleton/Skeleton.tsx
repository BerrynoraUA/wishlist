import styles from "./Skeleton.module.scss";

type Props = {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  variant?: "text" | "heading" | "circle" | "pill";
  className?: string;
  style?: React.CSSProperties;
};

export function Skeleton({ width, height, borderRadius, variant, className, style }: Props) {
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

  return <div className={classes} style={{ width, height, borderRadius, ...style }} />;
}

/**
 * Inline skeleton that inherits the exact line-box height of its parent
 * (font-size × line-height). Render it INSIDE the real text element
 * (`<h1><TextBone width={280}/></h1>`) so the skeleton occupies precisely
 * the same vertical space the final text will occupy.
 */
export function TextBone({
  width,
  className,
  style,
}: {
  width: string | number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const classes = [styles.bone, className].filter(Boolean).join(" ");
  return (
    <span
      className={classes}
      aria-hidden="true"
      style={{
        display: "inline-block",
        width,
        verticalAlign: "middle",
        borderRadius: 6,
        ...style,
      }}
    >
      {"\u00A0"}
    </span>
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
    <div className={[styles.card, className].filter(Boolean).join(" ")} style={style}>
      {children}
    </div>
  );
}
