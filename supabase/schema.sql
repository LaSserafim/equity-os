-- ====================================================================
-- NEO-BRUTALIST FINANCIAL ASSISTANT - PRODUCTION SUPABASE DATABASE SCHEMA
-- ====================================================================

-- 1. PROFILES TABLE (Extensions to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  base_currency text not null default 'USD',
  monthly_income_baseline numeric(15,2) default 0.00,
  emergency_fund_target_months integer default 6,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. EQUITY BUCKETS (Assigned Capital / Sub-Accounts)
create table if not exists public.equity_buckets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  category text not null check (category in ('liquid_cash', 'emergency_fund', 'equities', 'crypto', 'real_estate', 'retirement', 'other')),
  current_balance numeric(15,2) not null default 0.00,
  target_allocation_pct numeric(5,2) default 0.00, -- e.g. 25.00 (%)
  is_liquid boolean not null default true,
  color_hex text not null default '#FFE81D',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. TRANSACTIONS TABLE (Detailed Income & Expense Ledger)
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  bucket_id uuid references public.equity_buckets on delete set null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  category text not null,
  amount numeric(15,2) not null check (amount > 0),
  currency text not null default 'USD',
  date date not null default current_date,
  note text,
  is_recurring boolean default false,
  need_vs_want text not null default 'need' check (need_vs_want in ('need', 'want', 'investment')),
  created_at timestamptz default now()
);

-- 4. COMPOUNDING SCENARIOS (Saved Projections & Monte Carlo Models)
create table if not exists public.compounding_scenarios (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  bucket_id uuid references public.equity_buckets on delete set null,
  title text not null,
  principal_amount numeric(15,2) not null check (principal_amount >= 0),
  annual_rate_pct numeric(7,4) not null, -- e.g. 10.5000%
  compounding_frequency text not null default 'monthly' check (compounding_frequency in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  contribution_amount numeric(15,2) default 0.00,
  contribution_frequency text not null default 'monthly' check (contribution_frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  time_horizon_years integer not null default 5 check (time_horizon_years between 1 and 60),
  expected_volatility_pct numeric(5,2) default 15.00, -- for Monte Carlo simulation
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
alter table public.profiles enable row level security;
alter table public.equity_buckets enable row level security;
alter table public.transactions enable row level security;
alter table public.compounding_scenarios enable row level security;

-- Profiles: Users can view and edit only their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Equity Buckets
create policy "Users can view own buckets" on public.equity_buckets
  for select using (auth.uid() = user_id);
create policy "Users can insert own buckets" on public.equity_buckets
  for insert with check (auth.uid() = user_id);
create policy "Users can update own buckets" on public.equity_buckets
  for update using (auth.uid() = user_id);
create policy "Users can delete own buckets" on public.equity_buckets
  for delete using (auth.uid() = user_id);

-- Transactions
create policy "Users can view own transactions" on public.transactions
  for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on public.transactions
  for update using (auth.uid() = user_id);
create policy "Users can delete own transactions" on public.transactions
  for delete using (auth.uid() = user_id);

-- Compounding Scenarios
create policy "Users can view own scenarios" on public.compounding_scenarios
  for select using (auth.uid() = user_id);
create policy "Users can insert own scenarios" on public.compounding_scenarios
  for insert with check (auth.uid() = user_id);
create policy "Users can update own scenarios" on public.compounding_scenarios
  for update using (auth.uid() = user_id);
create policy "Users can delete own scenarios" on public.compounding_scenarios
  for delete using (auth.uid() = user_id);

-- ====================================================================
-- AUTOMATIC PROFILE CREATION & DEFAULT BUCKETS TRIGGER
-- ====================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- 1. Create Profile
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Trader / User'),
    new.raw_user_meta_data->>'avatar_url'
  );

  -- 2. Seed default starter buckets for the new user
  insert into public.equity_buckets (user_id, name, category, current_balance, target_allocation_pct, is_liquid, color_hex)
  values
    (new.id, 'High-Yield Liquid Cash', 'liquid_cash', 5000.00, 20.00, true, '#46E88E'),
    (new.id, '6-Month Emergency Shield', 'emergency_fund', 15000.00, 30.00, true, '#FFE81D'),
    (new.id, 'Growth Equities & ETFs', 'equities', 20000.00, 40.00, false, '#59B4FF'),
    (new.id, 'Alpha Trading & Crypto', 'crypto', 5000.00, 10.00, false, '#FF6B8B');

  return new;
end;
$$ language plpgsql security definer;

-- Trigger firing on new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ====================================================================
-- INDEXES FOR FAST TIME-SERIES AND CATEGORY QUERIES
-- ====================================================================
create index if not exists idx_transactions_user_date on public.transactions (user_id, date desc);
create index if not exists idx_transactions_user_category on public.transactions (user_id, category);
create index if not exists idx_transactions_bucket on public.transactions (bucket_id);
create index if not exists idx_buckets_user on public.equity_buckets (user_id);
