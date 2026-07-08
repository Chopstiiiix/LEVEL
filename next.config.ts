import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root (a stray parent lockfile exists one level up).
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
