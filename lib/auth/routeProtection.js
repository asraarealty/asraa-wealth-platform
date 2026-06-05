export const PROTECTED_ROUTE_PREFIXES = [
  "/activity",
  "/admin",
  "/assets",
  "/business-connect",
  "/dashboard",
  "/discover",
  "/insights",
  "/intelligence",
  "/markets",
  "/mutual-funds",
  "/notifications",
  "/onboarding",
  "/profile",
  "/properties",
  "/real-estate",
  "/stocks",
  "/transactions",
  "/watchlist",
];

/**
 * @param {string} pathname
 */
export function isProtectedRoute(pathname) {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * @param {string | null | undefined} requestedPath
 * @param {string | null | undefined} role
 */
export function resolvePostLoginPath(requestedPath, role) {
  const isAdmin = String(role ?? "").trim().toLowerCase() === "admin";
  const fallback = isAdmin ? "/admin" : "/dashboard";
  if (!requestedPath || !requestedPath.startsWith("/") || requestedPath.startsWith("//")) {
    return fallback;
  }

  let url;
  try {
    url = new URL(requestedPath, "https://asraa.invalid");
  } catch {
    return fallback;
  }

  if (url.origin !== "https://asraa.invalid" || !isProtectedRoute(url.pathname)) {
    return fallback;
  }

  const requestsAdminRoute =
    url.pathname === "/admin" || url.pathname.startsWith("/admin/");
  if (requestsAdminRoute !== isAdmin) {
    return fallback;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
