import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootPkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment
  output: 'standalone',
  // Native modules that must not be bundled
  serverExternalPackages: ['better-sqlite3'],
  // Transpile workspace packages
  transpilePackages: ['@vigil/api', '@vigil/db', '@vigil/shared'],
  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_APP_VERSION: rootPkg.version,
  },
};

export default analyzer(nextConfig);
