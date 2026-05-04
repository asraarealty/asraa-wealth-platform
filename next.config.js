// @ts-check

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

module.exports = nextConfig;
