import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootPkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const API_URL = process.env.API_URL || 'http://localhost:3456';

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment
  output: 'standalone',
  // Native modules that must not be bundled
  serverExternalPackages: ['better-sqlite3'],
  // Transpile workspace packages
  transpilePackages: ['@omniwatch/api', '@omniwatch/db', '@omniwatch/shared'],
  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_APP_VERSION: rootPkg.version,
  },
  // Proxy API requests to the API server so dashboard works on a single port
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
      { source: '/health', destination: `${API_URL}/health` },
      { source: '/ws', destination: `${API_URL}/ws` },
    ];
  },
};

export default analyzer(nextConfig);
