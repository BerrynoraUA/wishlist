import { Bricolage_Grotesque } from "next/font/google";

/** Display face of the landing and auth pages only; the app keeps DM Sans. */
export const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
