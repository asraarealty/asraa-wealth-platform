# asraa-wealth-platform

Production-grade wealth platform (Next.js + FastAPI + PostgreSQL + Stock Engine)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **Runtime**: React 19
- **Font**: System font stack (ui-sans-serif)

## Project Structure

```
app/
  layout.tsx          – Root layout, dark theme
  page.tsx            – Redirects to /login
  login/page.tsx      – Login page
  dashboard/page.tsx  – Protected dashboard page

components/
  LoginForm.tsx       – Email + password form
  Dashboard.tsx       – Portfolio dashboard (stats, holdings table)
  StockSearch.tsx     – Debounced stock search with keyboard navigation
  ClientSelector.tsx  – Filterable client list

lib/
  auth.ts             – JWT helpers: getToken / setToken / removeToken
  api.ts              – Typed fetch wrapper (Bearer auth, auto 401 redirect)
```

## Getting Started

```bash
# Install dependencies
npm install

# Set backend URL for Next.js rewrites
echo "BACKEND_URL=http://localhost:8000" > .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to `/login`.

## Environment Variables

| Variable | Description |
|---|---|
| `BACKEND_URL` | Server-side base URL for FastAPI backend rewrites |
| `SECURITY_IDLE_TIMEOUT_SECONDS` | Idle-session timeout in seconds |
| `SECURITY_UPLOAD_MAX_BYTES` | Maximum image upload size in bytes |
| `SECURITY_UPLOAD_RATE_LIMIT_MAX` | Upload requests allowed per rate-limit window |
| `SECURITY_UPLOAD_RATE_LIMIT_WINDOW_MS` | Upload rate-limit window in milliseconds |
| `SECURITY_LOGIN_RATE_LIMIT_MAX` | Login attempts allowed per window |
| `SECURITY_LOGIN_RATE_LIMIT_WINDOW_MS` | Login rate-limit window in milliseconds |
| `SECURITY_ALLOWED_ORIGINS` | Comma-separated allowed origins for API CORS |

> Keep secrets server-side. Never put API secrets/tokens in `NEXT_PUBLIC_*` vars.

## Build

```bash
npm run build
npm start
```
