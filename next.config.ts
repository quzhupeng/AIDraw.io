import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Required for OpenNext/Cloudflare deployment
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
