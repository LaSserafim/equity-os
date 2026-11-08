import React, { useState } from 'react';
import { EquityBucket, Transaction, CurrencyCode } from '@/types/finance';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { BrutalBadge } from '@/components/ui/BrutalBadge';
import { BucketModal } from './BucketModal';
import { TransferModal } from './TransferModal';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { Plus, ArrowLeftRight, Edit3, Trash2, ShieldAlert, Droplets, Lock, Layers } from 'lucide-react';

interface EquityBucketsSectionProps {
  buckets: EquityBucket[];
  onSaveBucket: (bucket: EquityBucket) => void;
  onDeleteBucket: (bucketId: string) => void;
  onTransferCapital: (sourceId: string, targetId: string, amount: number) => void;
  currency?: CurrencyCode;
}

export function EquityBucketsSection({
  buckets,
  onSaveBucket,
  onDeleteBucket,
  onTransferCapital,
  currency = 'IDR',
}: EquityBucketsSectionProps) {
  const [isBucketModalOpen, setIsBucketModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingBucket, setEditingBucket] = useState<EquityBucket | null>(null);

  const totalEquity = buckets.reduce((sum, b) => sum + b.current_balance, 0);
  const liquidEquity = buckets.filter(b => b.is_liquid).reduce((sum, b) => sum + b.current_balance, 0);
  const investedEquity = totalEquity - liquidEquity;

  const handleEdit = (bucket: EquityBucket) => {
    setEditingBucket(bucket);
    setIsBucketModalOpen(true);
  };

  const handleCreate = () => {
    setEditingBucket(null);
    setIsBucketModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner: Total Equity & Macro Allocation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BrutalCard
          title="Consolidated Net Worth"
          badge="Live"
          badgeColor="green"
          headerColor="bg-[#46E88E]"
          className="md:col-span-1"
        >
          <div className="flex flex-col gap-1">
            <span className="text-3xl md:text-4xl font-mono font-black tracking-tight text-black">
              {formatCurrency(totalEquity, currency)}
            </span>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-mono font-bold uppercase bg-black text-white px-2 py-0.5 border border-black">
                {buckets.length} Active Buckets
              </span>
            </div>
          </div>
        </BrutalCard>

        <BrutalCard
          title="Liquidity Architecture"
          badge="Allocation"
          badgeColor="blue"
          headerColor="bg-[#59B4FF]"
          className="md:col-span-2"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-[#46E88E] border border-black inline-block" />
                <span>Liquid Cash: {formatCurrency(liquidEquity, currency)} ({totalEquity > 0 ? formatPercent((liquidEquity / totalEquity) * 100) : '0%'})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-[#FF5E7E] border border-black inline-block" />
                <span>Invested / Illiquid: {formatCurrency(investedEquity, currency)} ({totalEquity > 0 ? formatPercent((investedEquity / totalEquity) * 100) : '0%'})</span>
              </div>
            </div>

            {/* Split Bar */}
            <div className="w-full h-6 border-2 border-black flex overflow-hidden shadow-[2px_2px_0px_0px_#000000]">
              <div
                className="bg-[#46E88E] h-full transition-all flex items-center justify-center text-[10px] font-mono font-black"
                style={{ width: `${totalEquity > 0 ? (liquidEquity / totalEquity) * 100 : 50}%` }}
              >
                LIQUID
              </div>
              <div
                className="bg-[#FF5E7E] h-full text-white transition-all flex items-center justify-center text-[10px] font-mono font-black"
                style={{ width: `${totalEquity > 0 ? (investedEquity / totalEquity) * 100 : 50}%` }}
              >
                INVESTED
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <BrutalButton
                variant="white"
                size="sm"
                icon={<ArrowLeftRight className="w-3.5 h-3.5" />}
                onClick={() => setIsTransferModalOpen(true)}
              >
                Rebalance Capital
              </BrutalButton>
              <BrutalButton
                variant="yellow"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleCreate}
              >
                New Bucket
              </BrutalButton>
            </div>
          </div>
        </BrutalCard>
      </div>

      {/* Grid of Equity Buckets or Empty State */}
      {buckets.length === 0 ? (
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_#000000] p-8 text-center flex flex-col items-center justify-center gap-3 font-mono">
          <div className="w-12 h-12 bg-[#FFE81D] border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_#000000]">
            <Layers className="w-6 h-6 text-black" />
          </div>
          <h3 className="text-sm font-black uppercase text-black">No Capital Vaults Assigned</h3>
          <p className="text-xs text-gray-600 max-w-md">
            You have not configured any asset buckets yet. Create your first bucket (e.g. Operating Checking, High-Yield Savings, S&P 500 Equities) to begin tracking real balances.
          </p>
          <BrutalButton variant="yellow" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>
            Create First Equity Vault
          </BrutalButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {buckets.map((bucket) => {
          const actualPct = totalEquity > 0 ? (bucket.current_balance / totalEquity) * 100 : 0;
          const targetPct = bucket.target_allocation_pct || 0;
          const delta = actualPct - targetPct;

          let rebalanceStatus: { text: string; color: 'green' | 'orange' | 'blue' } = {
            text: 'Balanced',
            color: 'green',
          };
          if (delta > 3) {
            rebalanceStatus = { text: `Overweight (+${delta.toFixed(1)}%)`, color: 'orange' };
          } else if (delta < -3) {
            rebalanceStatus = { text: `Underweight (${delta.toFixed(1)}%)`, color: 'blue' };
          }

          return (
            <div
              key={bucket.id}
              className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_#000000] p-4 flex flex-col justify-between relative group hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000000] transition-all"
            >
              {/* Card Color Strip */}
              <div
                className="absolute top-0 left-0 right-0 h-2 border-b-2 border-black"
                style={{ backgroundColor: bucket.color_hex }}
              />

              <div className="pt-2 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span className="text-[10px] font-mono font-black uppercase text-gray-500 tracking-wider">
                      {bucket.category.replace('_', ' ')}
                    </span>
                    <h4 className="font-mono font-black text-sm uppercase text-black line-clamp-1">
                      {bucket.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1">
                    {bucket.is_liquid ? (
                      <BrutalBadge color="green" size="sm" icon={<Droplets className="w-2.5 h-2.5" />}>
                        Liquid
                      </BrutalBadge>
                    ) : (
                      <BrutalBadge color="pink" size="sm" icon={<Lock className="w-2.5 h-2.5" />}>
                        Locked
                      </BrutalBadge>
                    )}
                  </div>
                </div>

                {/* Big Balance */}
                <div className="my-1">
                  <div className="text-2xl font-mono font-black text-black">
                    {formatCurrency(bucket.current_balance, currency)}
                  </div>
                  <div className="text-[11px] font-mono text-gray-600">
                    {actualPct.toFixed(1)}% of total net worth
                  </div>
                </div>

                {/* Target vs Actual Progress */}
                <div className="flex flex-col gap-1 my-1">
                  <div className="flex justify-between text-[10px] font-mono font-bold">
                    <span>Target: {targetPct}%</span>
                    <span className={`text-[10px] uppercase font-bold ${
                      rebalanceStatus.color === 'green' ? 'text-green-600' :
                      rebalanceStatus.color === 'orange' ? 'text-orange-600' : 'text-blue-600'
                    }`}>
                      {rebalanceStatus.text}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 border border-black overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.min(100, actualPct)}%`,
                        backgroundColor: bucket.color_hex,
                      }}
                    />
                  </div>
                </div>

                {bucket.notes && (
                  <p className="text-[11px] font-mono text-gray-600 line-clamp-2 italic bg-[#FFFBEB] p-1.5 border border-black/40">
                    "{bucket.notes}"
                  </p>
                )}
              </div>

              {/* Bottom Quick Actions */}
              <div className="flex items-center justify-between pt-3 border-t-2 border-black/20 mt-3">
                <span className="text-[10px] font-mono text-gray-500 uppercase">
                  Bucket #{bucket.id.slice(-4)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(bucket)}
                    className="p-1 border border-black bg-white hover:bg-[#FFE81D] shadow-[1px_1px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                    title="Edit Bucket"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete bucket "${bucket.name}"?`)) {
                        onDeleteBucket(bucket.id);
                      }
                    }}
                    className="p-1 border border-black bg-white hover:bg-[#FF5E7E] hover:text-white shadow-[1px_1px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                    title="Delete Bucket"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Modals */}
      <BucketModal
        isOpen={isBucketModalOpen}
        onClose={() => setIsBucketModalOpen(false)}
        onSave={onSaveBucket}
        initialBucket={editingBucket}
        currency={currency}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        buckets={buckets}
        onTransfer={onTransferCapital}
        currency={currency}
      />
    </div>
  );
}
