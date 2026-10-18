"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { useGT } from "gt-next";
import { BatteryCharging, Shirt } from "lucide-react";
import styles from "../login/login.module.scss";
import { AuthForm } from "../login/components/auth-form/AuthForm";
import { AuthShell } from "../login/components/auth-shell/AuthShell";
import { useRegisterPage } from "./hooks/use-register-page";

function RegisterPageContent() {
  const t = useGT();
  const router = useRouter();
  const { redirectTo, loginHref } = useRegisterPage();

  return (
    <AuthShell
      visualTitle={
        <>
          {t("Start your", { $id: "register.visual.titleLine1" })}{" "}
          <span className={styles.visualAccent}>
            {t("gifting journey", { $id: "register.visual.titleEmphasis" })}
          </span>
        </>
      }
      visualSubtitle={t(
        "Make a list, share the link, and let friends reserve gifts without you ever knowing who picked what.",
        { $id: "register.visual.subtitle" },
      )}
      demo={{
        title: t("Christmas 2026", { $id: "register.mockup.title" }),
        meta: t("December 25, 2 items", { $id: "register.mockup.meta" }),
        accent: "mint",
        toggleLabel: t("View the list as", { $id: "auth.demo.toggle" }),
        ownerLabel: t("You see", { $id: "register.demo.owner" }),
        friendsLabel: t("Friends see", { $id: "register.demo.friends" }),
        ownerNote: t("Can't tell. That's the point.", { $id: "auth.demo.ownerNote" }),
        items: [
          {
            id: "sweater",
            name: t("Wool sweater", { $id: "register.mockup.item1" }),
            store: "uniqlo.com",
            price: "$89.00",
            accent: "mint",
            Icon: Shirt,
            priority: { kind: "star" },
          },
          {
            id: "charger",
            name: t("Wireless charger", { $id: "register.mockup.item2" }),
            store: "anker.com",
            price: "$45.00",
            accent: "lavender",
            Icon: BatteryCharging,
          },
        ],
      }}
      title={t("Create your account", { $id: "register.form.title" })}
      subtitle={t("Free forever. No credit card required.", { $id: "register.form.subtitle" })}
      footer={
        <>
          {t("Already have an account?", { $id: "register.switch.text" })}{" "}
          <Link href={loginHref}>{t("Sign in", { $id: "register.switch.link" })}</Link>
        </>
      }
    >
      <AuthForm
        mode="register"
        redirectTo={redirectTo}
        onLoginSuccess={(target) => router.replace(target)}
      />
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}
