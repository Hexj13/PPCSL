const { withSentryConfig } = require('@sentry/nextjs');

function withOptionalBundleAnalyzer(config) {
  if (process.env.ANALYZE !== 'true') {
    return config;
  }
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  });
  return withBundleAnalyzer(config);
}

function hostnameFromEnvUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return { protocol: u.protocol.replace(':', ''), hostname: u.hostname, port: u.port };
  } catch {
    return null;
  }
}

function buildImageRemotePatterns() {
  const patterns = [
    {
      protocol: 'http',
      hostname: 'localhost',
      port: '4000',
      pathname: '/uploads/**',
    },
    {
      protocol: 'http',
      hostname: 'localhost',
      port: '4000',
      pathname: '/api/upload/image/**',
    },
  ];

  const seen = new Set();
  const pushUnique = (entry) => {
    const key = `${entry.protocol}|${entry.hostname}|${entry.port || ''}|${entry.pathname}`;
    if (seen.has(key)) return;
    seen.add(key);
    patterns.push(entry);
  };

  const api = hostnameFromEnvUrl(process.env.NEXT_PUBLIC_API_URL);
  if (api && api.hostname !== 'localhost') {
    pushUnique({
      protocol: api.protocol,
      hostname: api.hostname,
      ...(api.port ? { port: api.port } : {}),
      pathname: '/uploads/**',
    });
    pushUnique({
      protocol: api.protocol,
      hostname: api.hostname,
      ...(api.port ? { port: api.port } : {}),
      pathname: '/api/upload/image/**',
    });
  }

  const cdn = hostnameFromEnvUrl(
    process.env.NEXT_PUBLIC_IMAGE_CDN_URL || process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL,
  );
  if (cdn) {
    pushUnique({
      protocol: cdn.protocol,
      hostname: cdn.hostname,
      ...(cdn.port ? { port: cdn.port } : {}),
      pathname: '/**',
    });
  }

  const site = hostnameFromEnvUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (site && site.hostname !== 'localhost') {
    pushUnique({
      protocol: site.protocol,
      hostname: site.hostname,
      ...(site.port ? { port: site.port } : {}),
      pathname: '/**',
    });
  }

  return patterns;
}

function buildConnectSrcDirective() {
  const hosts = new Set(["'self'"]);
  for (const raw of [
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NEXT_PUBLIC_IMAGE_CDN_URL,
    process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]) {
    const parsed = hostnameFromEnvUrl(raw);
    if (!parsed) continue;
    const origin =
      parsed.port && parsed.port !== '80' && parsed.port !== '443'
        ? `${parsed.protocol}://${parsed.hostname}:${parsed.port}`
        : `${parsed.protocol}://${parsed.hostname}`;
    hosts.add(origin);
  }
  hosts.add('https://www.google-analytics.com');
  hosts.add('https://accounts.google.com');
  hosts.add('https://oauth.telegram.org');
  hosts.add('https://connect.facebook.net');
  hosts.add('https://www.facebook.com');
  hosts.add('https://graph.facebook.com');
  hosts.add('https://*.sentry.io');
  return `connect-src ${[...hosts].join(' ')}`;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  trailingSlash: false,

  async redirects() {
    return [
      { source: '/login', destination: '/sign', permanent: true },
      { source: '/register', destination: '/sign?tab=register', permanent: true },
    ];
  },

  experimental: {
    optimizeCss: true,
    ...(process.env.REACT_COMPILER === 'true' ? { reactCompiler: true } : {}),
  },

  ...(process.env.NODE_ENV === 'production' && {
    cacheMaxMemorySize: 25 * 1024 * 1024,
  }),

  ...(process.env.NODE_ENV === 'development' && {
    cacheMaxMemorySize: 0,
    onDemandEntries: {
      maxInactiveAge: 60 * 1000,
      pagesBufferLength: 5,
    },
  }),

  ...(process.env.NODE_ENV === 'development' && {
    generateBuildId: async () => {
      return `dev-${Date.now()}`;
    },
  }),

  images: {
    loader: 'custom',
    loaderFile: './lib/cdn-image-loader.ts',
    remotePatterns: buildImageRemotePatterns(),
    minimumCacheTTL: 86400,
    qualities: [65, 68, 70, 75],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:4000',
  },
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const productionSecurityHeaders = isDev
      ? []
      : [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Content-Security-Policy-Report-Only',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://accounts.google.com https://oauth.telegram.org https://connect.facebook.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: http://localhost:4000",
              "font-src 'self' data: https://fonts.gstatic.com",
              buildConnectSrcDirective(),
              "frame-src 'self' https://www.googletagmanager.com https://accounts.google.com https://oauth.telegram.org https://www.facebook.com https://connect.facebook.net",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ];
    const headers = [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          ...productionSecurityHeaders,
          ...(isDev
            ? [
                {
                  key: 'Cache-Control',
                  value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
                },
                {
                  key: 'Pragma',
                  value: 'no-cache',
                },
                {
                  key: 'Expires',
                  value: '0',
                },
              ]
            : [
                {
                  key: 'Cache-Control',
                  value: 'public, s-maxage=60, stale-while-revalidate=300',
                },
              ]),
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: isDev
              ? 'no-store, no-cache, must-revalidate'
              : 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: isDev
              ? 'no-store, no-cache, must-revalidate'
              : 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: isDev
              ? 'no-store, no-cache, must-revalidate'
              : 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/popular_body_types/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: isDev
              ? 'no-store, no-cache, must-revalidate'
              : 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: isDev
              ? 'no-store, no-cache, must-revalidate'
              : 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];

    if (!isDev) {
      headers.push({
        source: '/listings/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=30, stale-while-revalidate=120',
          },
        ],
      });
    }

    return headers;
  },
  turbopack: {
    root: __dirname,
  },
};

const sentryWebpackPluginOptions = {
  silent: !process.env.SENTRY_AUTH_TOKEN || process.env.CI === 'true',
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: false,
  },
};

module.exports = withSentryConfig(
  withOptionalBundleAnalyzer(nextConfig),
  sentryWebpackPluginOptions,
);
