import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    return [
      { source: '/run/:path*',          destination: `${backendUrl}/run/:path*` },
      { source: '/extract-contract',    destination: `${backendUrl}/extract-contract` },
      { source: '/health',              destination: `${backendUrl}/health` },
    ];
  },
};

export default nextConfig;
