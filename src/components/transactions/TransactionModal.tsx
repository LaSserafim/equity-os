import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, NeedVsWant, EquityBucket, CurrencyCode } from '@/types/finance';
import { generateUUID } from '@/lib/uuid';
import { BrutalModal } from '@/components/ui/BrutalModal';
import { BrutalInput, BrutalSelect } from '@/components/ui/BrutalInput';
import { BrutalButton } from '@/components/ui/BrutalButton';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Transaction) => void;
  buckets: EquityBucket[];
  initialTransaction?: Transaction | null;
  currency?: CurrencyCode;
}

const EXPENSE_CATEGORIES = [
  'Housing & Utilities',
  'Groceries & Food',
  'Dining & Entertainment',
  'Healthcare & Fitness',
  'Transport & Fuel',
  'Software & Subscriptions',
  'Shopping & Hardware',
  'Travel & Vacation',
  'Investment Allocation',
  'Other Expense',
];

const INCOME_CATEGORIES = [
  'Primary Salary / Retainer',
  'Consulting & Freelance',
  'Investment Yield & Dividends',
  'Crypto Staking / Trading',
  'Asset Sale / Real Estate',
  'Tax Refund / Bonus',
  'Other Inflow',
];

export function TransactionModal({
  isOpen,
  onClose,
  onSave,
  buckets,
  initialTransaction,
  currency = 'IDR',
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [bucketId, setBucketId] = useState<string>(buckets[0]?.id || '');
  const [needVsWant, setNeedVsWant] = useState<NeedVsWant>('need');
  const [isRecurring, setIsRecurring] = useState(false);
  const [note, setNote] = useState('');
  const [txCurrency, setTxCurrency] = useState<CurrencyCode>(initialTransaction?.currency || currency);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setCategory(initialTransaction.category);
      setAmount(String(initialTransaction.amount));
      setDate(initialTransaction.date);
      setBucketId(initialTransaction.bucket_id || '');
      setNeedVsWant(initialTransaction.need_vs_want);
      setIsRecurring(initialTransaction.is_recurring);
      setNote(initialTransaction.note || '');
      setTxCurrency(initialTransaction.currency || currency);
    } else {
      setType('expense');
      setCategory(EXPENSE_CATEGORIES[0]);
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setBucketId(buckets[0]?.id || '');
      setNeedVsWant('need');
      setIsRecurring(false);
      setNote('');
      setTxCurrency(currency);
    }
    setError('');
  }, [initialTransaction, isOpen, buckets]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be a positive number');
      return;
    }
    if (!category.trim()) {
      setError('Please select or enter a category');
      return;
    }

    onSave({
      id: initialTransaction ? initialTransaction.id : generateUUID(),
      type,
      category,
      amount: numAmount,
      currency: txCurrency,
      date,
      bucket_id: bucketId || null,
      need_vs_want: needVsWant,
      is_recurring: isRecurring,
      note: note.trim(),
    });
    onClose();
  };

  const currentCategoryList = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <BrutalModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTransaction ? 'Edit Transaction' : 'Record Transaction'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="bg-[#EF4444] text-white p-2.5 font-mono text-xs font-bold border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
            ⚠️ {error}
          </div>
        )}

        {/* Type Toggle: Inflow vs Outflow */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black uppercase tracking-wider font-mono text-black">
            Cash Flow Direction
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategory(EXPENSE_CATEGORIES[0]);
              }}
              className={`flex-1 py-2 text-xs font-mono font-bold uppercase border-2 border-black transition-all ${
                type === 'expense'
                  ? 'bg-[#FF5E7E] text-white shadow-[3px_3px_0px_0px_#000000]'
                  : 'bg-white opacity-70 hover:opacity-100'
              }`}
            >
              💸 Outflow (Expense)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory(INCOME_CATEGORIES[0]);
              }}
              className={`flex-1 py-2 text-xs font-mono font-bold uppercase border-2 border-black transition-all ${
                type === 'income'
                  ? 'bg-[#46E88E] text-black shadow-[3px_3px_0px_0px_#000000]'
                  : 'bg-white opacity-70 hover:opacity-100'
              }`}
            >
              💰 Inflow (Income)
            </button>
          </div>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <BrutalSelect
              label="Currency"
              value={txCurrency}
              onChange={(e) => setTxCurrency(e.target.value as CurrencyCode)}
              options={[
                { label: '🇮🇩 IDR (Rp)', value: 'IDR' },
                { label: '🇺🇸 USD ($)', value: 'USD' },
              ]}
            />
          </div>
          <div className="sm:col-span-1">
            <BrutalInput
              label={`Amount (${txCurrency === 'IDR' ? 'Rp' : '$'})`}
              prefix={txCurrency === 'IDR' ? 'Rp' : '$'}
              type="number"
              step={txCurrency === 'IDR' ? '1' : '0.01'}
              placeholder={txCurrency === 'IDR' ? '100000' : '0.00'}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="sm:col-span-1">
            <BrutalInput
              label="Date Logged"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Category Picker & Custom input */}
        <div className="flex flex-col gap-1.5">
          <BrutalSelect
            label="Standard Category"
            options={currentCategoryList.map((c) => ({ label: c, value: c }))}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        {/* Classification: Need vs Want vs Investment */}
        {type === 'expense' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase tracking-wider font-mono text-black">
              Survival Priority (Institutional Runway Impact)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setNeedVsWant('need')}
                className={`py-1.5 text-xs font-mono font-bold uppercase border-2 border-black transition-all ${
                  needVsWant === 'need'
                    ? 'bg-[#FFDE59] text-black shadow-[2px_2px_0px_0px_#000000]'
                    : 'bg-gray-100 opacity-60'
                }`}
              >
                Essential (Need)
              </button>
              <button
                type="button"
                onClick={() => setNeedVsWant('want')}
                className={`py-1.5 text-xs font-mono font-bold uppercase border-2 border-black transition-all ${
                  needVsWant === 'want'
                    ? 'bg-[#FF8A3D] text-white shadow-[2px_2px_0px_0px_#000000]'
                    : 'bg-gray-100 opacity-60'
                }`}
              >
                Discretionary (Want)
              </button>
              <button
                type="button"
                onClick={() => setNeedVsWant('investment')}
                className={`py-1.5 text-xs font-mono font-bold uppercase border-2 border-black transition-all ${
                  needVsWant === 'investment'
                    ? 'bg-[#4D96FF] text-white shadow-[2px_2px_0px_0px_#000000]'
                    : 'bg-gray-100 opacity-60'
                }`}
              >
                Capital Invest
              </button>
            </div>
          </div>
        )}

        {/* Bucket Assignment */}
        <BrutalSelect
          label="Impacted Equity Bucket"
          options={[
            { label: 'None / Unallocated General', value: '' },
            ...buckets.map((b) => ({ label: `${b.name} ($${b.current_balance})`, value: b.id })),
          ]}
          value={bucketId}
          onChange={(e) => setBucketId(e.target.value)}
          helperText="Adjusts this bucket's balance automatically"
        />

        {/* Recurring Switch & Note */}
        <div className="flex items-center gap-2 my-1">
          <input
            type="checkbox"
            id="isRecurring"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="w-4 h-4 border-2 border-black accent-black cursor-pointer"
          />
          <label htmlFor="isRecurring" className="text-xs font-mono font-bold uppercase text-black cursor-pointer">
            🔄 Recurring item (Monthly subscription / Fixed salary)
          </label>
        </div>

        <BrutalInput
          label="Optional Note / Reference"
          placeholder="e.g. AWS monthly bill, quarterly dividend payout"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2 border-t-2 border-black">
          <BrutalButton type="button" variant="white" size="sm" onClick={onClose}>
            Cancel
          </BrutalButton>
          <BrutalButton
            type="submit"
            variant={type === 'income' ? 'green' : 'pink'}
            size="sm"
          >
            {initialTransaction ? 'Save Changes' : 'Record Transaction'}
          </BrutalButton>
        </div>
      </form>
    </BrutalModal>
  );
}
