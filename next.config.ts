import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ... (Your existing config)
  
  // 👇 MOVE THIS TO THE ROOT LEVEL AND RENAME IT 👇
  serverExternalPackages: ['pino', 'pino-pretty'],
  
  // 👇 REMOVE THE EXPERIMENTAL BLOCK IF IT'S EMPTY NOW 👇
  experimental: {
    // ... other experimental options if you have them
  },
};

export default nextConfig;