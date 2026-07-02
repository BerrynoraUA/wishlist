import type { NextConfig } from "next";
import { withGTConfig } from "gt-next/config";

const nextConfig: NextConfig = {
  transpilePackages: ["@wishlist/backend"],
  // metascraper (used by the product scraper) has heavy/native transitive deps
  // (e.g. re2). Keep it external so Next requires it at runtime from
  // node_modules instead of bundling the native module into the server route.
  serverExternalPackages: [
    "metascraper",
    "metascraper-title",
    "metascraper-description",
    "metascraper-image",
    "re2",
  ],
};

export default withGTConfig(nextConfig);
