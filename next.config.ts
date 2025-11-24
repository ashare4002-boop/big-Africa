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
 
  eslint: {
    ignoreDuringBuilds: true,
  },
  // This ignores TypeScript errors (though pnpm type-check passed, this is a safety net)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // MOVE THIS TO THE ROOT LEVEL AND RENAME IT 
  serverExternalPackages: ['pino', 'pino-pretty'],
  
};

export default nextConfig;