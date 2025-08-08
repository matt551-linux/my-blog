// next.config.ts - Next.js configuration in TypeScript
import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'localhost',
      // Add your domain here
      'yourdomain.com',
      // Add your image hosting domains
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['payload'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'payload-config': path.resolve('./payload.config.ts'),
    };
    return config;
  },
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/collections/posts',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
