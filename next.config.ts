import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "big34.fly.storage.tigris.dev",
        port: "",
      },
    ],
  },
};

export default nextConfig;
