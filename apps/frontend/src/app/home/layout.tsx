import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Wishlists",
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
