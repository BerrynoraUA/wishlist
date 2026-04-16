import styles from "./ItemsHeader.module.scss";
import { Button } from "@/components/ui/Button/Button";

export function ItemsHeader() {
  return (
    <div className={styles.header}>
      <div>
        <h1>Items</h1>
        <p>Add products from links and manage your wishlist.</p>
      </div>

      <Button className={styles.button}>Add Item</Button>
    </div>
  );
}
