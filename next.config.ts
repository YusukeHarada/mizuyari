import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
  },
  async rewrites() {
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!;
    return [
      {
        source: '/__/auth/:path*',
        destination: `https://${authDomain}/__/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
