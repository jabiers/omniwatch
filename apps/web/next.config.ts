import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Native modules that must not be bundled
  serverExternalPackages: ['better-sqlite3'],
  // Transpile workspace packages
  transpilePackages: ['@omniwatch/api', '@omniwatch/db', '@omniwatch/shared'],
};

export default nextConfig;
