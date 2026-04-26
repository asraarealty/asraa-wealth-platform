import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      console.warn(
        "[next.config] BACKEND_URL is not set. " +
          "API rewrites are disabled — set BACKEND_URL to enable server-side proxying of /api/v2/* requests."
      );
      return [];
    }
    return [
      {
        source: "/api/v2/:path*",
        destination: `${backendUrl}/api/v2/:path*`,
      },
    ];
  },
};

export default nextConfig;
