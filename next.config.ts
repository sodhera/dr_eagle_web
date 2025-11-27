import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/mcp/:path*',
        destination: 'https://us-central1-audit-3a7ec.cloudfunctions.net/:path*',
      },
    ];
  },
};

export default nextConfig;
