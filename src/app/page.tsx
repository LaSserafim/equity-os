'use client';

import React, { useState, useEffect } from 'react';
import { EquityBucket, Transaction, CompoundingScenario, UserProfile, CurrencyCode } from '@/types/finance';
import { FinanceStorage, DEFAULT_PROFILE } from '@/lib/storage';
import { Navbar, ActiveTab } from '@/components/layout/Navbar';
import { SurvivalRunwayGauge } from '@/components/metrics/SurvivalRunwayGauge';
import { EquityBucketsSection } from '@/components/equity/EquityBucketsSection';
import { AnalyticsSection } from '@/components/analytics/AnalyticsSection';
import { CompoundingCalculator } from '@/components/calculator/CompoundingCalculator';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { signInWithGoogle } from '@/lib/supabase/auth';
import { generateUUID } from '@/lib/uuid';
import type { User } from '@supabase/supabase-js';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Layers,
  TrendingUp,
  Lock,
  ShieldCheck,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

export default function FinancialAssistantPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [buckets, setBuckets] = useState<EquityBucket[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [scenarios, setScenarios] = useState<CompoundingScenario[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isQuickTxOpen, setIsQuickTxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [bypassAuth, setBypassAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  useEffect(() => {
    let isSubscribed = true;
    const savedPrivacy = typeof window !== 'undefined' ? localStorage.getItem('neobrutal_privacy_mode') : null;
    if (savedPrivacy) setIsPrivacyMode(savedPrivacy === 'true');

    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      const errParam = currentUrl.searchParams.get('auth_error') || currentUrl.searchParams.get('error_description');
      if (errParam) setAuthError(decodeURIComponent(errParam));

      const codeParam = currentUrl.searchParams.get('code');
      if (codeParam) {
        supabase.auth.exchangeCodeForSession(codeParam).then(({ data, error: exErr }) => {
          if (!exErr && data?.user) {
            setUser(data.user);
            FinanceStorage.fetchCloudData(data.user.id).then((cloud) => {
              if (cloud) {
                setBuckets(cloud.buckets);
                setTransactions(cloud.transactions);
                setScenarios(cloud.scenarios);
                setProfile(cloud.profile);
              }
            });
            currentUrl.searchParams.delete('code');
            window.history.replaceState({}, '', currentUrl.pathname + (currentUrl.search ? '?' + currentUrl.searchParams.toString() : ''));
          }
        });
      }
    }

    // Instantly load local data so numbers never wipe to zero on refresh
    setBuckets(FinanceStorage.getBuckets());
    setTransactions(FinanceStorage.getTransactions());
    setScenarios(FinanceStorage.getScenarios());
    setProfile(FinanceStorage.getProfile());

    async function initAuth() {
      if (!isSupabaseConfigured) {
        setAuthLoading(false);
        setMounted(true);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        if (!isSubscribed) return;

        setUser(currentUser);

        if (currentUser) {
          const cloudData = await FinanceStorage.fetchCloudData(currentUser.id);
          if (isSubscribed && cloudData) {
            setBuckets(cloudData.buckets);
            setTransactions(cloudData.transactions);
            setScenarios(cloudData.scenarios);
            setProfile(cloudData.profile);
          }
        }
      } catch (err) {
        console.warn('Auth session check warning:', err);
      } finally {
        if (isSubscribed) {
          setAuthLoading(false);
          setMounted(true);
        }
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        const cloudData = await FinanceStorage.fetchCloudData(activeUser.id);
        if (cloudData) {
          setBuckets(cloudData.buckets);
          setTransactions(cloudData.transactions);
          setScenarios(cloudData.scenarios);
          setProfile(cloudData.profile);
        }
      }
      setAuthLoading(false);
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, []);

  // Handlers for Buckets
  const handleSaveBucket = (bucket: EquityBucket) => {
    const updated = FinanceStorage.saveBucket(bucket, user?.id);
    setBuckets(updated);
  };

  const handleDeleteBucket = (bucketId: string) => {
    const updated = FinanceStorage.deleteBucket(bucketId, user?.id);
    setBuckets(updated);
  };

  const handleTransferCapital = (sourceId: string, targetId: string, amount: number) => {
    const sourceBucket = buckets.find((b) => b.id === sourceId);
    const targetBucket = buckets.find((b) => b.id === targetId);
    if (!sourceBucket || !targetBucket) return;

    const updatedSource: EquityBucket = {
      ...sourceBucket,
      current_balance: Math.max(0, sourceBucket.current_balance - amount),
    };
    const updatedTarget: EquityBucket = {
      ...targetBucket,
      current_balance: targetBucket.current_balance + amount,
    };

    FinanceStorage.saveBucket(updatedSource, user?.id);
    const finalList = FinanceStorage.saveBucket(updatedTarget, user?.id);
    setBuckets(finalList);

    const transferTx: Transaction = {
      id: generateUUID(),
      bucket_id: targetId,
      type: 'transfer',
      category: 'Capital Rebalancing',
      amount,
      currency: activeCurrency,
      date: new Date().toISOString().split('T')[0],
      note: `Internal rebalance: ${sourceBucket.name} ➡️ ${targetBucket.name}`,
      is_recurring: false,
      need_vs_want: 'investment',
    };
    const res = FinanceStorage.saveTransaction(transferTx, user?.id);
    setTransactions(res.transactions);
  };

  // Handlers for Transactions
  const handleSaveTransaction = (tx: Transaction) => {
    const { transactions: newTxList, buckets: newBucketList } = FinanceStorage.saveTransaction(tx, user?.id);
    setTransactions(newTxList);
    setBuckets(newBucketList);
  };

  const handleDeleteTransaction = (txId: string) => {
    const { transactions: newTxList, buckets: newBucketList } = FinanceStorage.deleteTransaction(txId, user?.id);
    setTransactions(newTxList);
    setBuckets(newBucketList);
  };

  // Handlers for Scenarios
  const handleSaveScenario = (scenario: CompoundingScenario) => {
    const updated = FinanceStorage.saveScenario(scenario, user?.id);
    setScenarios(updated);
  };

  const handleDeleteScenario = (id: string) => {
    const updated = FinanceStorage.deleteScenario(id, user?.id);
    setScenarios(updated);
  };

  // Handlers for Currency
  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    const updated = FinanceStorage.updateProfile({ base_currency: newCurrency }, user?.id);
    setProfile(updated);
  };

  const handleTogglePrivacy = () => {
    setIsPrivacyMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('neobrutal_privacy_mode', String(next));
      }
      return next;
    });
  };

  // Export / Import / Reset
  const handleExportData = () => {
    const jsonStr = FinanceStorage.exportFullDataset();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `equity-os-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (jsonStr: string) => {
    const success = FinanceStorage.importDataset(jsonStr);
    if (success) {
      setBuckets(FinanceStorage.getBuckets());
      setTransactions(FinanceStorage.getTransactions());
      setScenarios(FinanceStorage.getScenarios());
      setProfile(FinanceStorage.getProfile());
      alert('Dataset successfully restored!');
    }
  };

  const handleResetData = () => {
    FinanceStorage.clearAllData();
    setBuckets([]);
    setTransactions([]);
    setScenarios([]);
    setProfile(DEFAULT_PROFILE);
  };

  // Loading Screen
  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center font-mono">
        <div className="border-[3px] border-black p-6 bg-white shadow-[6px_6px_0px_0px_#000000]">
          <h2 className="text-sm font-black uppercase flex items-center gap-2">
            <KeyRound className="w-4 h-4 animate-spin text-black" />
            Initializing Encrypted Telemetry...
          </h2>
        </div>
      </div>
    );
  }

  // RESTRICTED ACCESS GATE (Exclusive Google OAuth Screen)
  if (isSupabaseConfigured && !user && !bypassAuth) {
    return (
      <div className="min-h-screen bg-[#FFFDF8] flex flex-col justify-center items-center p-4 font-mono">
        <div className="max-w-md w-full bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_#000000] overflow-hidden">
          {/* Top Yellow Warning Strip */}
          <div className="bg-[#FFE81D] border-b-[3px] border-black p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-black" />
              <span className="font-black text-xs uppercase tracking-widest text-black">
                RESTRICTED TERMINAL ACCESS
              </span>
            </div>
            <span className="text-[10px] font-black uppercase bg-black text-white px-2 py-0.5 border border-black">
              Google OAuth Only
            </span>
          </div>

          <div className="p-6 flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-black uppercase text-black tracking-tight">
                ⚡ EQUITY.OS
              </h1>
              <p className="text-xs font-bold text-gray-700 mt-1">
                Personalized Financial Telemetry & Compounding Workstation
              </p>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed border-l-2 border-black pl-3 py-1">
              Access is exclusive to authenticated Google accounts. All personal equity vaults, ledger records, and compounding blueprints are partitioned under strict PostgreSQL Row Level Security (RLS).
            </p>

            {authError && (
              <div className="bg-[#EF4444] text-white p-3 border-2 border-black font-mono text-xs font-bold shadow-[2px_2px_0px_0px_#000000] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-black uppercase">Authentication Error</div>
                  <div className="text-[11px] font-normal mt-0.5">{authError}</div>
                  <div className="text-[10px] text-white/80 mt-1">
                    Ensure https://equity-os-eight.vercel.app/** is in your Supabase Auth Redirect URLs.
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => signInWithGoogle()}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-[#FFE81D] text-black font-mono font-black text-xs uppercase p-3.5 border-[3px] border-black shadow-[4px_4px_0px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Sign In With Google
            </button>
            <button
              type="button"
              onClick={() => setBypassAuth(true)}
              className="w-full text-center text-[11px] font-mono font-bold text-gray-500 hover:text-black underline cursor-pointer pt-1"
            >
              Continue in Local Sandbox Mode →
            </button>
            <div className="flex items-center gap-2 text-[10px] text-gray-500 pt-2 border-t border-black/20">
              <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
              <span>Zero telemetry exposed without authenticated session</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Derived aggregates for Quick Overview
  const activeCurrency: CurrencyCode = profile.base_currency || 'IDR';
  const totalNetWorth = buckets.reduce((s, b) => s + b.current_balance, 0);
  const liquidReserves = buckets.filter((b) => b.is_liquid).reduce((s, b) => s + b.current_balance, 0);

  // Trailing 30 days inflow & outflow
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const last30dTx = transactions.filter((t) => new Date(t.date) >= thirtyDaysAgo);
  const last30dInflow = last30dTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const last30dOutflow = last30dTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savingsRate = last30dInflow > 0 ? ((last30dInflow - last30dOutflow) / last30dInflow) * 100 : 0;

  const displayName = profile.full_name || user?.user_metadata?.full_name || user?.email || 'Investor';

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF8]">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currency={activeCurrency}
        onCurrencyChange={handleCurrencyChange}
        isPrivacyMode={isPrivacyMode}
        onTogglePrivacy={handleTogglePrivacy}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onResetData={handleResetData}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        {/* VIEW 1: OVERVIEW & HEALTH */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-150">
            {/* Mission Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-[3px] border-black bg-[#FFE81D] p-5 shadow-[5px_5px_0px_0px_#000000]">
              <div>
                <span className="text-[10px] font-mono font-black uppercase tracking-widest bg-black text-white px-2 py-0.5 border border-black">
                  REAL CAPITAL TELEMETRY
                </span>
                <h2 className="text-xl md:text-2xl font-mono font-black uppercase text-black mt-1">
                  Welcome back, {displayName}
                </h2>
                <p className="text-xs font-mono font-bold text-black/80 mt-0.5">
                  {buckets.length === 0
                    ? 'No equity vaults assigned yet. Create a vault to begin tracking real assets.'
                    : `Your capital architecture is currently tracking across ${buckets.length} assigned equity vaults.`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <BrutalButton
                  variant="black"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setIsQuickTxOpen(true)}
                >
                  Quick Log Entry
                </BrutalButton>
                <BrutalButton
                  variant="white"
                  size="sm"
                  icon={<Layers className="w-3.5 h-3.5" />}
                  onClick={() => setActiveTab('buckets')}
                >
                  Manage Buckets
                </BrutalButton>
              </div>
            </div>

            {/* Quick KPI Quad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <BrutalCard title="Total Equity" badge={buckets.length > 0 ? 'Live Net Worth' : 'No Data'} badgeColor={buckets.length > 0 ? 'yellow' : 'orange'} headerColor="bg-[#FFFBEB]">
                <div className="text-2xl font-mono font-black text-black">
                  {buckets.length > 0 ? formatCurrency(totalNetWorth, activeCurrency, isPrivacyMode) : (activeCurrency === 'IDR' ? 'Rp 0' : '$0.00')}
                </div>
                <div className="text-[11px] font-mono text-gray-600 mt-1">
                  {buckets.length === 0 ? 'No vaults configured' : `Across ${buckets.length} allocated vaults`}
                </div>
              </BrutalCard>

              <BrutalCard title="Liquid Cash" badge={liquidReserves > 0 ? 'Available' : 'Insufficient Data'} badgeColor={liquidReserves > 0 ? 'green' : 'orange'} headerColor="bg-[#DCFCE7]">
                <div className="text-2xl font-mono font-black text-black">
                  {formatCurrency(liquidReserves, activeCurrency, isPrivacyMode)}
                </div>
                <div className="text-[11px] font-mono text-gray-600 mt-1">
                  {totalNetWorth > 0 ? `${((liquidReserves / totalNetWorth) * 100).toFixed(1)}% of total equity` : 'No liquid vault balance'}
                </div>
              </BrutalCard>

              <BrutalCard title="30-Day Cash Inflow" badge={last30dInflow > 0 ? 'Revenue' : 'No Inflow'} badgeColor={last30dInflow > 0 ? 'blue' : 'yellow'} headerColor="bg-[#DBEAFE]">
                <div className="text-2xl font-mono font-black text-[#059669]">
                  {last30dInflow > 0 ? `+${formatCurrency(last30dInflow, activeCurrency, isPrivacyMode)}` : (activeCurrency === 'IDR' ? 'Rp 0' : '$0.00')}
                </div>
                <div className="text-[11px] font-mono text-gray-600 mt-1">
                  {last30dTx.filter((t) => t.type === 'income').length} income records in last 30d
                </div>
              </BrutalCard>

              <BrutalCard title="30-Day Burn Rate" badge={last30dOutflow > 0 ? 'Outflow' : 'No Outflow'} badgeColor={last30dOutflow > 0 ? 'pink' : 'yellow'} headerColor="bg-[#FCE7F3]">
                <div className="text-2xl font-mono font-black text-[#DC2626]">
                  {last30dOutflow > 0 ? `-${formatCurrency(last30dOutflow, activeCurrency, isPrivacyMode)}` : (activeCurrency === 'IDR' ? 'Rp 0' : '$0.00')}
                </div>
                <div className="text-[11px] font-mono text-gray-600 mt-1">
                  {last30dInflow > 0 ? `Savings Rate: ${formatPercent(savingsRate)}` : 'No burn telemetry recorded'}
                </div>
              </BrutalCard>
            </div>

            {/* Survival Runway & Emergency Shield Gauge */}
            <SurvivalRunwayGauge
              buckets={buckets}
              transactions={transactions}
              profile={profile}
              currency={activeCurrency}
              isPrivacyMode={isPrivacyMode}
            />

            {/* Two-Column: Quick Buckets Mini-Grid + Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Assigned Buckets Summary (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <h3 className="font-mono font-black text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Allocated Equity Vaults
                  </h3>
                  <button
                    onClick={() => setActiveTab('buckets')}
                    className="text-xs font-mono font-bold underline hover:text-blue-600 cursor-pointer"
                  >
                    View All ({buckets.length}) →
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {buckets.length === 0 ? (
                    <div className="p-6 border-2 border-dashed border-black/40 bg-[#FFFBEB] text-center font-mono flex flex-col items-center justify-center gap-2">
                      <span className="text-xs font-black uppercase text-black">No Vaults Configured</span>
                      <span className="text-[11px] text-gray-600">Assign your real cash or investment accounts in the Buckets tab.</span>
                      <BrutalButton variant="yellow" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setActiveTab('buckets')}>
                        Add First Vault
                      </BrutalButton>
                    </div>
                  ) : (
                    buckets.map((b) => {
                      const pct = totalNetWorth > 0 ? (b.current_balance / totalNetWorth) * 100 : 0;
                      return (
                        <div
                          key={b.id}
                          onClick={() => setActiveTab('buckets')}
                          className="p-3 border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000000] transition-all cursor-pointer flex items-center justify-between font-mono"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3.5 h-3.5 border border-black inline-block flex-shrink-0"
                              style={{ backgroundColor: b.color_hex }}
                            />
                            <div>
                              <div className="font-black text-xs text-black line-clamp-1">{b.name}</div>
                              <div className="text-[10px] text-gray-500 uppercase">{b.category.replace('_', ' ')}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-black text-xs text-black">{formatCurrency(b.current_balance, activeCurrency, isPrivacyMode)}</div>
                            <div className="text-[10px] text-gray-600">{pct.toFixed(1)}%</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Recent Activity Feed (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <h3 className="font-mono font-black text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Recent Cash Velocity Ledger
                  </h3>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="text-xs font-mono font-bold underline hover:text-blue-600 cursor-pointer"
                  >
                    Open Ledger ({transactions.length}) →
                  </button>
                </div>

                <div className="flex flex-col gap-2 font-mono text-xs">
                  {transactions.length === 0 ? (
                    <div className="p-6 border-2 border-dashed border-black/40 bg-[#FFFBEB] text-center font-mono flex flex-col items-center justify-center gap-2">
                      <span className="text-xs font-black uppercase text-black">No Transactions Logged</span>
                      <span className="text-[11px] text-gray-600">Record your real income and expense entries to begin time-series telemetry.</span>
                      <BrutalButton variant="pink" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsQuickTxOpen(true)}>
                        Quick Log Entry
                      </BrutalButton>
                    </div>
                  ) : (
                    transactions.slice(0, 6).map((tx) => {
                      const isIncome = tx.type === 'income';
                      const bucket = buckets.find((b) => b.id === tx.bucket_id);
                      return (
                        <div
                          key={tx.id}
                          className="p-2.5 border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000000] flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`p-1 border border-black text-xs ${
                                isIncome ? 'bg-[#46E88E] text-black' : 'bg-[#FF5E7E] text-white'
                              }`}
                            >
                              {isIncome ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            </span>
                            <div>
                              <div className="font-bold text-black">{tx.category}</div>
                              <div className="text-[10px] text-gray-500">
                                {tx.date} • {bucket ? bucket.name : 'General Flow'}
                              </div>
                            </div>
                          </div>

                          <div className={`font-black text-sm ${isIncome ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                            {isIncome ? `+${formatCurrency(tx.amount, tx.currency || activeCurrency, isPrivacyMode)}` : `-${formatCurrency(tx.amount, tx.currency || activeCurrency, isPrivacyMode)}`}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: EQUITY BUCKETS */}
        {activeTab === 'buckets' && (
          <div className="animate-in fade-in duration-150">
            <EquityBucketsSection
              buckets={buckets}
              onSaveBucket={handleSaveBucket}
              onDeleteBucket={handleDeleteBucket}
              onTransferCapital={handleTransferCapital}
              currency={activeCurrency}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
        )}

        {/* VIEW 3: TIME-SERIES ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="animate-in fade-in duration-150">
            <AnalyticsSection transactions={transactions} currency={activeCurrency} isPrivacyMode={isPrivacyMode} />
          </div>
        )}

        {/* VIEW 4: COMPOUNDING SIMULATOR */}
        {activeTab === 'compounding' && (
          <div className="animate-in fade-in duration-150">
            <CompoundingCalculator
              buckets={buckets}
              scenarios={scenarios}
              onSaveScenario={handleSaveScenario}
              onDeleteScenario={handleDeleteScenario}
              currency={activeCurrency}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
        )}

        {/* VIEW 5: TRANSACTION LEDGER */}
        {activeTab === 'transactions' && (
          <div className="animate-in fade-in duration-150">
            <TransactionList
              transactions={transactions}
              buckets={buckets}
              onSaveTransaction={handleSaveTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              currency={activeCurrency}
              isPrivacyMode={isPrivacyMode}
            />
          </div>
        )}
      </main>

      {/* Quick Add Transaction Modal */}
      <TransactionModal
        isOpen={isQuickTxOpen}
        onClose={() => setIsQuickTxOpen(false)}
        onSave={handleSaveTransaction}
        buckets={buckets}
        currency={activeCurrency}
      />
    </div>
  );
}
