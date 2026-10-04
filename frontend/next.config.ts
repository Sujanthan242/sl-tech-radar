import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* standalone output keeps the Docker image small (see Dockerfile) */
  output: "standalone",
};

export default nextConfig;
