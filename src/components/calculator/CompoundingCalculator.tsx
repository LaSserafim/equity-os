import React, { useState, useMemo } from 'react';
import {
  EquityBucket,
  CompoundingScenario,
  CompoundingFrequency,
  ContributionFrequency,
  CurrencyCode,
} from '@/types/finance';
import { generateUUID } from '@/lib/uuid';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { BrutalBadge } from '@/components/ui/BrutalBadge';
import { BrutalInput, BrutalSelect } from '@/components/ui/BrutalInput';
import { formatCurrency, formatPercent, formatCompactCurrency } from '@/lib/formatters';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  Sliders,
  BookmarkCheck,
  RotateCcw,
  Sparkles,
  Layers,
  Percent,
} from 'lucide-react';

interface CompoundingCalculatorProps {
  buckets: EquityBucket[];
  scenarios: CompoundingScenario[];
  onSaveScenario: (scenario: CompoundingScenario) => void;
  onDeleteScenario: (scenarioId: string) => void;
  currency?: CurrencyCode;
  isPrivacyMode?: boolean;
}

export type RatePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

const FREQUENCY_MAP: Record<CompoundingFrequency, { label: string; periodsPerYear: number }> = {
  daily: { label: 'Daily (365x / yr)', periodsPerYear: 365 },
  weekly: { label: 'Weekly (52x / yr)', periodsPerYear: 52 },
  monthly: { label: 'Monthly (12x / yr)', periodsPerYear: 12 },
  quarterly: { label: 'Quarterly (4x / yr)', periodsPerYear: 4 },
  yearly: { label: 'Annually (1x / yr)', periodsPerYear: 1 },
};

const CONTRIBUTION_MAP: Record<ContributionFrequency, { label: string; timesPerYear: number }> = {
  daily: { label: 'Daily', timesPerYear: 365 },
  weekly: { label: 'Weekly', timesPerYear: 52 },
  monthly: { label: 'Monthly', timesPerYear: 12 },
  yearly: { label: 'Annually', timesPerYear: 1 },
};

