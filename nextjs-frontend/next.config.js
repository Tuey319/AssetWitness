/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    return [
      { source: '/run/:path*',          destination: `${backendUrl}/run/:path*` },
      { source: '/extract-agreement',   destination: `${backendUrl}/extract-agreement` },
      { source: '/health',              destination: `${backendUrl}/health` },
      { source: '/download/:path*',     destination: `${backendUrl}/download/:path*` },
      { source: '/dashboard-api/:path*', destination: `${backendUrl}/dashboard/:path*` },
    ];
  },
};

module.exports = nextConfig;
