import React, { useState, useMemo } from 'react';
import { Transaction, EquityBucket, TransactionType, NeedVsWant } from '@/types/finance';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { BrutalBadge } from '@/components/ui/BrutalBadge';
import { BrutalInput, BrutalSelect } from '@/components/ui/BrutalInput';
import { TransactionModal } from './TransactionModal';
import { formatCurrency, formatDateLabel } from '@/lib/formatters';
import { Plus, Search, Filter, Download, Trash2, Edit2, ArrowDownRight, ArrowUpRight, Repeat } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  buckets: EquityBucket[];
  onSaveTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (txId: string) => void;
}

export function TransactionList({
  transactions,
  buckets,
  onSaveTransaction,
  onDeleteTransaction,
}: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [bucketFilter, setBucketFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (bucketFilter !== 'all' && tx.bucket_id !== bucketFilter) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesCategory = tx.category.toLowerCase().includes(query);
        const matchesNote = tx.note?.toLowerCase().includes(query) ?? false;
        if (!matchesCategory && !matchesNote) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, typeFilter, bucketFilter, searchTerm]);

  // Aggregate stats on filtered view
  const totalInflow = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalOutflow = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netDelta = totalInflow - totalOutflow;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingTx(null);
    setIsModalOpen(true);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Currency', 'Bucket', 'Priority', 'Recurring', 'Note'];
    const rows = filtered.map(t => {
      const bucket = buckets.find(b => b.id === t.bucket_id)?.name || 'Unassigned';
      return [
        t.date,
        t.type,
        `"${t.category}"`,
        t.amount.toFixed(2),
        t.currency,
        `"${bucket}"`,
        t.need_vs_want,
        t.is_recurring ? 'Yes' : 'No',
        `"${t.note || ''}"`,
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial-ledger-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search, Filters & Action Bar */}
      <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_#000000] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search category, note..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#FFFBEB] border-2 border-black pl-9 pr-3 py-1.5 text-xs font-mono shadow-[2px_2px_0px_0px_#000000] focus:outline-none focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as 'all' | TransactionType);
                setCurrentPage(1);
              }}
              className="bg-white border-2 border-black px-2 py-1.5 text-xs font-mono font-bold shadow-[2px_2px_0px_0px_#000000] focus:outline-none cursor-pointer"
            >
              <option value="all">All Flows</option>
              <option value="income">Income Only (+)</option>
              <option value="expense">Expense Only (-)</option>
            </select>

            <select
              value={bucketFilter}
              onChange={(e) => {
                setBucketFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white border-2 border-black px-2 py-1.5 text-xs font-mono font-bold shadow-[2px_2px_0px_0px_#000000] focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="all">All Buckets</option>
              {buckets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <BrutalButton
            variant="white"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </BrutalButton>
          <BrutalButton
            variant="pink"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleCreate}
          >
            Add Transaction
          </BrutalButton>
        </div>
      </div>

      {/* Filtered Summary Pill bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono font-bold">
        <div className="bg-[#46E88E] border-2 border-black p-2 shadow-[2px_2px_0px_0px_#000000] flex justify-between">
          <span>Inflow ({filtered.filter(t => t.type === 'income').length}):</span>
          <span>+{formatCurrency(totalInflow)}</span>
        </div>
        <div className="bg-[#FF5E7E] text-white border-2 border-black p-2 shadow-[2px_2px_0px_0px_#000000] flex justify-between">
          <span>Outflow ({filtered.filter(t => t.type === 'expense').length}):</span>
          <span>-{formatCurrency(totalOutflow)}</span>
        </div>
        <div className={`border-2 border-black p-2 shadow-[2px_2px_0px_0px_#000000] flex justify-between ${
          netDelta >= 0 ? 'bg-[#FFDE59] text-black' : 'bg-[#EF4444] text-white'
        }`}>
          <span>Net Velocity:</span>
          <span>{netDelta >= 0 ? `+${formatCurrency(netDelta)}` : formatCurrency(netDelta)}</span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border-[3px] border-black shadow-[5px_5px_0px_0px_#000000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono border-collapse">
            <thead>
              <tr className="bg-[#FFFBEB] border-b-2 border-black text-xs font-black uppercase text-black">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Flow & Category</th>
                <th className="py-2.5 px-3">Bucket</th>
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/20 text-xs">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 font-mono">
                    {transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="text-xs font-black uppercase text-black">No Real Ledger Transactions Logged</span>
                        <span className="text-[11px] text-gray-600 max-w-sm">
                          Click &quot;Add Transaction&quot; above to record your first income, expense, or capital transfer.
                        </span>
                      </div>
                    ) : (
                      'No transactions found matching your filter criteria.'
                    )}
                  </td>
                </tr>
              ) : (
                paginated.map((tx) => {
                  const bucket = buckets.find((b) => b.id === tx.bucket_id);
                  const isIncome = tx.type === 'income';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-yellow-50/60 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                        {tx.date}
                      </td>

                      {/* Category & Note */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {isIncome ? (
                            <span className="p-1 bg-[#46E88E] border border-black text-black">
                              <ArrowUpRight className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="p-1 bg-[#FF5E7E] border border-black text-white">
                              <ArrowDownRight className="w-3 h-3" />
                            </span>
                          )}
                          <span className="font-bold text-black">{tx.category}</span>
                          {tx.is_recurring && (
                            <span title="Recurring" className="text-gray-500">
                              <Repeat className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        {tx.note && (
                          <p className="text-[11px] text-gray-600 line-clamp-1 italic mt-0.5">
                            {tx.note}
                          </p>
                        )}
                      </td>

                      {/* Bucket */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {bucket ? (
                          <span
                            className="px-2 py-0.5 text-[10px] font-bold border border-black uppercase inline-block shadow-[1px_1px_0px_0px_#000000]"
                            style={{ backgroundColor: bucket.color_hex }}
                          >
                            {bucket.name}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-500 italic">Unallocated</span>
                        )}
                      </td>

                      {/* Classification */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isIncome ? (
                          <BrutalBadge color="green" size="sm">Revenue</BrutalBadge>
                        ) : tx.need_vs_want === 'need' ? (
                          <BrutalBadge color="yellow" size="sm">Need / Essential</BrutalBadge>
                        ) : tx.need_vs_want === 'want' ? (
                          <BrutalBadge color="orange" size="sm">Discretionary</BrutalBadge>
                        ) : (
                          <BrutalBadge color="blue" size="sm">Capital</BrutalBadge>
                        )}
                      </td>

                      {/* Amount */}
                      <td className={`py-2.5 px-3 text-right font-black font-mono text-sm whitespace-nowrap ${
                        isIncome ? 'text-[#059669]' : 'text-[#DC2626]'
                      }`}>
                        {isIncome ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(tx)}
                            className="p-1 border border-black bg-white hover:bg-[#FFE81D] shadow-[1px_1px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this transaction?')) {
                                onDeleteTransaction(tx.id);
                              }
                            }}
                            className="p-1 border border-black bg-white hover:bg-[#FF5E7E] hover:text-white shadow-[1px_1px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t-2 border-black bg-[#FFFBEB] px-4 py-2 font-mono text-xs">
            <span>
              Page {currentPage} of {totalPages} ({filtered.length} total entries)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-black bg-white disabled:opacity-40 font-bold shadow-[1px_1px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              >
                Prev
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 border border-black bg-white disabled:opacity-40 font-bold shadow-[1px_1px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveTransaction}
        buckets={buckets}
        initialTransaction={editingTx}
      />
    </div>
  );
}
