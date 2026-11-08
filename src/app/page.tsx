'use client';

import React, { useState, useEffect } from 'react';
import { EquityBucket, Transaction, CompoundingScenario, UserProfile } from '@/types/finance';
import { FinanceStorage } from '@/lib/storage';
import { Navbar, ActiveTab } from '@/components/layout/Navbar';
import { SurvivalRunwayGauge } from '@/components/metrics/SurvivalRunwayGauge';
import { EquityBucketsSection } from '@/components/equity/EquityBucketsSection';
import { AnalyticsSection } from '@/components/analytics/AnalyticsSection';
import { CompoundingCalculator } from '@/components/calculator/CompoundingCalculator';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { BrutalBadge } from '@/components/ui/BrutalBadge';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Layers,
  TrendingUp,
  Sparkles,
  PieChart,
} from 'lucide-react';

export default function FinancialAssistantPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [buckets, setBuckets] = useState<EquityBucket[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [scenarios, setScenarios] = useState<CompoundingScenario[]>([]);
  const [profile, setProfile] = useState<UserProfile>(FinanceStorage.getProfile());
  const [isQuickTxOpen, setIsQuickTxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load initial data on client mount
  useEffect(() => {
    setBuckets(FinanceStorage.getBuckets());
    setTransactions(FinanceStorage.getTransactions());
    setScenarios(FinanceStorage.getScenarios());
    setProfile(FinanceStorage.getProfile());
    setMounted(true);
  }, []);

  // Handlers for Buckets
  const handleSaveBucket = (bucket: EquityBucket) => {
    const updated = FinanceStorage.saveBucket(bucket);
    setBuckets(updated);
  };

  const handleDeleteBucket = (bucketId: string) => {
    const updated = FinanceStorage.deleteBucket(bucketId);
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

    FinanceStorage.saveBucket(updatedSource);
    const finalList = FinanceStorage.saveBucket(updatedTarget);
    setBuckets(finalList);

    // Also record a ledger transaction for audit trail
    const transferTx: Transaction = {
      id: `tx-xfer-${Date.now()}`,
      bucket_id: targetId,
      type: 'transfer',
      category: 'Capital Rebalancing',
      amount,
      currency: 'USD',
      date: new Date().toISOString().split('T')[0],
      note: `Internal rebalance: ${sourceBucket.name} ➡️ ${targetBucket.name}`,
      is_recurring: false,
      need_vs_want: 'investment',
    };
    const res = FinanceStorage.saveTransaction(transferTx);
    setTransactions(res.transactions);
  };

  // Handlers for Transactions
  const handleSaveTransaction = (tx: Transaction) => {
    const { transactions: newTxList, buckets: newBucketList } = FinanceStorage.saveTransaction(tx);
    setTransactions(newTxList);
    setBuckets(newBucketList);
  };

  const handleDeleteTransaction = (txId: string) => {
    const { transactions: newTxList, buckets: newBucketList } = FinanceStorage.deleteTransaction(txId);
    setTransactions(newTxList);
    setBuckets(newBucketList);
  };

  // Handlers for Scenarios
  const handleSaveScenario = (scenario: CompoundingScenario) => {
    const updated = FinanceStorage.saveScenario(scenario);
    setScenarios(updated);
  };

  const handleDeleteScenario = (id: string) => {
    const updated = FinanceStorage.deleteScenario(id);
    setScenarios(updated);
  };

  // Export / Import / Reset
  const handleExportData = () => {
    const jsonStr = FinanceStorage.exportFullDataset();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-assistant-backup-${new Date().toISOString().split('T')[0]}.json`;
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
    FinanceStorage.resetToDefaults();
    setBuckets(FinanceStorage.getBuckets());
    setTransactions(FinanceStorage.getTransactions());
    setScenarios(FinanceStorage.getScenarios());
    setProfile(FinanceStorage.getProfile());
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center font-mono">
        <div className="border-[3px] border-black p-6 bg-white shadow-[6px_6px_0px_0px_#000000]">
          <h2 className="text-sm font-black uppercase">Bootstrapping Financial Engine...</h2>
        </div>
      </div>
    );
  }

  // Derived aggregates for Quick Overview
  const totalNetWorth = buckets.reduce((s, b) => s + b.current_balance, 0);
  const liquidReserves = buckets.filter((b) => b.is_liquid).reduce((s, b) => s + b.current_balance, 0);

  // Trailing 30 days inflow & outflow
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const last30dTx = transactions.filter((t) => new Date(t.date) >= thirtyDaysAgo);
  const last30dInflow = last30dTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const last30dOutflow = last30dTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savingsRate = last30dInflow > 0 ? ((last30dInflow - last30dOutflow) / last30dInflow) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF8]">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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
                  ACTIVE FINANCIAL TELEMETRY
                </span>
                <h2 className="text-xl md:text-2xl font-mono font-black uppercase text-black mt-1">
                  Welcome back, {profile.full_name || 'Alex Sterling'}
                </h2>
                <p className="text-xs font-mono font-bold text-black/80 mt-0.5">
                  Your capital architecture is currently tracking across {buckets.length} assigned equity vaults.
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
              <BrutalCard title="Total Equity" badge="Net Worth" badgeColor="yellow" headerColor="bg-[#FFFBEB]">
                <div className="text-2xl font-mono font-black text-black">
                  {formatCurrency(totalNetWorth)}
                </div>
                <div className="text-[11px] font-mono text-gray-600 mt-1">
                  Across {buckets.length} allocated vaults
                </div>
              </BrutalCard>

              <BrutalCard title="Liquid Cash" badge="Available" badgeColor="green" headerColor="bg-[#DCFCE7]">
                <div className="text-2xl font-mono font-black text-black">
                  {formatCurrency(liquidReserves)}
                </div>
                <div className="text-[11px] font-mono text-gray-600 mt-1">
                  {totalNetWorth > 0 ? `${((liquidReserves / totalNetWorth) * 100).toFixed(1)}% of total equity` : '0%'}
                </div>
              </BrutalCard>

              <BrutalCard title="30-Day Cash Inflow" badge="Revenue" badgeColor="blue" headerColor="bg-[#DBEAFE]">
                <div className="text-2xl font-mono font-black text-[#059669]">
                  +{formatCurrency(last30dInflow)}
                </div>
                <div className="text-[11px] font-mono text-gray-600 mt-1">
                  Salary, consulting, dividends
                </div>
              </BrutalCard>

              <BrutalCard title="30-Day Burn Rate" badge="Outflow" badgeColor="pink" headerColor="bg-[#FCE7F3]">
                <div className="text-2xl font-mono font-black text-[#DC2626]">
                  -{formatCurrency(last30dOutflow)}
                </div>
                <div className="text-[11px] font-mono text-gray-600 mt-1">
                  Savings Rate: <strong>{formatPercent(savingsRate)}</strong>
                </div>
              </BrutalCard>
            </div>

            {/* Survival Runway & Emergency Shield Gauge */}
            <SurvivalRunwayGauge
              buckets={buckets}
              transactions={transactions}
              profile={profile}
            />

            {/* Two-Column: Quick Buckets Mini-Grid + Recent 5 Transactions */}
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
                  {buckets.map((b) => {
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
                          <div className="font-black text-xs text-black">{formatCurrency(b.current_balance)}</div>
                          <div className="text-[10px] text-gray-600">{pct.toFixed(1)}%</div>
                        </div>
                      </div>
                    );
                  })}
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
                  {transactions.slice(0, 6).map((tx) => {
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
                              {tx.date} • {bucket ? bucket.name : 'General Inflow'}
                            </div>
                          </div>
                        </div>

                        <div className={`font-black text-sm ${isIncome ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                          {isIncome ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`}
                        </div>
                      </div>
                    );
                  })}
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
            />
          </div>
        )}

        {/* VIEW 3: ADAPTIVE HISTORICAL ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="animate-in fade-in duration-150">
            <AnalyticsSection transactions={transactions} />
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
            />
          </div>
        )}

        {/* VIEW 5: TRANSACTIONS LEDGER */}
        {activeTab === 'transactions' && (
          <div className="animate-in fade-in duration-150">
            <TransactionList
              transactions={transactions}
              buckets={buckets}
              onSaveTransaction={handleSaveTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </div>
        )}
      </main>

      {/* Global Quick Transaction Modal */}
      <TransactionModal
        isOpen={isQuickTxOpen}
        onClose={() => setIsQuickTxOpen(false)}
        onSave={handleSaveTransaction}
        buckets={buckets}
      />
    </div>
  );
}
