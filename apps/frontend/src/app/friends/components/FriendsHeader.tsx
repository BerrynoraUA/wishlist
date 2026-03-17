import styles from "./FriendsHeader.module.scss";
import { Button } from "@/components/ui/Button/Button";

type Props = {
  onInvite: () => void;
};

export function FriendsHeader({ onInvite }: Props) {
  return (
    <div className={styles.header}>
      <div>
        <h1>Friends</h1>
        <p>Connect with friends and discover their wishlists.</p>
      </div>

      <Button onClick={onInvite}>Invite Friends</Button>
    </div>
  );
}
