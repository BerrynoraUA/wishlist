import styles from "./ItemsHeader.module.scss";

export function ItemsHeader() {
  return (
    <div className={styles.header}>
      <div>
        <h1>Items</h1>
        <p>Add products from links and manage your wishlist.</p>
      </div>

      <button className={styles.button}>Add Item</button>
    </div>
  );
}
