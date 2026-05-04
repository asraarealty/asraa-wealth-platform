# Backend Alignment Guide

This document describes what the frontend expects from the backend so that all
dashboard features work correctly without client-side fallback logic.

---

## 1. Currency — All Values Must Be Numeric (INR)

The frontend uses `Intl.NumberFormat("en-IN", { currency: "INR" })` to format
every monetary value.

**Rules for the backend:**
- **Always return raw numbers** (e.g. `1250000`), never pre-formatted strings
  (`"₹12,50,000"` or `"$12500"`).
- All monetary fields must be in **Indian Rupees (INR)**.
- For US-listed stocks, convert `priceUSD` → `priceINR` server-side using the
  live USD/INR rate before including `priceINR` in the response.
- Fields that must be numeric: `value`, `avgPrice`, `currentPrice`, `priceINR`,
  `purchasePrice`, `currentValue`, `rentAmount`, `totalValue`, `stockValue`,
  `mfValue`, `propertyValue`, `portfolioValue`.

---

## 2. Assets Endpoint (`/assets/me` and `/assets?user_id=<id>`)

Expected response shape (camelCase):

```json
{
  "positions": [ ...Asset[] ],
  "totalValue": 5000000,
  "stockValue": 2500000,
  "mfValue": 1500000,
  "propertyValue": 1000000,
  "roiPercent": 12.4
}
```

If any aggregate field is unavailable, return `0` (not `null`, not a string).

---

## 3. Allocation Data

`/assets/me` (and `/assets?user_id=`) should include an `allocation` object:

```json
{
  "allocation": {
    "stock": 45.2,
    "mf": 30.1,
    "realEstate": 24.7
  }
}
```

- Values are **percentages** that must sum to 100.
- If you cannot compute them, omit the field — the frontend will derive
  allocation from the `positions` array using asset `value` / `currentValue`.

---

## 4. Client List (`/clients`)

```json
[
  {
    "id": 1,
    "name": "Rajan Mehta",
    "email": "rajan@example.com",
    "phone": "9876543210",
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

- Never include seed/test records (`name: "string"`, `email: "user@test"`).
  The frontend already filters these, but the backend should not create them.
- `phone` should be digits only (no `+91` prefix — the frontend adds it for
  WhatsApp links).

---

## 5. Portfolio Intelligence (`/api/portfolio/intelligence`)

The insights page fetches this endpoint. Expected response (array):

```json
[
  {
    "clientId": 1,
    "name": "Rajan Mehta",
    "email": "rajan@example.com",
    "isActive": true,
    "portfolioValue": 5000000,
    "returnPercent": 12.4,
    "riskLevel": "Medium",
    "equityPct": 45.2,
    "mfPct": 30.1,
    "realEstatePct": 24.7,
    "suggestedAction": "Hold"
  }
]
```

- `portfolioValue` — numeric INR.
- `returnPercent` — numeric, e.g. `12.4` (not `"12.4%"`).
- `riskLevel` — one of `"Low"`, `"Medium"`, `"High"`.
- `suggestedAction` — one of `"Rebalance"`, `"Hold"`, `"Diversify"`.

---

## 6. Insights (`/insights/me` and `/insights?user_id=<id>`)

```json
{
  "total_portfolio_value": 5000000,
  "equity_percentage": 45.2,
  "real_estate_percentage": 24.7,
  "alerts": [
    "High equity concentration detected",
    "Rebalance recommended before Q2"
  ],
  "assets": [
    {
      "id": 1,
      "name": "Reliance Industries",
      "type": "stock",
      "symbol": "RELIANCE",
      "total_value": 250000,
      "return_percentage": 8.3
    }
  ]
}
```

- Use snake_case for this endpoint (the mapper converts to camelCase).
- If there are no alerts, return `"alerts": []` — do not omit the field.
- `return_percentage` — numeric (not a string, not a percentage sign).

---

## 7. Error Responses

All errors should follow:

```json
{ "success": false, "error": "Human-readable message" }
```

For missing resources, use HTTP 404 (not 410).  The frontend already handles
404 gracefully for portfolio endpoints.

---

## 8. Today's Change / Live Prices

The `StocksTab` "Today Change" card currently shows `—` because no intraday
data is available.  To enable it, add a field to `/assets/me`:

```json
{
  "todayChangeINR": 12450,
  "todayChangePct": 0.84
}
```

If live data is unavailable, omit these fields — the frontend will show
"Data unavailable" rather than a broken value.

---

## 9. Summary

| Frontend expect | Backend must return |
|---|---|
| All money fields | Raw `number` in INR |
| Allocation fields | Percentages summing to 100 |
| `roiPercent` / `returnPercent` | Plain `number` (e.g. `12.4`) |
| `riskLevel` | `"Low"` \| `"Medium"` \| `"High"` |
| Missing/unknown values | `0` for numbers, `[]` for arrays |
| Client list | No test records; phone digits only |
