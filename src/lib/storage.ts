import { EquityBucket, Transaction, CompoundingScenario, UserProfile, NeedVsWant } from '@/types/finance';
import { supabase, isSupabaseConfigured } from './supabase/client';

const STORAGE_KEYS = {
  BUCKETS: 'neobrutal_equity_buckets_v1',
  TRANSACTIONS: 'neobrutal_transactions_v1',
  SCENARIOS: 'neobrutal_scenarios_v1',
  PROFILE: 'neobrutal_profile_v1',
};

// Seed Realistic Default Data for Instant Exploration & Demo
export const DEFAULT_BUCKETS: EquityBucket[] = [
  {
    id: 'b-emergency',
    name: 'Emergency Shield (6M)',
    category: 'emergency_fund',
    current_balance: 18500,
    target_allocation_pct: 25,
    is_liquid: true,
    color_hex: '#FFE81D', // Yellow
    notes: 'High-yield savings (4.8% APY) allocated for living expenses buffer.',
  },
  {
    id: 'b-liquid',
    name: 'Operating Cash & Checking',
    category: 'liquid_cash',
    current_balance: 6200,
    target_allocation_pct: 10,
    is_liquid: true,
    color_hex: '#46E88E', // Green
    notes: 'Checking account for daily lifestyle expenses, credit card settlements.',
  },
  {
    id: 'b-equities',
    name: 'S&P 500 & Tech Equities',
    category: 'equities',
    current_balance: 38400,
    target_allocation_pct: 45,
    is_liquid: false,
    color_hex: '#59B4FF', // Vivid Blue
    notes: 'Core portfolio: VOO, QQQ, and individual dividend compounding equities.',
  },
  {
    id: 'b-crypto',
    name: 'High Alpha Crypto & BTC',
    category: 'crypto',
    current_balance: 14200,
    target_allocation_pct: 20,
    is_liquid: false,
    color_hex: '#FF6B8B', // Punk Coral
    notes: 'Cold storage Bitcoin and tactical decentralized liquidity positions.',
  },
];

export const DEFAULT_PROFILE: UserProfile = {
  id: 'usr-default',
  email: 'trader@institutional.net',
  full_name: 'Alex Sterling',
  base_currency: 'USD',
  monthly_income_baseline: 8500,
  emergency_fund_target_months: 6,
};

// Helper: generate realistic 90-day time-series transactions
function generateSeedTransactions(): Transaction[] {
  const categoriesExpense: { cat: string; need: NeedVsWant; amt: number }[] = [
    { cat: 'Housing & Utilities', need: 'need', amt: 2200 },
    { cat: 'Groceries & Health', need: 'need', amt: 650 },
    { cat: 'Dining & Social', need: 'want', amt: 480 },
    { cat: 'Software & Cloud Tech', need: 'want', amt: 140 },
    { cat: 'Transport & Fuel', need: 'need', amt: 220 },
    { cat: 'Investment Allocation', need: 'investment', amt: 1500 },
  ];

  const txs: Transaction[] = [];
  const now = new Date();

  // Past 8 months of data for rich multi-timeframe analytics
  for (let m = 7; m >= 0; m--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const dateStrMonth = monthDate.toISOString().split('T')[0];

    // Primary Monthly Income (Salary/Direct Inflow)
    txs.push({
      id: `tx-inc-sal-${m}`,
      bucket_id: 'b-liquid',
      type: 'income',
      category: 'Primary Salary & Consulting',
      amount: 8500,
      currency: 'USD',
      date: `${dateStrMonth.slice(0, 7)}-01`,
      note: 'Monthly retainer & consulting salary',
      is_recurring: true,
      need_vs_want: 'need',
    });

    // Secondary Income (Dividends / Staking / Yield)
    if (m % 2 === 0) {
      txs.push({
        id: `tx-inc-div-${m}`,
        bucket_id: 'b-equities',
        type: 'income',
        category: 'Investment Yield & Dividends',
        amount: 420 + (m * 45),
        currency: 'USD',
        date: `${dateStrMonth.slice(0, 7)}-15`,
        note: 'VOO quarterly distributions and bond yields',
        is_recurring: false,
        need_vs_want: 'investment',
      });
    }

    // Monthly Expenses
    categoriesExpense.forEach((item, idx) => {
      const jitter = (idx * 27) % 80 - 40;
      const day = String(Math.min(25, 4 + idx * 3)).padStart(2, '0');
      txs.push({
        id: `tx-exp-${m}-${idx}`,
        bucket_id: item.need === 'investment' ? 'b-equities' : 'b-liquid',
        type: 'expense',
        category: item.cat,
        amount: Math.max(50, item.amt + jitter),
        currency: 'USD',
        date: `${dateStrMonth.slice(0, 7)}-${day}`,
        note: `Scheduled monthly ${item.cat.toLowerCase()}`,
        is_recurring: true,
        need_vs_want: item.need,
      });
    });
  }

  return txs;
}

