// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    const isProductionDeployment = process.env.VERCEL_ENV === "production";
    const requiredProductionBackendUrl = "https://api.asraarealty.in";

    if (isProductionDeployment && backendUrl !== requiredProductionBackendUrl) {
      throw new Error(
        `[next.config] BACKEND_URL must be ${requiredProductionBackendUrl} in production.`
      );
    }

    if (!backendUrl) {
      console.warn(
        "[next.config] BACKEND_URL is not set. API rewrites are disabled."
      );
      return [];
    }

    return [
      {
        source: "/api/v2/:path*",
        destination: `${backendUrl}/api/v2/:path*`,
      },
      {
        source: "/auth/:path*",
        destination: `${backendUrl}/auth/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
