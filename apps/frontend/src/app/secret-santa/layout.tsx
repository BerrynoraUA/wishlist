import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secret Santa",
};

export default function SecretSantaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
