const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"
).replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/v2/:path*",
        destination: `${BACKEND_URL}/api/v2/:path*`,
      },
      {
        source: "/auth/:path*",
        // Preserve compatibility for callers using `/auth/*` while backend serves `/api/v2/auth/*`.
        destination: `${BACKEND_URL}/api/v2/auth/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
