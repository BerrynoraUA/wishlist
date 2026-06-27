import type { SecretSantaPerson } from "@wishlist/backend/types/secret-santa";
import styles from "./SecretSantaPersonAvatar.module.scss";

type Props = {
  person: SecretSantaPerson;
  size?: "sm" | "md";
};

export function SecretSantaPersonAvatar({ person, size = "sm" }: Props) {
  const initial = (person.display_name ?? person.nickname ?? "?").charAt(0).toUpperCase();

  const className = size === "md" ? styles.avatarMd : styles.avatarSm;

  if (person.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={person.avatar_url} alt="" className={className} />
    );
  }

  return <div className={`${styles.fallback} ${className}`}>{initial}</div>;
}
