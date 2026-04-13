import styles from "./FileSizeBadge.module.scss";
import { MAX_IMAGE_UPLOAD_LABEL } from "@/lib/image-upload";

type Props = {
  className?: string;
  children?: string;
};

export function FileSizeBadge({ className, children }: Props) {
  return (
    <span className={`${styles.badge} ${className ?? ""}`.trim()}>
      {children ?? MAX_IMAGE_UPLOAD_LABEL}
    </span>
  );
}
