export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'IDR' | 'JPY' | 'AUD' | 'CAD' | 'SGD';

export type BucketCategory = 
  | 'liquid_cash' 
  | 'emergency_fund' 
  | 'equities' 
  | 'crypto' 
  | 'real_estate' 
  | 'retirement' 
  | 'other';

export interface EquityBucket {
  id: string;
  user_id?: string;
  name: string;
  category: BucketCategory;
  current_balance: number;
  target_allocation_pct: number;
  is_liquid: boolean;
  color_hex: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';
export type NeedVsWant = 'need' | 'want' | 'investment';

export interface Transaction {
  id: string;
  user_id?: string;
  bucket_id: string | null;
  type: TransactionType;
  category: string;
  amount: number;
  currency: CurrencyCode;
  date: string; // YYYY-MM-DD
  note?: string;
  is_recurring: boolean;
  need_vs_want: NeedVsWant;
  created_at?: string;
}

export type CompoundingFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type ContributionFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CompoundingScenario {
  id: string;
  user_id?: string;
  bucket_id: string | null;
  title: string;
  principal_amount: number;
  annual_rate_pct: number;
  compounding_frequency: CompoundingFrequency;
  contribution_amount: number;
  contribution_frequency: ContributionFrequency;
  time_horizon_years: number;
  expected_volatility_pct?: number;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  base_currency: CurrencyCode;
  monthly_income_baseline: number;
  emergency_fund_target_months: number;
}

export type TimeWindow = '1W' | '1M' | '3M' | '6M' | '1Y' | '2Y' | 'ALL';

export interface TimeSeriesPoint {
  label: string;
  date: string;
  income: number;
  expense: number;
  netFlow: number;
  cumulativeSavings: number;
}

export interface CategorySummary {
  category: string;
  total: number;
  percentage: number;
  color: string;
  type: TransactionType;
  count: number;
}

export interface FinancialHealthMetrics {
  totalEquity: number;
  liquidEquity: number;
  monthlyIncome: number;
  monthlyBurn: number;
  fixedNeedsRatio: number; // % of expenses that are 'need'
  discretionaryRatio: number; // % that are 'want'
  savingsRate: number; // %
  runwayMonths: number;
  emergencyFundStatus: 'CRITICAL' | 'WARNING' | 'HEALTHY' | 'FORTRESS';
}
