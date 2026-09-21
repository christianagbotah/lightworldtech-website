import type { NextConfig } from 'next';

const isProduction = process.env.NODE_ENV === 'production';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "frame-src 'self' https://www.google.com https://maps.google.com",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
  "connect-src 'self' https:",
  "media-src 'self' https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
];

const privateNoStoreHeaders = [
  { key: 'Cache-Control', value: 'private, no-store, no-cache, must-revalidate, max-age=0' },
  { key: 'Pragma', value: 'no-cache' },
  { key: 'Expires', value: '0' },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          ...securityHeaders,
          ...privateNoStoreHeaders,
        ],
      },
      {
        source: '/api/admin/:path*',
        headers: [
          ...securityHeaders,
          ...privateNoStoreHeaders,
        ],
      },
      {
        source: '/api/client/:path*',
        headers: [
          ...securityHeaders,
          ...privateNoStoreHeaders,
        ],
      },
      {
        source: '/api/upload',
        headers: [
          ...securityHeaders,
          ...privateNoStoreHeaders,
        ],
      },
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
