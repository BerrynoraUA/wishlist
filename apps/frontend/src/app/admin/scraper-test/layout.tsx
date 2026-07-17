import { getAdminEmailAccess } from "@/lib/admin-email-access";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export default async function ScraperTestLayout({ children }: { children: ReactNode }) {
  const { authorized } = await getAdminEmailAccess();

  if (!authorized) {
    notFound();
  }

  return children;
}

