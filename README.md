# ⚡ EQUITY.OS // Neo-Brutalist Financial Assistant

An institutional-grade personal financial management operating system featuring capital assignment buckets, adaptive multi-interval cash flow trajectory charts, a bucket-bound compounding simulator with market volatility bands, and an emergency survival runway gauge. Styled in high-contrast **Neo-Brutalism** (bold black borders, offset hard shadows, electric accents, and tactile responsive controls).

---

## 🚀 Key Features

### 1. Neo-Brutalist Interface Architecture
- **Stark, tactile visual design:** Thick 3px solid black borders, hard offset shadows (`shadow-[4px_4px_0px_#000]`), retro canvas styling (`#FFFDF8` with micro-dot grid).
- **Interactive tactile physics:** Hover lifts, active button depression (`translate-x-1 translate-y-1 shadow-none`), high-contrast pill stickers.
- **Zero-clutter typography:** JetBrains Mono for financial precision and Space Grotesk for display headers.

### 2. Multi-Vault Equity Assignment System
- **Purpose-driven capital allocation:** Divide total net worth into distinct buckets (e.g., *High-Yield Liquid Cash*, *6-Month Emergency Shield*, *S&P 500 Equities*, *High-Alpha Crypto*).
- **Target vs. Actual Weighting:** Automatically calculates current portfolio allocation percentage vs. target percentage with real-time overweight/underweight indicators.
- **Capital Rebalancing Engine:** One-click inter-bucket transfers with audit trail logging.

### 3. Adaptive Time-Series Analytics
- **Variable Interval Aggregation:**
  - `1W`: Trailing 7 days with daily bins.
  - `1M`: Trailing 30 days with weekly micro-bins.
  - `3M`: Trailing 90 days with weekly intervals.
  - `6M`: Trailing 180 days with monthly intervals.
  - `1Y` / `2Y`: Trailing 365–730 days with monthly intervals.
- **Stacked Recharts visualization:** Neon green inflow (+) vs. punk coral outflow (-) with net cash velocity overlay.
- **Category burn distribution:** Ranked expense categories with progress indicators.
- **50/30/20 Institutional Allocation Audit:** Real-time tracking of Needs (Target 50%) vs. Wants (Target 30%) vs. Capital Investments (Target 20%).

### 4. Advanced Compounding Interest Simulator
- **Dynamic Principal Binding:** Compound on total consolidated net worth, bind directly to a specific assigned bucket (e.g., equities only), or input a custom starting principal.
- **Multi-Frequency Compounding:** Daily ($n = 365$), Weekly ($n = 52$), Monthly ($n = 12$), Quarterly ($n = 4$), or Annually ($n = 1$).
- **Periodic Additions:** Flexible recurring contribution schedule (daily, weekly, monthly, annual).
- **Market Volatility Envelopes (Monte Carlo drift):** Generates Conservative (10th percentile), Median Expected, and Bullish (90th percentile) return bands based on user-defined asset standard deviation.
- **Save Scenarios:** Store and reload multiple blueprints (e.g., FIRE accumulation vs. high-beta crypto cycles).

### 5. Institutional Metrics: Zero-Income Survival Runway
- **Runway duration in months:** $\text{Runway} = \frac{\text{Liquid Reserves}}{\text{Average Monthly Burn}}$.
- **Dual-mode telemetry:** Total burn runway vs. essential needs-only baseline.
- **Status tiers:** CRITICAL (<3 mo), VULNERABLE (3–6 mo), HEALTHY (6–12 mo), INVINCIBLE FORTRESS (12+ mo).
- **Emergency fund target tracker:** Progress bar against user-configured safety targets.

### 6. Dual-Mode Storage: Supabase Cloud & Local Sandbox
- **Instant Local Sandbox:** Pre-seeded with 8 months of realistic financial transactions, buckets, and scenarios for immediate zero-config testing.
- **Supabase Cloud + Google OAuth:** Full schema with PostgreSQL Row Level Security (RLS) policies guaranteeing strict multi-tenant isolation.
- **Data Portability:** One-click CSV export and complete JSON backup/restore.

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Run Locally in Development Mode
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the application.

### 3. Production Build & Smoke Run
```bash
bun run build
bun run start
```

---

## 🗄️ Supabase & Google OAuth Setup

1. In your [Supabase Dashboard](https://supabase.com), create a new project.
2. Go to **SQL Editor** and execute `supabase/schema.sql`.
3. Copy your project URL and anon public key into a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
4. In Supabase under **Authentication → Providers → Google**, enable the Google provider with your Google Cloud OAuth Client ID & Secret.
5. In Google Cloud Console, add `https://<your-project>.supabase.co/auth/v1/callback` to Authorized Redirect URIs.
