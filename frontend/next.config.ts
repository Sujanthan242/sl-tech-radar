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
  images: { unoptimized: true },
};

export default nextConfig;
