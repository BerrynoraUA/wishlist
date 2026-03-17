"use client";

import styles from "./LoginTabs.module.scss";

type Props = {
  active: "login" | "register";
  onChange: (v: "login" | "register") => void;
};

export function LoginTabs({ active, onChange }: Props) {
  return (
    <div className={styles.tabs}>
      <button
        className={active === "login" ? styles.active : ""}
        onClick={() => onChange("login")}
      >
        Login
      </button>

      <button
        className={active === "register" ? styles.active : ""}
        onClick={() => onChange("register")}
      >
        Register
      </button>
    </div>
  );
}
