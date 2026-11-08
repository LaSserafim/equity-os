import React, { useState, useMemo } from 'react';
import { Transaction, TimeWindow, TimeSeriesPoint, CategorySummary } from '@/types/finance';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { BrutalBadge } from '@/components/ui/BrutalBadge';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface AnalyticsSectionProps {
  transactions: Transaction[];
}

const TIMEFRAME_CONFIG: { label: string; value: TimeWindow; days: number }[] = [
  { label: '1W', value: '1W', days: 7 },
  { label: '1M', value: '1M', days: 30 },
  { label: '3M', value: '3M', days: 90 },
  { label: '6M', value: '6M', days: 180 },
  { label: '1Y', value: '1Y', days: 365 },
  { label: '2Y', value: '2Y', days: 730 },
];

const CATEGORY_COLORS = [
  '#FFDE59', // Yellow
  '#FF5E7E', // Pink
  '#46E88E', // Green
  '#4D96FF', // Blue
  '#FF8A3D', // Orange
  '#C084FC', // Purple
  '#38BDF8', // Sky
  '#F43F5E', // Rose
  '#A3E635', // Lime
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function BrutalChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white border-2 border-black p-3 shadow-[4px_4px_0px_0px_#000000] font-mono text-xs">
      <div className="font-black text-black border-b border-black pb-1 mb-2 uppercase">
        📅 {label}
      </div>
      <div className="flex flex-col gap-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 font-bold" style={{ color: item.color }}>
              <span className="w-2 h-2 border border-black inline-block" style={{ backgroundColor: item.color }} />
              {item.name}:
            </span>
            <span className="font-black text-black">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsSection({ transactions }: AnalyticsSectionProps) {
  const [selectedWindow, setSelectedWindow] = useState<TimeWindow>('6M');

  // Filter transactions by selected timeframe window
  const windowDays = TIMEFRAME_CONFIG.find((t) => t.value === selectedWindow)?.days || 180;

  const windowTransactions = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - windowDays);

    return transactions.filter((t) => new Date(t.date) >= cutoff);
  }, [transactions, windowDays]);

  // Aggregate time-series bins
  const timeSeriesData = useMemo(() => {
    const bins: Record<string, { label: string; date: string; income: number; expense: number }> = {};

    // Grouping strategy depending on timeframe window
    windowTransactions.forEach((tx) => {
      const d = new Date(tx.date);
      let key = '';
      let displayLabel = '';

      if (windowDays <= 14) {
        // Daily bin
        key = tx.date;
        displayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (windowDays <= 90) {
        // Weekly bin (format: YYYY-WW)
        const weekNum = Math.ceil(d.getDate() / 7);
        key = `${d.getFullYear()}-${d.getMonth() + 1}-W${weekNum}`;
        displayLabel = `${d.toLocaleDateString('en-US', { month: 'short' })} W${weekNum}`;
      } else {
        // Monthly bin (format: YYYY-MM)
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        displayLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }

      if (!bins[key]) {
        bins[key] = { label: displayLabel, date: tx.date, income: 0, expense: 0 };
      }

      if (tx.type === 'income') {
        bins[key].income += tx.amount;
      } else if (tx.type === 'expense') {
        bins[key].expense += tx.amount;
      }
    });

    // Convert to sorted array and compute cumulative savings
    let cumulative = 0;
    return Object.keys(bins)
      .sort()
      .map((k) => {
        const item = bins[k];
        const netFlow = item.income - item.expense;
        cumulative += netFlow;
        return {
          label: item.label,
          date: item.date,
          income: Math.round(item.income),
          expense: Math.round(item.expense),
          netFlow: Math.round(netFlow),
          cumulativeSavings: Math.round(cumulative),
        };
      });
  }, [windowTransactions, windowDays]);

  // Category breakdown for expenses
  const categoryBreakdown = useMemo(() => {
    const expenses = windowTransactions.filter((t) => t.type === 'expense');
    const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
    const catMap: Record<string, { total: number; count: number }> = {};

    expenses.forEach((t) => {
      if (!catMap[t.category]) catMap[t.category] = { total: 0, count: 0 };
      catMap[t.category].total += t.amount;
      catMap[t.category].count += 1;
    });

    return Object.entries(catMap)
      .map(([category, data], idx) => ({
        category,
        total: data.total,
        percentage: totalExp > 0 ? (data.total / totalExp) * 100 : 0,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        type: 'expense' as const,
        count: data.count,
      }))
      .sort((a, b) => b.total - a.total);
  }, [windowTransactions]);

  // Priority Ratio: Needs vs Wants vs Investment
  const priorityBreakdown = useMemo(() => {
    const expenses = windowTransactions.filter((t) => t.type === 'expense');
    const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
    const needs = expenses.filter((t) => t.need_vs_want === 'need').reduce((s, t) => s + t.amount, 0);
    const wants = expenses.filter((t) => t.need_vs_want === 'want').reduce((s, t) => s + t.amount, 0);
    const investments = expenses.filter((t) => t.need_vs_want === 'investment').reduce((s, t) => s + t.amount, 0);

    return {
      total: totalExp,
      needsPct: totalExp > 0 ? (needs / totalExp) * 100 : 0,
      wantsPct: totalExp > 0 ? (wants / totalExp) * 100 : 0,
      investmentsPct: totalExp > 0 ? (investments / totalExp) * 100 : 0,
      needsAmount: needs,
      wantsAmount: wants,
      investmentsAmount: investments,
    };
  }, [windowTransactions]);

  // Summary totals for window
  const totalWindowIncome = windowTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalWindowExpense = windowTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const windowSavingsRate = totalWindowIncome > 0
    ? ((totalWindowIncome - totalWindowExpense) / totalWindowIncome) * 100
    : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Timeframe Controls & Quick Telemetry Header */}
      <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_#000000] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-black" />
            <h3 className="font-mono font-black text-sm uppercase tracking-wider text-black">
              Historical Cash Flow Trajectory
            </h3>
          </div>
          <p className="text-xs font-mono text-gray-600 mt-0.5">
            Adaptive interval analysis spanning {windowDays} days
          </p>
        </div>

        {/* Timeframe Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {TIMEFRAME_CONFIG.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setSelectedWindow(tf.value)}
              className={`px-3 py-1 font-mono text-xs font-black uppercase border-2 border-black transition-all ${
                selectedWindow === tf.value
                  ? 'bg-[#FFE81D] text-black shadow-[3px_3px_0px_0px_#000000] -translate-x-0.5 -translate-y-0.5'
                  : 'bg-white hover:bg-gray-100 shadow-[1px_1px_0px_0px_#000000]'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Telemetry Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#46E88E] border-2 border-black p-3 shadow-[3px_3px_0px_0px_#000000] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono font-black uppercase text-black">Period Inflow</div>
            <div className="text-xl font-mono font-black text-black">+{formatCurrency(totalWindowIncome)}</div>
          </div>
          <ArrowUpRight className="w-6 h-6 text-black" />
        </div>

        <div className="bg-[#FF5E7E] text-white border-2 border-black p-3 shadow-[3px_3px_0px_0px_#000000] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono font-black uppercase text-white/90">Period Burn</div>
            <div className="text-xl font-mono font-black text-white">-{formatCurrency(totalWindowExpense)}</div>
          </div>
          <ArrowDownRight className="w-6 h-6 text-white" />
        </div>

        <div className="bg-[#59B4FF] text-white border-2 border-black p-3 shadow-[3px_3px_0px_0px_#000000] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono font-black uppercase text-white/90">Savings Rate</div>
            <div className="text-xl font-mono font-black text-white">{formatPercent(windowSavingsRate)}</div>
          </div>
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Main Adaptive Chart */}
      <BrutalCard
        title={`Adaptive Flow Breakdown (${selectedWindow})`}
        badge="Inflow vs Outflow"
        badgeColor="yellow"
        className="w-full"
      >
        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timeSeriesData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
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
                tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                tickLine={{ stroke: '#000000', strokeWidth: 1.5 }}
              />
              <Tooltip content={<BrutalChartTooltip />} />
              <Legend
                wrapperStyle={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  paddingTop: '10px',
                }}
              />
              <Bar
                dataKey="income"
                name="Income (+)"
                fill="#46E88E"
                stroke="#000000"
                strokeWidth={2}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="expense"
                name="Expense (-)"
                fill="#FF5E7E"
                stroke="#000000"
                strokeWidth={2}
                radius={[0, 0, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="netFlow"
                name="Net Flow"
                stroke="#000000"
                strokeWidth={3}
                dot={{ stroke: '#000000', strokeWidth: 2, r: 4, fill: '#FFE81D' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </BrutalCard>

      {/* Two-Column Deep Analytics: Category Distribution + 50/30/20 Rule Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Expense Breakdown */}
        <BrutalCard
          title="Expense Category Distribution"
          badge="Burn Audit"
          badgeColor="pink"
          headerColor="bg-[#FFE81D]"
        >
          <div className="flex flex-col gap-3">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs font-mono text-gray-500 py-6 text-center">
                No expense transactions recorded in this period window.
              </p>
            ) : (
              categoryBreakdown.slice(0, 6).map((cat) => (
                <div key={cat.category} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 border border-black inline-block flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-bold text-black line-clamp-1">{cat.category}</span>
                      <span className="text-gray-500 text-[10px]">({cat.count}x)</span>
                    </div>
                    <div className="font-black text-black">
                      {formatCurrency(cat.total)} ({cat.percentage.toFixed(1)}%)
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 h-2 border border-black overflow-hidden">
                    <div
                      className="h-full border-r border-black"
                      style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </BrutalCard>

        {/* Priority 50/30/20 Rule Analysis */}
        <BrutalCard
          title="50/30/20 Institutional Allocation Audit"
          badge="Discipline"
          badgeColor="purple"
          headerColor="bg-[#C084FC]"
        >
          <div className="flex flex-col gap-4 font-mono">
            <p className="text-xs text-gray-700">
              Benchmarking your expense burn against institutional discipline: <strong>50% Needs</strong>, <strong>30% Wants</strong>, and <strong>20% Capital Investment</strong>.
            </p>

            {/* Visual Multi-Segment Bar */}
            <div className="w-full h-8 border-2 border-black flex overflow-hidden shadow-[3px_3px_0px_0px_#000000]">
              <div
                className="bg-[#FFDE59] h-full flex items-center justify-center text-[10px] font-black border-r-2 border-black"
                style={{ width: `${Math.max(5, priorityBreakdown.needsPct)}%` }}
                title={`Needs: ${priorityBreakdown.needsPct.toFixed(1)}%`}
              >
                {priorityBreakdown.needsPct.toFixed(0)}%
              </div>
              <div
                className="bg-[#FF8A3D] text-white h-full flex items-center justify-center text-[10px] font-black border-r-2 border-black"
                style={{ width: `${Math.max(5, priorityBreakdown.wantsPct)}%` }}
                title={`Wants: ${priorityBreakdown.wantsPct.toFixed(1)}%`}
              >
                {priorityBreakdown.wantsPct.toFixed(0)}%
              </div>
              <div
                className="bg-[#4D96FF] text-white h-full flex items-center justify-center text-[10px] font-black"
                style={{ width: `${Math.max(5, priorityBreakdown.investmentsPct)}%` }}
                title={`Investments: ${priorityBreakdown.investmentsPct.toFixed(1)}%`}
              >
                {priorityBreakdown.investmentsPct.toFixed(0)}%
              </div>
            </div>

            {/* Breakdown Legend and Amounts */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 border border-black bg-[#FFFBEB]">
                <div className="text-[10px] font-bold text-gray-600 uppercase">Needs (Target 50%)</div>
                <div className="text-sm font-black mt-0.5">{priorityBreakdown.needsPct.toFixed(1)}%</div>
                <div className="text-[10px] text-gray-500">{formatCurrency(priorityBreakdown.needsAmount)}</div>
              </div>
              <div className="p-2 border border-black bg-[#FFFBEB]">
                <div className="text-[10px] font-bold text-gray-600 uppercase">Wants (Target 30%)</div>
                <div className="text-sm font-black mt-0.5">{priorityBreakdown.wantsPct.toFixed(1)}%</div>
                <div className="text-[10px] text-gray-500">{formatCurrency(priorityBreakdown.wantsAmount)}</div>
              </div>
              <div className="p-2 border border-black bg-[#FFFBEB]">
                <div className="text-[10px] font-bold text-gray-600 uppercase">Invest (Target 20%)</div>
                <div className="text-sm font-black mt-0.5">{priorityBreakdown.investmentsPct.toFixed(1)}%</div>
                <div className="text-[10px] text-gray-500">{formatCurrency(priorityBreakdown.investmentsAmount)}</div>
              </div>
            </div>
          </div>
        </BrutalCard>
      </div>
    </div>
  );
}
