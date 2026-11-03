import type { NextConfig } from 'next';

// Storage is served by whichever Supabase the app points at (self-hosted or cloud).
const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:8000');

const nextConfig: NextConfig = {
  // Self-contained server bundle for Docker / VPS (`node server.js`).
  output: 'standalone',
  transpilePackages: ['@tandyr/shared'],
  turbopack: {
    root: '../../',
  },
  images: {
    remotePatterns: [
      {
        protocol: supabaseUrl.protocol.replace(':', '') as 'http' | 'https',
        hostname: supabaseUrl.hostname,
        port: supabaseUrl.port,
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
