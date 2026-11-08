import React, { useState, useEffect } from 'react';
import { EquityBucket, BucketCategory, CurrencyCode } from '@/types/finance';
import { generateUUID } from '@/lib/uuid';
import { BrutalModal } from '@/components/ui/BrutalModal';
import { BrutalInput, BrutalSelect } from '@/components/ui/BrutalInput';
import { BrutalButton } from '@/components/ui/BrutalButton';

interface BucketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bucket: EquityBucket) => void;
  initialBucket?: EquityBucket | null;
  currency?: CurrencyCode;
}
const CATEGORY_OPTIONS: { label: string; value: BucketCategory }[] = [
  { label: 'Liquid Cash / Operating', value: 'liquid_cash' },
  { label: 'Emergency Fund (Shield)', value: 'emergency_fund' },
  { label: 'Growth Equities & Stocks', value: 'equities' },
  { label: 'High-Alpha Crypto & BTC', value: 'crypto' },
  { label: 'Real Estate / Land', value: 'real_estate' },
  { label: 'Retirement & Long-term 401k', value: 'retirement' },
  { label: 'Other Venture / Alternative', value: 'other' },
];

const COLOR_PRESETS = [
  { name: 'Yellow', hex: '#FFDE59' },
  { name: 'Green', hex: '#46E88E' },
  { name: 'Blue', hex: '#4D96FF' },
  { name: 'Pink', hex: '#FF5E7E' },
  { name: 'Orange', hex: '#FF8A3D' },
  { name: 'Purple', hex: '#C084FC' },
];

export function BucketModal({
  isOpen,
  onClose,
  onSave,
  initialBucket,
  currency = 'IDR',
}: BucketModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<BucketCategory>('liquid_cash');
  const [balance, setBalance] = useState('');
  const [targetPct, setTargetPct] = useState('20');
  const [isLiquid, setIsLiquid] = useState(true);
  const [colorHex, setColorHex] = useState('#FFDE59');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialBucket) {
      setName(initialBucket.name);
      setCategory(initialBucket.category);
      setBalance(String(initialBucket.current_balance));
      setTargetPct(String(initialBucket.target_allocation_pct));
      setIsLiquid(initialBucket.is_liquid);
      setColorHex(initialBucket.color_hex);
      setNotes(initialBucket.notes || '');
    } else {
      setName('');
      setCategory('liquid_cash');
      setBalance('0');
      setTargetPct('25');
      setIsLiquid(true);
      setColorHex('#FFDE59');
      setNotes('');
    }
    setError('');
  }, [initialBucket, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Bucket title is required');
      return;
    }
    const numBalance = parseFloat(balance);
    if (isNaN(numBalance) || numBalance < 0) {
      setError('Please enter a valid balance (>= 0)');
      return;
    }
    const numTarget = parseFloat(targetPct);
    if (isNaN(numTarget) || numTarget < 0 || numTarget > 100) {
      setError('Target percentage must be between 0% and 100%');
      return;
    }

    onSave({
      id: initialBucket ? initialBucket.id : generateUUID(),
      name: name.trim(),
      category,
      current_balance: numBalance,
      target_allocation_pct: numTarget,
      is_liquid: isLiquid,
      color_hex: colorHex,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <BrutalModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialBucket ? 'Edit Equity Bucket' : 'Create Assigned Equity Bucket'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="bg-[#EF4444] text-white p-2.5 font-mono text-xs font-bold border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
            ⚠️ {error}
          </div>
        )}

        <BrutalInput
          label="Bucket / Purpose Name"
          placeholder="e.g. S&P 500 Core Index, Emergency Vault"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <BrutalSelect
          label="Asset Category"
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(e) => {
            const val = e.target.value as BucketCategory;
            setCategory(val);
            if (val === 'liquid_cash' || val === 'emergency_fund') {
              setIsLiquid(true);
            }
          }}
        />

        <div className="grid grid-cols-2 gap-3">
          <BrutalInput
            label={`Current Balance (${currency === 'IDR' ? 'IDR / Rp' : 'USD / $'})`}
            prefix={currency === 'IDR' ? 'Rp' : '$'}
            type="number"
            step={currency === 'IDR' ? '1' : '0.01'}
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            required
          />
          <BrutalInput
            label="Target Allocation"
            type="number"
            min="0"
            max="100"
            step="1"
            value={targetPct}
            onChange={(e) => setTargetPct(e.target.value)}
            helperText="% of Total Portfolio"
          />
        </div>

        {/* Liquidity Toggle & Color Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-black uppercase tracking-wider font-mono text-black">
            Liquidity Classification
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsLiquid(true)}
              className={`flex-1 py-2 text-xs font-mono font-bold uppercase border-2 border-black transition-all ${
                isLiquid ? 'bg-[#46E88E] shadow-[3px_3px_0px_0px_#000000]' : 'bg-gray-100 opacity-60'
              }`}
            >
              🌊 Liquid (Immediate)
            </button>
            <button
              type="button"
              onClick={() => setIsLiquid(false)}
              className={`flex-1 py-2 text-xs font-mono font-bold uppercase border-2 border-black transition-all ${
                !isLiquid ? 'bg-[#FF5E7E] text-white shadow-[3px_3px_0px_0px_#000000]' : 'bg-gray-100 opacity-60'
              }`}
            >
              🔒 Locked / Invested
            </button>
          </div>
        </div>

        {/* Color Palette */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black uppercase tracking-wider font-mono text-black">
            Card Accent Color
          </label>
          <div className="flex gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setColorHex(c.hex)}
                className={`w-7 h-7 border-2 border-black rounded-none transition-all ${
                  colorHex === c.hex ? 'scale-110 shadow-[2px_2px_0px_0px_#000000] ring-2 ring-black' : 'opacity-80'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <BrutalInput
          label="Notes / Allocation Thesis"
          placeholder="e.g. Rebalance quarterly, target 4.8% APY yield."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2 border-t-2 border-black mt-2">
          <BrutalButton type="button" variant="white" size="sm" onClick={onClose}>
            Cancel
          </BrutalButton>
          <BrutalButton type="submit" variant="green" size="sm">
            {initialBucket ? 'Save Changes' : 'Create Bucket'}
          </BrutalButton>
        </div>
      </form>
    </BrutalModal>
  );
}
