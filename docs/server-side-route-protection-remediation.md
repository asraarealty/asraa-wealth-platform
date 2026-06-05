# Server-Side Route Protection Remediation

## Problem

The application runs Next.js 15.5, which discovers route middleware from
`middleware.ts`. The existing guard was implemented in `proxy.ts`, so it was
not registered in production builds. Only `/dashboard` and `/admin` were
listed in that inactive guard, leaving the rest of the authenticated
application without a server-side route boundary.

Client-side guards remain useful for session hydration and role-aware
navigation, but they cannot prevent an unauthenticated request from reaching a
protected route before JavaScript executes.

## Implemented Controls

1. Replace the inactive `proxy.ts` entrypoint with the Next.js 15
   `middleware.ts` convention.
2. Gate every authenticated client and admin route before route rendering.
3. Use the backend-managed HTTP-only `access_token` cookie as the middleware
   session signal.
4. Redirect unauthenticated requests to `/login`.
5. Preserve the requested internal path and query string in a `next` parameter.
   After login, validate that destination against the protected-route policy
   and the authenticated user's role before navigating.
6. Keep access-request, invitation-activation, login, signup redirect, and
   password-recovery routes public.
7. Centralize protected prefixes in a route-policy module.
8. Add regression tests for protected routes, public routes, prefix-boundary
   behavior, and middleware matcher coverage.

## Protected Route Scope

- Admin operations: `/admin/*`
- Portfolio operations: `/dashboard/*`, `/assets/*`, `/transactions/*`,
  `/real-estate/*`, `/properties/*`, `/mutual-funds/*`
- Market workspaces: `/stocks/*`, `/markets/*`, `/watchlist/*`, `/discover/*`
- Intelligence and events: `/insights/*`, `/intelligence/*`,
  `/notifications/*`, `/activity/*`
- Account workflows: `/onboarding/*`, `/profile/*`, `/business-connect/*`

## Verification

Required checks:

1. `npm run test:route-protection`
2. `npx tsc --noEmit`
3. `npm run build`
4. Confirm the build output includes `Middleware`.
5. Production-server smoke checks:
   - unauthenticated protected route returns `307` to `/login?next=...`
   - public login route returns `200`
   - protected route with `access_token` cookie passes the middleware gate

## Deployment And Rollback

Deploy first to preview/staging with the production backend configured. Verify
that successful login responses set the HTTP-only `access_token` cookie for the
frontend domain and that logout clears it.

Monitor login redirects, authentication failures, and protected-route response
codes after release. If the backend cookie is missing or scoped incorrectly,
roll back this change and correct cookie domain, path, Secure, and SameSite
settings before redeploying.

## Follow-Up Security Work

This remediation activates the route boundary and checks for the backend
session cookie. Backend APIs must continue to validate token signature,
expiration, revocation, and authorization on every request. Role enforcement,
refresh-token storage, CSRF defenses, and session rotation belong to the
separate session-security remediation.
