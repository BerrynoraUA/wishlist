import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wishlane — Wishlists, Shared Beautifully",
  description:
    "Create beautiful wishlists, share them with friends, and never miss the perfect gift again. Wishlane makes gifting personal, easy, and delightful.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
