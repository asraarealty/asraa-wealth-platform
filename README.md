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

# Set your API base URL
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to `/login`.

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL for the FastAPI backend (e.g. `https://api.asraa.com`) |

## Build

```bash
npm run build
npm start
```
