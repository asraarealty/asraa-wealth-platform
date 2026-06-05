import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isProtectedRoute,
  PROTECTED_ROUTE_PREFIXES,
  resolvePostLoginPath,
} from "../lib/auth/routeProtection.js";

test("protects every authenticated route prefix and nested route", () => {
  for (const prefix of PROTECTED_ROUTE_PREFIXES) {
    assert.equal(isProtectedRoute(prefix), true, prefix);
    assert.equal(isProtectedRoute(`${prefix}/nested/route`), true, prefix);
  }
});

test("keeps public access and recovery routes public", () => {
  const publicRoutes = [
    "/",
    "/activate",
    "/activate-invitation",
    "/forgot-password",
    "/login",
    "/request-access",
    "/reset-password",
    "/signup",
  ];

  for (const pathname of publicRoutes) {
    assert.equal(isProtectedRoute(pathname), false, pathname);
  }
});

test("does not protect routes that only share a prefix string", () => {
  const nearMatches = [
    "/administrator",
    "/dashboard-public",
    "/profile-card",
    "/stocks-public",
  ];

  for (const pathname of nearMatches) {
    assert.equal(isProtectedRoute(pathname), false, pathname);
  }
});

test("keeps the Next.js middleware matcher aligned with the route policy", () => {
  const middleware = readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");

  for (const prefix of PROTECTED_ROUTE_PREFIXES) {
    assert.match(middleware, new RegExp(`"${prefix.replace("/", "\\/")}\\/:path\\*"`), prefix);
  }
});

test("restores validated role-appropriate routes after login", () => {
  assert.equal(resolvePostLoginPath("/assets/42?tab=risk", "client"), "/assets/42?tab=risk");
  assert.equal(resolvePostLoginPath("/admin/clients?status=lead", "admin"), "/admin/clients?status=lead");
});

test("rejects external, public, and cross-role post-login redirects", () => {
  assert.equal(resolvePostLoginPath("https://attacker.example", "client"), "/dashboard");
  assert.equal(resolvePostLoginPath("//attacker.example", "client"), "/dashboard");
  assert.equal(resolvePostLoginPath("/login", "client"), "/dashboard");
  assert.equal(resolvePostLoginPath("/admin/clients", "client"), "/dashboard");
  assert.equal(resolvePostLoginPath("/assets", "admin"), "/admin");
});
