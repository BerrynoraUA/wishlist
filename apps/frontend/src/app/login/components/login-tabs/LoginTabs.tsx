"use client";

import { useMemo } from "react";
import { useGT } from "gt-next";
import { Tabs, type TabItem } from "@/components/ui/Tabs/Tabs";

type Props = {
  active: "login" | "register";
  onChange: (v: "login" | "register") => void;
};

export function LoginTabs({ active, onChange }: Props) {
  const t = useGT();
  const items = useMemo<TabItem<"login" | "register">[]>(
    () => [
      { value: "login", label: t("Login", { $id: "login.tabs.login" }) },
      {
        value: "register",
        label: t("Register", { $id: "login.tabs.register" }),
      },
    ],
    [t],
  );

  return <Tabs items={items} active={active} onChange={onChange} />;
}
