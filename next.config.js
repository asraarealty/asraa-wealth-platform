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
        // Proxy all /api/* requests to the FastAPI backend.
        // When rewrites() returns a plain array, Next.js applies them as
        // "afterFiles" rewrites — after filesystem and API-route matching —
        // so internal route handlers under app/api/* are still served by
        // Next.js and not forwarded to the backend.
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
