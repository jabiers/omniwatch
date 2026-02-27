import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Proxy API requests to the API server
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:3456/api/:path*' },
    ];
  },
};

export default nextConfig;
