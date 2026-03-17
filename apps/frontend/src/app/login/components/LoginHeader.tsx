import styles from "./LoginHeader.module.scss";

export function LoginHeader() {
  return (
    <div className={styles.header}>
      <div>
        <h1>Welcome back</h1>
        <p>Sign in to manage your wishlists or create a new account.</p>
      </div>
    </div>
  );
}
