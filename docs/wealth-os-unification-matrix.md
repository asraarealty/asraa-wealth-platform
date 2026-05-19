# Wealth OS Unification Matrix

## Core module ownership boundaries

| Capability | Unified owner |
| --- | --- |
| Market quotes, polling, breadth, watchlists, search | `domains/market` |
| Portfolio valuation, holdings normalization, portfolio queries/mutations | `domains/portfolio` |
| AI risk, allocation, opportunity and recommendation logic | `domains/intelligence` |
| Admin lifecycle/profile orchestration | `domains/admin` |
| Reusable Wealth OS primitives | `components/v2` |
| Route entrypoint orchestration | `components/market/MarketRouteEntry` + route config wrappers |

## Duplication audit and target ownership map

| Feature surface | Current files (detected) | Target unified owner |
| --- | --- | --- |
| Market route shells (`/stocks`, `/markets`, `/watchlist`, `/discover`, `/intelligence`) | `app/(app)/stocks/page.tsx`, `app/(app)/markets/page.tsx`, `app/(app)/watchlist/page.tsx`, `app/(app)/discover/page.tsx`, `app/(app)/intelligence/page.tsx` | `components/market/MarketRouteEntry` + `components/market/MarketCommandCenter` |
| Admin market shell | `app/admin/market/page.tsx`, `components/admin-os/AdminMarketPanel.tsx` | `components/market/MarketRouteEntry` + `components/market/MarketCommandCenter` |
| Market orchestration and search | `domains/market/graph.ts`, `domains/market/search/index.ts`, `components/market/GlobalMarketSearch.tsx`, `components/market/MarketCommandCenter.tsx` | `domains/market/*` (single market engine) |
| Workspace mode tabs and panel primitives | `components/admin/workspace/primitives.tsx`, `components/v2/ui.tsx` | `components/v2/workspace.tsx` |
| Holdings/intelligence/lifecycle workspace widgets | `components/admin/ClientDetailPanel.tsx`, `components/admin/workspace/primitives.tsx`, `components/admin/platform/*` | `components/v2/workspace.tsx` + feature containers |
| Client/admin operational workflows | `app/admin/clients/page.tsx`, `components/admin/ClientDetailPanel.tsx`, `domains/admin/*` | `domains/admin/*` with mode-based workspace rendering |
| Portfolio intelligence surfaces | `app/(app)/dashboard/page.tsx`, `app/(app)/assets/page.tsx`, `components/admin/portfolio-workspace/*` | shared workspace mode components using `domains/portfolio` + `domains/intelligence` |
| Global command search | `domains/market/search/index.ts`, `components/market/GlobalMarketSearch.tsx`, `components/market/MarketCommandCenter.tsx` | single universal command layer under `domains/market/search` |

## Route model target

Routes are configuration entrypoints only:

- `/stocks` → `MarketRouteEntry(mode="client", initialSurface="asset-detail")`
- `/markets` → `MarketRouteEntry(mode="client", initialSurface="market-overview")`
- `/watchlist` → `MarketRouteEntry(mode="client", initialSurface="top-movers")`
- `/discover` → `MarketRouteEntry(mode="client", initialSurface="ai-analysis")`
- `/intelligence` → `MarketRouteEntry(mode="client", initialSurface="ai-analysis")`
- `/admin/market` → `MarketRouteEntry(mode="admin", initialSurface="market-overview")`

## Workspace mode target

Shared mode taxonomy across roles:

1. Overview
2. Portfolio
3. Operations
4. Intelligence

Visibility and action controls must be permission-gated, not component-forked.