export const DEFAULT_SCENARIOS: CompoundingScenario[] = [
  {
    id: 'sc-equities-fire',
    bucket_id: 'b-equities',
    title: 'S&P 500 Long-Term Wealth Accumulator',
    principal_amount: 38400,
    annual_rate_pct: 11.2,
    compounding_frequency: 'monthly',
    contribution_amount: 1500,
    contribution_frequency: 'monthly',
    time_horizon_years: 15,
    expected_volatility_pct: 14.5,
  },
  {
    id: 'sc-btc-alpha',
    bucket_id: 'b-crypto',
    title: 'Crypto High-Beta 4-Year Cycle',
    principal_amount: 14200,
    annual_rate_pct: 28.0,
    compounding_frequency: 'daily',
    contribution_amount: 400,
    contribution_frequency: 'monthly',
    time_horizon_years: 5,
    expected_volatility_pct: 45.0,
  },
];

// Unified Storage Adapter
export class FinanceStorage {

  // --- BUCKETS ---
  static getBuckets(): EquityBucket[] {
    if (typeof window === 'undefined') return DEFAULT_BUCKETS;
    const raw = localStorage.getItem(STORAGE_KEYS.BUCKETS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.BUCKETS, JSON.stringify(DEFAULT_BUCKETS));
      return DEFAULT_BUCKETS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_BUCKETS;
    }
  }

  static saveBucket(bucket: EquityBucket): EquityBucket[] {
    const list = this.getBuckets();
    const existingIndex = list.findIndex(b => b.id === bucket.id);
    let updated: EquityBucket[];

    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = { ...bucket, updated_at: new Date().toISOString() };
    } else {
      updated = [...list, { ...bucket, id: bucket.id || `b-${Date.now()}`, created_at: new Date().toISOString() }];
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.BUCKETS, JSON.stringify(updated));
    }
    return updated;
  }

  static deleteBucket(bucketId: string): EquityBucket[] {
    const list = this.getBuckets().filter(b => b.id !== bucketId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.BUCKETS, JSON.stringify(list));
    }
    return list;
  }

  // --- TRANSACTIONS ---
  static getTransactions(): Transaction[] {
    if (typeof window === 'undefined') return generateSeedTransactions();
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      const seed = generateSeedTransactions();
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(seed));
      return seed;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return generateSeedTransactions();
    }
  }

  static saveTransaction(tx: Transaction): { transactions: Transaction[]; buckets: EquityBucket[] } {
    const list = this.getTransactions();
    const existingIndex = list.findIndex(t => t.id === tx.id);
    const isNew = existingIndex < 0;
    const oldTx = !isNew ? list[existingIndex] : null;

    let updatedTxList: Transaction[];
    if (isNew) {
      updatedTxList = [
        { ...tx, id: tx.id || `tx-${Date.now()}`, created_at: new Date().toISOString() },
        ...list,
      ];
    } else {
      updatedTxList = [...list];
      updatedTxList[existingIndex] = tx;
    }

    // Automatically reconcile assigned bucket balances
    let currentBuckets = this.getBuckets();
    if (tx.bucket_id) {
      currentBuckets = currentBuckets.map(b => {
        if (b.id !== tx.bucket_id) return b;
        let delta = 0;
        if (isNew) {
          delta = tx.type === 'income' ? tx.amount : -tx.amount;
        } else if (oldTx) {
          const oldImpact = oldTx.type === 'income' ? oldTx.amount : -oldTx.amount;
          const newImpact = tx.type === 'income' ? tx.amount : -tx.amount;
          delta = newImpact - oldImpact;
        }
        return {
          ...b,
          current_balance: Math.max(0, b.current_balance + delta),
        };
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.BUCKETS, JSON.stringify(currentBuckets));
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTxList));
    }

    return { transactions: updatedTxList, buckets: currentBuckets };
  }

  static deleteTransaction(txId: string): { transactions: Transaction[]; buckets: EquityBucket[] } {
    const list = this.getTransactions();
    const target = list.find(t => t.id === txId);
    const filtered = list.filter(t => t.id !== txId);

    let currentBuckets = this.getBuckets();
    if (target && target.bucket_id) {
      currentBuckets = currentBuckets.map(b => {
        if (b.id !== target.bucket_id) return b;
        const delta = target.type === 'income' ? -target.amount : target.amount;
        return {
          ...b,
          current_balance: Math.max(0, b.current_balance + delta),
        };
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.BUCKETS, JSON.stringify(currentBuckets));
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(filtered));
    }

    return { transactions: filtered, buckets: currentBuckets };
  }

  // --- SCENARIOS ---
  static getScenarios(): CompoundingScenario[] {
    if (typeof window === 'undefined') return DEFAULT_SCENARIOS;
    const raw = localStorage.getItem(STORAGE_KEYS.SCENARIOS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(DEFAULT_SCENARIOS));
      return DEFAULT_SCENARIOS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_SCENARIOS;
    }
  }

  static saveScenario(scenario: CompoundingScenario): CompoundingScenario[] {
    const list = this.getScenarios();
    const idx = list.findIndex(s => s.id === scenario.id);
    let updated: CompoundingScenario[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = scenario;
    } else {
      updated = [...list, { ...scenario, id: scenario.id || `sc-${Date.now()}` }];
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(updated));
    }
    return updated;
  }

  static deleteScenario(id: string): CompoundingScenario[] {
    const list = this.getScenarios().filter(s => s.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(list));
    }
    return list;
  }

  // --- PROFILE ---
  static getProfile(): UserProfile {
    if (typeof window === 'undefined') return DEFAULT_PROFILE;
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(DEFAULT_PROFILE));
      return DEFAULT_PROFILE;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_PROFILE;
    }
  }

  static updateProfile(profile: Partial<UserProfile>): UserProfile {
    const current = this.getProfile();
    const updated = { ...current, ...profile };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
    }
    return updated;
  }

  // --- EXPORT / IMPORT ---
  static exportFullDataset(): string {
    const data = {
      profile: this.getProfile(),
      buckets: this.getBuckets(),
      transactions: this.getTransactions(),
      scenarios: this.getScenarios(),
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    return JSON.stringify(data, null, 2);
  }

  static importDataset(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof window !== 'undefined') {
        if (parsed.profile) localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(parsed.profile));
        if (parsed.buckets) localStorage.setItem(STORAGE_KEYS.BUCKETS, JSON.stringify(parsed.buckets));
        if (parsed.transactions) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(parsed.transactions));
        if (parsed.scenarios) localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(parsed.scenarios));
      }
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  static resetToDefaults() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.BUCKETS);
      localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
      localStorage.removeItem(STORAGE_KEYS.SCENARIOS);
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
    }
  }
}
