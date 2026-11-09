import React from 'react';
import { EquityBucket, Transaction, UserProfile, CurrencyCode } from '@/types/finance';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { BrutalBadge } from '@/components/ui/BrutalBadge';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { Shield, AlertTriangle, ShieldCheck, Flame, Compass, Zap } from 'lucide-react';

interface SurvivalRunwayGaugeProps {
  buckets: EquityBucket[];
  transactions: Transaction[];
  profile: UserProfile;
  currency?: CurrencyCode;
  isPrivacyMode?: boolean;
}
export function SurvivalRunwayGauge({
  buckets,
  transactions,
  profile,
  currency = 'IDR',
  isPrivacyMode = false,
}: SurvivalRunwayGaugeProps) {
  // 1. Calculate liquid reserves
  const liquidReserves = buckets
    .filter((b) => b.is_liquid)
    .reduce((sum, b) => sum + b.current_balance, 0);

  // 2. Trailing 90-day expense burn (essential needs vs total)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recentExpenses = transactions.filter(
    (t) => t.type === 'expense' && new Date(t.date) >= ninetyDaysAgo
  );

  const totalExpense90d = recentExpenses.reduce((s, t) => s + t.amount, 0);
  const essentialExpense90d = recentExpenses
    .filter((t) => t.need_vs_want === 'need')
    .reduce((s, t) => s + t.amount, 0);

  // Monthly averages (normalized by 3 months)
  // If either liquid reserves or expenses are zero, we lack real telemetry for runway calculation
  if (totalExpense90d === 0 || liquidReserves === 0) {
    return (
      <BrutalCard
        title="Zero-Income Survival Runway Architecture"
        badge="Insufficient Data"
        badgeColor="orange"
        headerColor="bg-[#FFE81D]"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white border-2 border-black font-mono shadow-[2px_2px_0px_0px_#000000]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF8A3D] border-2 border-black flex items-center justify-center text-black shrink-0 shadow-[2px_2px_0px_0px_#000000]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-black">
                Insufficient Real Telemetry For Runway Calculation
              </div>
              <p className="text-[11px] text-gray-600 mt-0.5">
                {liquidReserves === 0 && totalExpense90d === 0
                  ? 'No liquid vaults or expense history found. Add liquid cash buckets and log monthly expenses to compute your runway.'
                  : liquidReserves === 0
                  ? 'Liquid cash reserves are currently $0.00. Assign a liquid vault to track survival buffer.'
                  : 'No expenses logged in the trailing 90 days. Record expense transactions to determine monthly burn.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-[11px] font-bold bg-[#FFFBEB] border border-black px-2 py-1">
              Liquid: {formatCurrency(liquidReserves, currency, isPrivacyMode)}
            </div>
            <div className="text-[11px] font-bold bg-[#FFFBEB] border border-black px-2 py-1">
              Burn: {formatCurrency(totalExpense90d, currency, isPrivacyMode)}
            </div>
          </div>
        </div>
      </BrutalCard>
    );
  }

  const averageMonthlyTotalBurn = totalExpense90d / 3;
  const averageMonthlyEssentialBurn = essentialExpense90d > 0 ? essentialExpense90d / 3 : averageMonthlyTotalBurn;
  const runwayMonthsStrict = liquidReserves / averageMonthlyTotalBurn;
  const runwayMonthsEssential = liquidReserves / averageMonthlyEssentialBurn;
  // Emergency Target Target
  const targetMonths = profile.emergency_fund_target_months || 6;
  const targetEmergencyFund = averageMonthlyTotalBurn * targetMonths;
  const emergencyBucket = buckets.find((b) => b.category === 'emergency_fund');
  const currentEmergencyFund = emergencyBucket ? emergencyBucket.current_balance : liquidReserves;
  const targetProgressPct = targetEmergencyFund > 0
    ? (currentEmergencyFund / targetEmergencyFund) * 100
    : 100;

  // Tier Status
  let tierStatus: {
    label: string;
    badgeColor: 'pink' | 'orange' | 'green' | 'purple';
    color: string;
    description: string;
  } = {
    label: 'CRITICAL RUNWAY',
    badgeColor: 'pink',
    color: '#EF4444',
    description: 'Reserves under 3 months. Any sudden income shock risks capital depletion.',
  };

  if (runwayMonthsStrict >= 12) {
    tierStatus = {
      label: 'INVINCIBLE FORTRESS',
      badgeColor: 'purple',
      color: '#C084FC',
      description: 'Over 12 months of liquid survival buffer. Total geopolitical & career insulation.',
    };
  } else if (runwayMonthsStrict >= 6) {
    tierStatus = {
      label: 'HEALTHY BUFFER',
      badgeColor: 'green',
      color: '#46E88E',
      description: 'Meets institutional 6-month safety benchmark. High stability.',
    };
  } else if (runwayMonthsStrict >= 3) {
    tierStatus = {
      label: 'VULNERABLE / BUILDING',
      badgeColor: 'orange',
      color: '#FF8A3D',
      description: 'Between 3 to 6 months of runway. Prioritize boosting liquid shield allocation.',
    };
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Primary Survival Runway Gauge */}
      <BrutalCard
        title="Survival Runway Architecture"
        badge={tierStatus.label}
        badgeColor={tierStatus.badgeColor}
        headerColor="bg-[#FFFBEB]"
        className="lg:col-span-2"
      >
        <div className="flex flex-col gap-4 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
            <div>
              <span className="text-xs font-bold text-gray-600 uppercase">
                Zero-Income Survival Duration
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-4xl font-black text-black">
                  {runwayMonthsStrict.toFixed(1)}
                </span>
                <span className="text-sm font-bold text-gray-700 uppercase">Months (Total Burn)</span>
              </div>
            </div>

            <div className="bg-[#FFFBEB] border-2 border-black p-2.5 shadow-[2px_2px_0px_0px_#000000]">
              <div className="text-[10px] font-bold text-gray-600 uppercase">
                Survival Baseline (Needs Only)
              </div>
              <div className="text-xl font-black text-black">
                {runwayMonthsEssential.toFixed(1)} Months
              </div>
            </div>
          </div>

          {/* Visual Runway Bar (Scale to 18 months) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span>0 Mo</span>
              <span className="text-orange-600">3 Mo (Min)</span>
              <span className="text-green-600">6 Mo (Target)</span>
              <span className="text-purple-600">12 Mo (Fortress)</span>
              <span>18+ Mo</span>
            </div>

            <div className="w-full h-7 border-2 border-black bg-gray-200 overflow-hidden relative shadow-[2px_2px_0px_0px_#000000]">
              {/* Target Marker at 6 months */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-black z-10"
                style={{ left: `${(6 / 18) * 100}%` }}
                title="6-Month Target Threshold"
              />
              <div
                className="h-full border-r-2 border-black transition-all flex items-center justify-end pr-2 text-xs font-black text-black"
                style={{
                  width: `${Math.min(100, (runwayMonthsStrict / 18) * 100)}%`,
                  backgroundColor: tierStatus.color,
                }}
              >
                {runwayMonthsStrict >= 2 ? `${runwayMonthsStrict.toFixed(1)}M` : ''}
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-700 bg-yellow-50 p-2.5 border border-black/40">
            <strong>Runway Assessment:</strong> {tierStatus.description} You possess{' '}
            <strong>{formatCurrency(liquidReserves, currency, isPrivacyMode)}</strong> in liquid reserves against a baseline monthly burn of{' '}
            <strong>{formatCurrency(averageMonthlyTotalBurn, currency, isPrivacyMode)}</strong>.
          </p>
        </div>
      </BrutalCard>

      {/* Emergency Fund Target Tracker */}
      <BrutalCard
        title="Emergency Shield Goal"
        badge={`${targetProgressPct.toFixed(0)}%`}
        badgeColor={targetProgressPct >= 100 ? 'green' : 'yellow'}
        headerColor="bg-[#FFE81D]"
      >
        <div className="flex flex-col gap-3 font-mono">
          <div>
            <div className="text-[10px] font-bold text-gray-600 uppercase">
              {targetMonths}-Month Safety Target
            </div>
            <div className="text-2xl font-black text-black">
              {formatCurrency(targetEmergencyFund, currency, isPrivacyMode)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Currently funded: <strong>{formatCurrency(currentEmergencyFund, currency, isPrivacyMode)}</strong>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 h-4 border-2 border-black overflow-hidden shadow-[2px_2px_0px_0px_#000000]">
            <div
              className={`h-full border-r-2 border-black transition-all ${
                targetProgressPct >= 100 ? 'bg-[#46E88E]' : 'bg-[#FFDE59]'
              }`}
              style={{ width: `${Math.min(100, targetProgressPct)}%` }}
            />
          </div>

          <div className="p-2 border border-black bg-white text-xs">
            {targetProgressPct >= 100 ? (
              <span className="text-green-700 font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Target fully satisfied (+{formatCurrency(currentEmergencyFund - targetEmergencyFund, currency)} buffer)
              </span>
            ) : (
              <span className="text-orange-700 font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Need {formatCurrency(targetEmergencyFund - currentEmergencyFund, currency)} more to reach full target
              </span>
            )}
          </div>
        </div>
      </BrutalCard>
    </div>
  );
}
