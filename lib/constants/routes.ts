/**
 * Centralized API route constants.
 *
 * RULE: No hardcoded API path strings anywhere in the codebase.
 *       All request paths must reference a constant from this file.
 *
 * All values are full /api/v2/* paths. The fetcher in lib/fetcher.ts
 * passes paths that already start with /api/ through unchanged, so
 * these constants work directly with fetcher() and apiClient.
 */

export const API_ROUTES = {
  AUTH: {
    LOGIN: "/api/v2/auth/login",
    LOGOUT: "/api/v2/auth/logout",
    ME: "/api/v2/auth/me",
    REFRESH: "/api/v2/auth/refresh",
    REGISTER: "/api/v2/auth/register",
    FORGOT_PASSWORD: "/api/v2/auth/forgot-password",
    RESET_PASSWORD: "/api/v2/auth/reset-password",
  },

  CLIENTS: {
    BASE: "/api/v2/clients",
    APPROVE: (id: number) => `/api/v2/clients/${id}/approve`,
    STATUS: (id: number) => `/api/v2/clients/${id}/status`,
    RESTORE: (id: number) => `/api/v2/clients/${id}/restore`,
    BY_ID: (id: number) => `/api/v2/clients/${id}`,
    PROFILE: (id: number) => `/api/v2/clients/${id}/profile`,
  },

  STOCKS: {
    BASE: "/api/v2/stocks",
    QUOTE: (symbol: string) => `/api/v2/stocks/${encodeURIComponent(symbol)}`,
    SEARCH: "/api/v2/stocks/search",
    BULK: "/api/v2/stocks/bulk",
    RECOMMENDED: "/api/v2/stocks/recommended",
  },

  ASSETS: {
    BASE: "/api/v2/assets",
    ME: "/api/v2/assets/me",
    BY_ID: (id: number) => `/api/v2/assets/${id}`,
    BY_USER: (userId: number) => `/api/v2/assets?user_id=${userId}`,
  },

  TRANSACTIONS: {
    BASE: "/api/v2/transactions",
    BY_CLIENT: (clientId: number) => `/api/v2/transactions?client_id=${clientId}`,
  },

  USERS: "/api/v2/users",

  INSIGHTS: {
    ME: "/api/v2/insights/me",
    BY_CLIENT: (clientId: number) => `/api/v2/insights?user_id=${clientId}`,
  },

  COMMODITIES: {
    SEARCH: "/api/v2/commodities/search",
  },

  MUTUAL_FUNDS: {
    SEARCH: "/api/v2/mutual-funds/search",
  },

  REAL_ESTATE: {
    PROPERTIES: "/api/v2/real-estate/properties",
    TENANTS: "/api/v2/real-estate/tenants",
    LEASES: "/api/v2/real-estate/leases",
    RENT: "/api/v2/real-estate/rent",
    MAINTENANCE: "/api/v2/real-estate/maintenance",
    ANALYTICS: "/api/v2/real-estate/analytics",
  },

  SETTINGS: {
    PLATFORM: "/api/v2/settings/platform",
    PRICING: "/api/v2/settings/pricing",
    PRICING_BY_ID: (id: number | string) => `/api/v2/settings/pricing/${encodeURIComponent(id)}`,
    ALLOCATION: "/api/v2/settings/allocation",
    STOCK: "/api/v2/settings/stock",
    FEATURED_PROPERTIES: "/api/v2/settings/featured-properties",
    FEATURED_PROPERTIES_BY_ID: (id: number | string) => `/api/v2/settings/featured-properties/${encodeURIComponent(id)}`,
    FEATURED_PROPERTIES_TOGGLE: (id: number | string) => `/api/v2/settings/featured-properties/${encodeURIComponent(id)}/toggle`,
    FEATURED_PROPERTIES_REORDER: "/api/v2/settings/featured-properties/reorder",
    NOTIFICATIONS: "/api/v2/settings/notifications",
    ADMIN_USERS: "/api/v2/settings/admin-users",
    ADMIN_USERS_BY_ID: (id: number) => `/api/v2/settings/admin-users/${encodeURIComponent(id)}`,
  },

  PROPERTIES: {
    FEATURED: "/api/v2/properties/featured",
  },

  UPLOAD: {
    IMAGE: "/api/v2/upload/image",
  },
} as const;
