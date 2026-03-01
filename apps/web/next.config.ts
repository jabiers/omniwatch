import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment
  output: 'standalone',
  // Native modules that must not be bundled
  serverExternalPackages: ['better-sqlite3'],
  // Transpile workspace packages
  transpilePackages: ['@omniwatch/api', '@omniwatch/db', '@omniwatch/shared'],
};

export default nextConfig;
