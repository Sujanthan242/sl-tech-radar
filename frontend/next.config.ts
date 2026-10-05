import type { NextConfig } from "next";

/**
 * Dual-mode output:
 * - GitHub Pages static demo: PAGES_BASE_PATH=/sl-tech-radar  -> output "export"
 * - Docker / local dev:                        (unset)        -> output "standalone"
 */
const isStaticExport = !!process.env.PAGES_BASE_PATH;

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : "standalone",
  basePath: process.env.PAGES_BASE_PATH || "",
  // Exposed so components can prefix public-asset URLs (next/image with
  // unoptimized:true does not apply basePath by itself).
  env: { NEXT_PUBLIC_BASE_PATH: process.env.PAGES_BASE_PATH || "" },
  images: { unoptimized: true },
};

export default nextConfig;
