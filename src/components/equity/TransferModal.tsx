import React, { useState } from 'react';
import { EquityBucket } from '@/types/finance';
import { BrutalModal } from '@/components/ui/BrutalModal';
import { BrutalInput, BrutalSelect } from '@/components/ui/BrutalInput';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { formatCurrency } from '@/lib/formatters';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  buckets: EquityBucket[];
  onTransfer: (sourceBucketId: string, targetBucketId: string, amount: number) => void;
}

export function TransferModal({
  isOpen,
  onClose,
  buckets,
  onTransfer,
}: TransferModalProps) {
  const [sourceId, setSourceId] = useState(buckets[0]?.id || '');
  const [targetId, setTargetId] = useState(buckets[1]?.id || '');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const sourceBucket = buckets.find((b) => b.id === sourceId);
  const targetBucket = buckets.find((b) => b.id === targetId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !targetId) {
      setError('Both source and target buckets must be selected');
      return;
    }
    if (sourceId === targetId) {
      setError('Source and destination buckets cannot be the same');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Transfer amount must be greater than $0.00');
      return;
    }
    if (sourceBucket && numAmount > sourceBucket.current_balance) {
      setError(`Insufficient balance in ${sourceBucket.name}. Max: ${formatCurrency(sourceBucket.current_balance)}`);
      return;
    }

    onTransfer(sourceId, targetId, numAmount);
    setAmount('');
    setError('');
    onClose();
  };

  const bucketOptions = buckets.map((b) => ({
    label: `${b.name} (${formatCurrency(b.current_balance)})`,
    value: b.id,
  }));

  return (
    <BrutalModal isOpen={isOpen} onClose={onClose} title="Rebalance / Transfer Capital">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="bg-[#EF4444] text-white p-2.5 font-mono text-xs font-bold border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
            ⚠️ {error}
          </div>
        )}

        <BrutalSelect
          label="From Source Bucket"
          options={bucketOptions}
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
        />

        <div className="text-center font-mono font-black text-sm text-black">
          ⬇️ REALLOCATE CAPITAL ⬇️
        </div>

        <BrutalSelect
          label="To Destination Bucket"
          options={bucketOptions}
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        />

        <BrutalInput
          label="Capital Amount to Move"
          prefix="$"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          helperText={sourceBucket ? `Available in source: ${formatCurrency(sourceBucket.current_balance)}` : undefined}
          required
        />

        <div className="flex justify-end gap-2 pt-2 border-t-2 border-black">
          <BrutalButton type="button" variant="white" size="sm" onClick={onClose}>
            Cancel
          </BrutalButton>
          <BrutalButton type="submit" variant="yellow" size="sm">
            Execute Transfer
          </BrutalButton>
        </div>
      </form>
    </BrutalModal>
  );
}
