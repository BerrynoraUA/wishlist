"use client";

import { useGT } from "gt-next";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import styles from "./login.module.scss";
import { LoginHeader } from "./components/LoginHeader";
import { LoginTabs } from "./components/LoginTabs";
import { AuthForm } from "./components/AuthForm";

function LoginPageContent() {
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

function LoginPageFallback() {
  const t = useGT();
  return (
    <main className={styles.page}>
      <p>{t("Loading login...", { $id: "login.page.loading" })}</p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
