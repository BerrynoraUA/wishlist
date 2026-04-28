import type { NextConfig } from "next";
import { withGTConfig } from "gt-next/config";

const nextConfig: NextConfig = {
  transpilePackages: ["@wishlist/backend"],
};

export default withGTConfig(nextConfig);
