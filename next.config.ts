import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E runs its own dev server (own database branch) next to the regular one; they can't share .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