export function CompoundingCalculator({
  buckets,
  scenarios,
  onSaveScenario,
  onDeleteScenario,
  currency = 'IDR',
  isPrivacyMode = false,
}: CompoundingCalculatorProps) {
  const totalNetWorth = buckets.reduce((s, b) => s + b.current_balance, 0);

  // Capital source: 'total' | bucketId | 'custom'
  const [capitalSource, setCapitalSource] = useState<string>('total');
  const [customPrincipal, setCustomPrincipal] = useState<string>(currency === 'IDR' ? '50000000' : '25000');
  const [ratePeriod, setRatePeriod] = useState<RatePeriod>('yearly');
  const [rateInput, setRateInput] = useState<string>('12.0');
  const [compFrequency, setCompFrequency] = useState<CompoundingFrequency>('yearly');
  const [contributionAmount, setContributionAmount] = useState<string>(currency === 'IDR' ? '2500000' : '1000');
  const [contribFrequency, setContribFrequency] = useState<ContributionFrequency>('monthly');
  const [horizonYears, setHorizonYears] = useState<number>(10);
  const [enableVolatility, setEnableVolatility] = useState<boolean>(true);
  const [volatilityPct, setVolatilityPct] = useState<string>('15');
  const [scenarioTitle, setScenarioTitle] = useState<string>('My Compounding Blueprint');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Determine starting principal based on capitalSource
  const activePrincipal = useMemo(() => {
    if (capitalSource === 'total') return totalNetWorth;
    if (capitalSource === 'custom') {
      const parsed = parseFloat(customPrincipal);
      return isNaN(parsed) ? 0 : parsed;
    }
    const bucket = buckets.find((b) => b.id === capitalSource);
    return bucket ? bucket.current_balance : 0;
  }, [capitalSource, totalNetWorth, customPrincipal, buckets]);

  // Load a saved scenario
  const handleLoadScenario = (sc: CompoundingScenario) => {
    setScenarioTitle(sc.title);
    setRatePeriod('yearly');
    setRateInput(String(sc.annual_rate_pct));
    setCompFrequency(sc.compounding_frequency);
    setContributionAmount(String(sc.contribution_amount));
    setContribFrequency(sc.contribution_frequency);
    setHorizonYears(sc.time_horizon_years);
    if (sc.bucket_id) {
      setCapitalSource(sc.bucket_id);
    } else {
      setCapitalSource('custom');
      setCustomPrincipal(String(sc.principal_amount));
    }
    if (sc.expected_volatility_pct) {
      setVolatilityPct(String(sc.expected_volatility_pct));
    }
  };

  const parsedRate = Math.max(0, parseFloat(rateInput) || 0) / 100;

  // Convert period rate to annualized nominal rate and effective APY
  const { nominalAnnualRate, annualizedAPY } = useMemo(() => {
    if (parsedRate <= 0) return { nominalAnnualRate: 0, annualizedAPY: 0 };
    if (ratePeriod === 'daily') {
      return {
        nominalAnnualRate: parsedRate * 365,
        annualizedAPY: (Math.pow(1 + parsedRate, 365) - 1) * 100,
      };
    }
    if (ratePeriod === 'weekly') {
      return {
        nominalAnnualRate: parsedRate * 52,
        annualizedAPY: (Math.pow(1 + parsedRate, 52) - 1) * 100,
      };
    }
    if (ratePeriod === 'monthly') {
      return {
        nominalAnnualRate: parsedRate * 12,
        annualizedAPY: (Math.pow(1 + parsedRate, 12) - 1) * 100,
      };
    }
    return {
      nominalAnnualRate: parsedRate,
      annualizedAPY: parsedRate * 100,
    };
  }, [parsedRate, ratePeriod]);

  const handleRatePeriodChange = (p: RatePeriod) => {
    setRatePeriod(p);
    if (p === 'daily') {
      setRateInput('0.5');
      setCompFrequency('daily');
    } else if (p === 'weekly') {
      setRateInput('2.0');
      setCompFrequency('weekly');
    } else if (p === 'monthly') {
      setRateInput('5.0');
      setCompFrequency('monthly');
    } else {
      setRateInput('12.0');
      setCompFrequency('yearly');
    }
  };

  // Perform discrete compounding calculation across each year
  const projectionResults = useMemo(() => {
    const P = activePrincipal;
    const r = nominalAnnualRate;
    const n = FREQUENCY_MAP[compFrequency].periodsPerYear;
    const PMT = parseFloat(contributionAmount) || 0;
    const k = CONTRIBUTION_MAP[contribFrequency].timesPerYear;
    const vol = (parseFloat(volatilityPct) || 15) / 100;
    const data: Array<{
      year: number;
      label: string;
      principal: number;
      totalContributed: number;
      expectedValue: number;
      totalInterest: number;
      bearishValue: number;
      bullishValue: number;
    }> = [];

    // Starting Year 0
    data.push({
      year: 0,
      label: 'Start',
      principal: Math.round(P),
      totalContributed: Math.round(P),
      expectedValue: Math.round(P),
      totalInterest: 0,
      bearishValue: Math.round(P),
      bullishValue: Math.round(P),
    });

    for (let t = 1; t <= horizonYears; t++) {
      // Future Value of Initial Principal
      const fvPrincipal = P * Math.pow(1 + r / n, n * t);

      // Future Value of Periodic Additions
      let fvContributions = 0;
      if (PMT > 0 && r > 0) {
        // Effective rate per contribution period: r_eff = (1 + r/n)^(n/k) - 1
        const rEff = Math.pow(1 + r / n, n / k) - 1;
        const totalPeriods = k * t;
        fvContributions = PMT * ((Math.pow(1 + rEff, totalPeriods) - 1) / rEff);
      } else if (PMT > 0) {
        fvContributions = PMT * k * t;
      }

      const totalValue = fvPrincipal + fvContributions;
      const totalInvested = P + PMT * k * t;
      const totalGain = Math.max(0, totalValue - totalInvested);

      // Volatility Drift Band (Log-normal distribution envelope for t years)
      const driftSd = vol * Math.sqrt(t);
      const bearMultiplier = Math.exp(-1.28 * driftSd); // 10th percentile
      const bullMultiplier = Math.exp(1.28 * driftSd); // 90th percentile

      data.push({
        year: t,
        label: `Yr ${t}`,
        principal: Math.round(P),
        totalContributed: Math.round(totalInvested),
        expectedValue: Math.round(totalValue),
        totalInterest: Math.round(totalGain),
        bearishValue: Math.round(Math.max(totalInvested * 0.7, totalValue * bearMultiplier)),
        bullishValue: Math.round(totalValue * bullMultiplier),
      });
    }

    return data;
  }, [
    activePrincipal,
    nominalAnnualRate,
    compFrequency,
    contributionAmount,
    contribFrequency,
    horizonYears,
    volatilityPct,
  ]);

  const finalYear = projectionResults[projectionResults.length - 1];
  const finalValue = finalYear ? finalYear.expectedValue : 0;
  const finalContributions = finalYear ? finalYear.totalContributed : 0;
  const finalProfit = finalYear ? finalYear.totalInterest : 0;
  const multipleOnCapital = finalContributions > 0 ? (finalValue / finalContributions) : 1;

  const handleSave = () => {
    onSaveScenario({
      id: generateUUID(),
      title: scenarioTitle.trim() || 'Custom Compounding Model',
      bucket_id: capitalSource !== 'total' && capitalSource !== 'custom' ? capitalSource : null,
      principal_amount: activePrincipal,
      annual_rate_pct: Math.round(annualizedAPY * 100) / 100,
      compounding_frequency: compFrequency,
      contribution_amount: parseFloat(contributionAmount) || 0,
      contribution_frequency: contribFrequency,
      time_horizon_years: horizonYears,
      expected_volatility_pct: parseFloat(volatilityPct) || 15,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner: Projected Wealth Milestone */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono">
        <div className="bg-[#FFE81D] border-[3px] border-black p-4 shadow-[5px_5px_0px_0px_#000000] md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="text-xs font-black uppercase text-black">
              Projected Capital ({horizonYears} Years)
            </div>
            <div className="text-3xl md:text-4xl font-black text-black mt-1">
              {formatCurrency(finalValue, currency, isPrivacyMode)}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs font-bold text-black bg-white/80 border border-black p-1.5">
            <span>ROI Multiple: <strong>{multipleOnCapital.toFixed(2)}x</strong></span>
            <span>•</span>
            <span>Total Gain: <strong>+{formatCurrency(finalProfit, currency, isPrivacyMode)}</strong></span>
          </div>
        </div>

        <div className="bg-white border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between">
          <div className="text-xs font-black uppercase text-gray-600">Total Deposits</div>
          <div className="text-2xl font-black text-black mt-1">
            {formatCurrency(finalContributions, currency, isPrivacyMode)}
          </div>
          <div className="text-[11px] text-gray-500 mt-2">
            Principal ({formatCurrency(activePrincipal, currency, isPrivacyMode)}) + Additions
          </div>
        </div>

        <div className="bg-[#46E88E] border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between">
          <div className="text-xs font-black uppercase text-black">Pure Compounding Yield</div>
          <div className="text-2xl font-black text-black mt-1">
            +{formatCurrency(finalProfit, currency, isPrivacyMode)}
          </div>
          <div className="text-[11px] font-bold text-black mt-2">
            {finalContributions > 0 ? `${((finalProfit / finalContributions) * 100).toFixed(0)}% return on cash` : '0%'}
          </div>
        </div>
      </div>

      {/* Main Interactive Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Parameter Controls (4 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <BrutalCard
            title="Capital & Compounding Mechanics"
            badge="Parameters"
            badgeColor="yellow"
            headerColor="bg-[#FFE81D]"
          >
            <div className="flex flex-col gap-4">
              {/* Capital Source Assignment */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black uppercase tracking-wider font-mono text-black flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Equity Principal Source
                </label>
                <select
                  value={capitalSource}
                  onChange={(e) => setCapitalSource(e.target.value)}
                  className="w-full bg-[#FFFBEB] border-2 border-black p-2 text-xs font-mono font-bold shadow-[2px_2px_0px_0px_#000000] focus:outline-none cursor-pointer"
                >
                  <option value="total">
                    Total Net Worth ({formatCurrency(totalNetWorth, currency, isPrivacyMode)})
                  </option>
                  <optgroup label="Assigned Specific Buckets">
                    {buckets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({formatCurrency(b.current_balance, currency, isPrivacyMode)})
                      </option>
                    ))}
                  </optgroup>
                  <option value="custom">Custom Starting Principal...</option>
                </select>
              </div>

              {capitalSource === 'custom' && (
                <BrutalInput
                  label="Custom Initial Starting Principal"
                  prefix={currency === 'IDR' ? 'Rp' : '$'}
                  type="number"
                  step="100"
                  value={customPrincipal}
                  onChange={(e) => setCustomPrincipal(e.target.value)}
                />
              )}

              {/* Gain Rate with Period Basis Toggle */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider font-mono text-black">
                    Return Basis & Target Gain
                  </label>
                  <div className="flex items-center border border-black bg-white shadow-[1px_1px_0px_0px_#000000] overflow-hidden">
                    {(['daily', 'weekly', 'monthly', 'yearly'] as RatePeriod[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleRatePeriodChange(p)}
                        className={`px-2 py-0.5 font-mono text-[10px] font-black uppercase transition-all cursor-pointer ${
                          ratePeriod === p
                            ? 'bg-[#FFE81D] text-black font-black'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {p === 'yearly' ? 'Annual' : p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <BrutalInput
                      label={`${ratePeriod === 'yearly' ? 'Annual' : ratePeriod.charAt(0).toUpperCase() + ratePeriod.slice(1)} Gain (%)`}
                      type="number"
                      step={ratePeriod === 'daily' ? '0.01' : ratePeriod === 'weekly' ? '0.05' : '0.1'}
                      min="0.01"
                      max="10000"
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      prefix="%"
                    />
                    <div className="text-[10px] font-mono font-bold text-gray-600 mt-1">
                      {ratePeriod === 'yearly'
                        ? `Equivalent: ~${((Math.pow(1 + parsedRate, 1 / 12) - 1) * 100).toFixed(2)}% / mo`
                        : `Annualized: +${formatPercent(annualizedAPY)} APY`}
                    </div>
                  </div>

                  <BrutalSelect
                    label="Compounding Schedule"
                    options={Object.entries(FREQUENCY_MAP).map(([key, item]) => ({
                      label: item.label,
                      value: key,
                    }))}
                    value={compFrequency}
                    onChange={(e) => setCompFrequency(e.target.value as CompoundingFrequency)}
                  />
                </div>
              </div>

              {/* Recurring Additions */}
              <div className="grid grid-cols-2 gap-3">
                <BrutalInput
                  label="Recurring Contribution"
                  prefix={currency === 'IDR' ? 'Rp' : '$'}
                  type="number"
                  step={currency === 'IDR' ? '100000' : '50'}
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                />
                <BrutalSelect
                  label="Deposit Schedule"
                  options={Object.entries(CONTRIBUTION_MAP).map(([key, item]) => ({
                    label: item.label,
                    value: key,
                  }))}
                  value={contribFrequency}
                  onChange={(e) => setContribFrequency(e.target.value as ContributionFrequency)}
                />
              </div>

              {/* Time Horizon Slider */}
              <div className="flex flex-col gap-1.5 font-mono">
                <div className="flex justify-between text-xs font-black">
                  <span>Investment Horizon:</span>
                  <span className="bg-black text-white px-2 py-0.5 border border-black">
                    {horizonYears} Years ({horizonYears * 12} Months)
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="35"
                  step="1"
                  value={horizonYears}
                  onChange={(e) => setHorizonYears(parseInt(e.target.value, 10))}
                  className="w-full accent-black cursor-pointer h-2 bg-gray-200 border-2 border-black"
                />
                <div className="flex justify-between text-[10px] text-gray-500 font-bold">
                  <span>1 Yr</span>
                  <span>10 Yrs</span>
                  <span>20 Yrs</span>
                  <span>35 Yrs</span>
                </div>
              </div>

              {/* Volatility Drift Band Toggle */}
              <div className="border-2 border-black p-3 bg-[#FFFDF8] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-black">
                    Market Volatility Bands
                  </span>
                  <input
                    type="checkbox"
                    checked={enableVolatility}
                    onChange={(e) => setEnableVolatility(e.target.checked)}
                    className="w-4 h-4 accent-black border-2 border-black cursor-pointer"
                  />
                </div>

                {enableVolatility && (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={volatilityPct}
                      onChange={(e) => setVolatilityPct(e.target.value)}
                      className="w-20 bg-white border border-black px-2 py-1 text-xs font-mono font-bold"
                    />
                    <span className="text-[11px] font-mono text-gray-600">
                      % Annual StDev (Calculates 10th% Bear & 90th% Bull envelopes)
                    </span>
                  </div>
                )}
              </div>

              {/* Save Scenario Bar */}
              <div className="flex flex-col gap-2 pt-2 border-t-2 border-black">
                <BrutalInput
                  label="Scenario Blueprint Label"
                  placeholder="e.g. S&P 500 15-Year FIRE Plan"
                  value={scenarioTitle}
                  onChange={(e) => setScenarioTitle(e.target.value)}
                />
                <BrutalButton
                  variant="yellow"
                  size="sm"
                  icon={<BookmarkCheck className="w-4 h-4" />}
                  onClick={handleSave}
                >
                  {savedSuccess ? 'Scenario Saved' : 'Save Scenario Blueprint'}
                </BrutalButton>
              </div>
            </div>
          </BrutalCard>

          {/* Saved Scenarios Quick Shelf */}
          {scenarios.length > 0 && (
            <BrutalCard
              title="Saved Compounding Models"
              badge={`${scenarios.length}`}
              badgeColor="purple"
            >
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                {scenarios.map((sc) => (
                  <div
                    key={sc.id}
                    className="p-2 border-2 border-black bg-[#FFFBEB] flex items-center justify-between font-mono text-xs hover:bg-yellow-100 transition-colors"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleLoadScenario(sc)}
                    >
                      <div className="font-black text-black line-clamp-1">{sc.title}</div>
                      <div className="text-[10px] text-gray-600">
                        {sc.annual_rate_pct}% / {sc.time_horizon_years} Yrs (${sc.principal_amount.toLocaleString()} + ${sc.contribution_amount}/mo)
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteScenario(sc.id)}
                      className="text-red-600 hover:text-black font-bold text-xs p-1 cursor-pointer"
                      title="Delete saved scenario"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </BrutalCard>
          )}
        </div>

        {/* Right Column: Compounding Growth Curve (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <BrutalCard
            title={`Compounding Trajectory (${horizonYears} Yrs @ ${rateInput}% ${ratePeriod === 'yearly' ? 'Annual' : ratePeriod.charAt(0).toUpperCase() + ratePeriod.slice(1)} / ${annualizedAPY >= 1000 ? (annualizedAPY / 1000).toFixed(1) + 'k' : annualizedAPY.toFixed(1)}% APY)`}
            badge="Trajectory"
            badgeColor="green"
            headerColor="bg-[#46E88E]"
          >
            <div className="h-96 w-full pt-2">
              {activePrincipal === 0 && (parseFloat(contributionAmount) || 0) === 0 ? (
                <div className="h-full border-2 border-dashed border-black/40 flex flex-col items-center justify-center font-mono text-center p-6 gap-2 bg-[#FFFBEB]">
                  <span className="text-xs font-black uppercase text-black">Insufficient Capital For Compounding Simulation</span>
                  <span className="text-[11px] text-gray-600 max-w-md">
                    Both principal and periodic contributions are $0. Select a funded equity vault or enter a custom starting amount (&gt; $0) to project future equity compounding.
                  </span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionResults} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    stroke="#000000"
                    tick={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold' }}
                    tickLine={{ stroke: '#000000', strokeWidth: 1.5 }}
                  />
                  <YAxis
                    stroke="#000000"
                    tick={{ fontFamily: 'monospace', fontSize: 11 }}
                    tickFormatter={(val) => formatCompactCurrency(val, currency, isPrivacyMode)}
                    tickLine={{ stroke: '#000000', strokeWidth: 1.5 }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="bg-white border-2 border-black p-3 shadow-[4px_4px_0px_0px_#000000] font-mono text-xs">
                          <div className="font-black text-black border-b border-black pb-1 mb-2">
                            {label}
                          </div>
                          {payload.map((p) => (
                            <div key={p.name} className="flex justify-between gap-4 py-0.5">
                              <span style={{ color: p.color }} className="font-bold">
                                {p.name}:
                              </span>
                              <span className="font-black text-black">
                                {formatCurrency(Number(p.value), currency, isPrivacyMode)}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      paddingTop: '10px',
                    }}
                  />

                  {/* Bullish Envelope */}
                  {enableVolatility && (
                    <Area
                      type="monotone"
                      dataKey="bullishValue"
                      name="Bullish (90th%)"
                      stroke="#86EFAC"
                      fill="#DCFCE7"
                      fillOpacity={0.4}
                      strokeDasharray="4 4"
                    />
                  )}

                  {/* Expected Median Curve */}
                  <Area
                    type="monotone"
                    dataKey="expectedValue"
                    name="Expected Value"
                    stroke="#000000"
                    strokeWidth={3}
                    fill="#46E88E"
                    fillOpacity={0.6}
                  />

                  {/* Total Deposits Line */}
                  <Area
                    type="monotone"
                    dataKey="totalContributed"
                    name="Total Contributed"
                    stroke="#59B4FF"
                    strokeWidth={2}
                    fill="#93C5FD"
                    fillOpacity={0.3}
                  />

                  {/* Bearish Envelope */}
                  {enableVolatility && (
                    <Area
                      type="monotone"
                      dataKey="bearishValue"
                      name="Bearish (10th%)"
                      stroke="#FCA5A5"
                      fill="#FEE2E2"
                      fillOpacity={0.3}
                      strokeDasharray="4 4"
                    />
                  )}
                </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </BrutalCard>

          {/* Year-by-Year Milestone Table Preview */}
          <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_#000000] p-4">
            <h4 className="font-mono font-black text-xs uppercase tracking-wider text-black border-b-2 border-black pb-2 mb-3">
              Annual Compounding Progression
            </h4>
            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="bg-[#FFFBEB] border-b border-black font-black">
                    <th className="p-2">Period</th>
                    <th className="p-2">Deposits</th>
                    <th className="p-2">Compounded Yield</th>
                    <th className="p-2 text-right">Portfolio Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/20">
                  {projectionResults.map((row) => (
                    <tr key={row.year} className="hover:bg-yellow-50">
                      <td className="p-2 font-bold">{row.label}</td>
                      <td className="p-2">{formatCurrency(row.totalContributed, currency, isPrivacyMode)}</td>
                      <td className="p-2 text-green-700 font-bold">+{formatCurrency(row.totalInterest, currency, isPrivacyMode)}</td>
                      <td className="p-2 text-right font-black">{formatCurrency(row.expectedValue, currency, isPrivacyMode)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
