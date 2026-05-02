// @ts-check
const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;

    if (!backendUrl) {
      console.warn(
        "[next.config] BACKEND_URL is not set. API rewrites are disabled."
      );
      return [];
    }

    return [
      {
        source: "/api/v2/:path*",
        destination: `${backendUrl}/:path*`,
      },
      {
        source: "/auth/:path*",
        destination: `${backendUrl}/auth/:path*`,
      },
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
  // Suppresses source map upload logs during build.
  silent: true,
  // Automatically tree-shake Sentry logger statements to reduce bundle size.
  disableLogger: true,
});
