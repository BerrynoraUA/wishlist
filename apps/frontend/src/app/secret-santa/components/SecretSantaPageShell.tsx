import type { ReactNode } from "react";
import styles from "./SecretSantaPageShell.module.scss";

type Props = {
  children: ReactNode;
  narrow?: boolean;
};

export function SecretSantaPageShell({ children, narrow = false }: Props) {
  return <main className={narrow ? styles.shellNarrow : styles.shell}>{children}</main>;
}
