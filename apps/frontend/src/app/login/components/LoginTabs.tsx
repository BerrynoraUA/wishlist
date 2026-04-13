"use client";

import { useGT } from "gt-next";
import styles from "./LoginTabs.module.scss";

type Props = {
  active: "login" | "register";
  onChange: (v: "login" | "register") => void;
};

export function LoginTabs({ active, onChange }: Props) {
  const t = useGT();
  return (
    <div className={styles.tabs}>
      <button className={active === "login" ? styles.active : ""} onClick={() => onChange("login")}>
        {t("Login", { $id: "login.tabs.login" })}
      </button>

      <button
        className={active === "register" ? styles.active : ""}
        onClick={() => onChange("register")}
      >
        {t("Register", { $id: "login.tabs.register" })}
      </button>
    </div>
  );
}
