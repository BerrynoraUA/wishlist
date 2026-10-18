"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { useGT } from "gt-next";
import { BookOpen, Headphones } from "lucide-react";
import styles from "./login.module.scss";
import { AuthForm } from "./components/auth-form/AuthForm";
import { AuthShell } from "./components/auth-shell/AuthShell";
import { useLoginPage } from "./hooks/use-login-page";

function LoginPageContent() {
  const t = useGT();
  const router = useRouter();
  const { redirectTo, prefillEmail, registerHref } = useLoginPage();

  return (
    <AuthShell
      visualTitle={
        <>
          {t("Welcome back to", { $id: "login.visual.titleLine1" })}{" "}
          <span className={styles.visualAccent}>
            {t("Wishlane", { $id: "login.visual.titleEmphasis" })}
          </span>
        </>
      }
      visualSubtitle={t(
        "Sign in to manage your wishlists, see what friends are wishing for, and never miss the perfect gift.",
        { $id: "login.visual.subtitle" },
      )}
      demo={{
        title: t("Maya's 30th", { $id: "login.mockup.title" }),
        meta: t("March 15, 2 items", { $id: "login.mockup.meta" }),
        accent: "pink",
        initialReserved: ["headphones"],
        toggleLabel: t("View the list as", { $id: "auth.demo.toggle" }),
        ownerLabel: t("Maya sees", { $id: "auth.demo.owner" }),
        friendsLabel: t("Her friends see", { $id: "auth.demo.friends" }),
        ownerNote: t("Can't tell. That's the point.", { $id: "auth.demo.ownerNote" }),
        items: [
          {
            id: "headphones",
            name: t("Wireless headphones", { $id: "login.mockup.item1" }),
            store: "sony.com",
            price: "$149.99",
            accent: "pink",
            Icon: Headphones,
            priority: { kind: "star" },
          },
          {
            id: "book",
            name: t("Design anthology", { $id: "login.mockup.item2" }),
            store: "phaidon.com",
            price: "$34.00",
            accent: "blue",
            Icon: BookOpen,
          },
        ],
      }}
      title={t("Sign in to your account", { $id: "login.form.title" })}
      subtitle={t("Enter your credentials to continue where you left off.", {
        $id: "login.form.subtitle",
      })}
      footer={
        <>
          {t("Don't have an account?", { $id: "login.switch.text" })}{" "}
          <Link href={registerHref}>{t("Create one", { $id: "login.switch.link" })}</Link>
        </>
      }
    >
      <AuthForm
        mode="login"
        redirectTo={redirectTo}
        initialEmail={prefillEmail}
        onLoginSuccess={(target) => router.replace(target)}
      />
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
