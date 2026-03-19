"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "./login.module.scss";
import { LoginHeader } from "./components/LoginHeader";
import { LoginTabs } from "./components/LoginTabs";
import { AuthForm } from "./components/AuthForm";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"login" | "register">("login");

  const redirectTo = useMemo(
    () => searchParams.get("redirect_to") || "/home",
    [searchParams],
  );

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <LoginHeader />
        <LoginTabs active={tab} onChange={setTab} />
        <div className={styles.cardWrap}>
          <AuthForm
            mode={tab}
            redirectTo={redirectTo}
            onLoginSuccess={(target) => router.replace(target)}
          />
        </div>
      </div>
    </main>
  );
}
