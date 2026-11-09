import React, { useState, useEffect } from 'react';
import { CurrencyCode } from '@/types/finance';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { BrutalBadge } from '@/components/ui/BrutalBadge';
import { BrutalModal } from '@/components/ui/BrutalModal';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { signInWithGoogle, signOut } from '@/lib/supabase/auth';
import {
  Wallet,
  PieChart,
  TrendingUp,
  Layers,
  ListOrdered,
  Download,
  Upload,
  RefreshCw,
  LogIn,
  LogOut,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';

export type ActiveTab = 'overview' | 'buckets' | 'analytics' | 'compounding' | 'transactions';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  isPrivacyMode: boolean;
  onTogglePrivacy: () => void;
  onExportData: () => void;
  onImportData: (jsonStr: string) => void;
  onResetData: () => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  currency,
  onCurrencyChange,
  isPrivacyMode,
  onTogglePrivacy,
  onExportData,
  onImportData,
  onResetData,
}: NavbarProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [importInput, setImportInput] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importError, setImportError] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email || 'Authenticated User');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleAuth = async () => {
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google OAuth sign-in failed';
      alert(msg);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUserEmail(null);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importInput.trim()) {
      setImportError('Please paste valid JSON dataset');
      return;
    }
    try {
      JSON.parse(importInput);
      onImportData(importInput);
      setIsImportModalOpen(false);
      setImportInput('');
      setImportError('');
    } catch {
      setImportError('Invalid JSON format. Check syntax.');
    }
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'overview', label: 'Overview', icon: <Wallet className="w-3.5 h-3.5" />, color: '#FFE81D' },
    { id: 'buckets', label: 'Equity Buckets', icon: <Layers className="w-3.5 h-3.5" />, color: '#59B4FF' },
    { id: 'analytics', label: 'Adaptive Analytics', icon: <PieChart className="w-3.5 h-3.5" />, color: '#FF5E7E' },
    { id: 'compounding', label: 'Compounding Simulator', icon: <TrendingUp className="w-3.5 h-3.5" />, color: '#46E88E' },
    { id: 'transactions', label: 'Financial Ledger', icon: <ListOrdered className="w-3.5 h-3.5" />, color: '#FF8A3D' },
  ];

  return (
    <header className="border-b-[3px] border-black bg-white sticky top-0 z-40">
      {/* Top Utility Bar */}
      <div className="border-b-2 border-black bg-[#FFFBEB] px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          {isSupabaseConfigured && userEmail ? (
            <BrutalBadge color="green" size="sm" icon={<Database className="w-3 h-3" />}>
              Supabase Cloud Live: {userEmail}
            </BrutalBadge>
          ) : (
            <BrutalBadge color="yellow" size="sm" icon={<Database className="w-3 h-3" />}>
              Local Sandbox Mode (Zero Latency)
            </BrutalBadge>
          )}

        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Currency Toggle Switcher */}
          <div className="flex items-center border border-black bg-white shadow-[1px_1px_0px_0px_#000000] overflow-hidden">
            <button
              type="button"
              onClick={() => onCurrencyChange('IDR')}
              className={`px-2 py-0.5 font-mono text-[11px] font-black uppercase transition-all cursor-pointer ${
                currency === 'IDR'
                  ? 'bg-[#FFE81D] text-black'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              title="Indonesian Rupiah (Rp)"
            >
              🇮🇩 IDR (Rp)
            </button>
            <div className="w-[1px] bg-black h-4" />
            <button
              type="button"
              onClick={() => onCurrencyChange('USD')}
              className={`px-2 py-0.5 font-mono text-[11px] font-black uppercase transition-all cursor-pointer ${
                currency === 'USD'
                  ? 'bg-[#46E88E] text-black'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              title="US Dollar ($)"
            >
              🇺🇸 USD ($)
            </button>
          </div>

          {/* Privacy Toggle Button */}
          <button
            type="button"
            onClick={onTogglePrivacy}
            className={`px-2 py-0.5 font-mono text-[11px] font-black uppercase border border-black shadow-[1px_1px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1 cursor-pointer transition-all ${
              isPrivacyMode ? 'bg-[#FF5E7E] text-white' : 'bg-white text-black hover:bg-gray-100'
            }`}
            title={isPrivacyMode ? 'Privacy Mode Active (Balances Hidden)' : 'Hide Balances & Equity'}
          >
            {isPrivacyMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{isPrivacyMode ? 'Hidden' : 'Hide'}</span>
          </button>

          <button
            onClick={onExportData}
            className="px-2 py-0.5 border border-black bg-white hover:bg-yellow-200 font-bold shadow-[1px_1px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1 cursor-pointer"
            title="Export full financial ledger to JSON"
          >
            <Download className="w-3 h-3" /> Export
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-2 py-0.5 border border-black bg-white hover:bg-yellow-200 font-bold shadow-[1px_1px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1 cursor-pointer"
            title="Import JSON backup"
          >
            <Upload className="w-3 h-3" /> Import
          </button>
          {userEmail ? (
            <button
              onClick={handleSignOut}
              className="px-2 py-0.5 border border-black bg-black text-white hover:bg-neutral-800 font-bold shadow-[1px_1px_0px_0px_#000000] flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3 h-3" /> Sign Out
            </button>
          ) : (
            <button
              onClick={handleGoogleAuth}
              className="px-2.5 py-0.5 border border-black bg-[#46E88E] text-black font-bold shadow-[1px_1px_0px_0px_#000000] flex items-center gap-1 cursor-pointer hover:bg-green-400"
            >
              <LogIn className="w-3 h-3" /> Google OAuth
            </button>
          )}
        </div>
      </div>

      {/* Main Brand & Tab Navigation */}
      <div className="px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand Mark */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-8 h-8 bg-black text-white border-2 border-black shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center font-mono font-black text-xs tracking-wider">
            EQ
          </div>
          <h1 className="font-mono font-black text-base uppercase tracking-tight text-black">
            EQUITY.OS
          </h1>
        </div>

        {/* Tab Navigation Pills */}
        <nav className="flex items-center gap-2 flex-wrap justify-center">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-black uppercase border-2 border-black transition-all cursor-pointer ${
                  isActive
                    ? 'shadow-[4px_4px_0px_0px_#000000] -translate-x-0.5 -translate-y-0.5'
                    : 'bg-white hover:bg-gray-100 shadow-[1px_1px_0px_0px_#000000]'
                }`}
                style={{ backgroundColor: isActive ? item.color : '#FFFFFF' }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* JSON Import Modal */}
      <BrutalModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import JSON Financial Ledger"
      >
        <form onSubmit={handleImportSubmit} className="flex flex-col gap-3">
          {importError && (
            <div className="bg-[#EF4444] text-white p-2 text-xs font-mono font-bold border-2 border-black">
              ⚠️ {importError}
            </div>
          )}
          <p className="text-xs font-mono text-gray-700">
            Paste a previously exported JSON backup containing your profile, equity buckets, transactions, and scenarios:
          </p>
          <textarea
            rows={8}
            value={importInput}
            onChange={(e) => setImportInput(e.target.value)}
            placeholder='{"profile": {...}, "buckets": [...], "transactions": [...]}'
            className="w-full bg-[#FFFBEB] border-2 border-black p-2 font-mono text-xs shadow-[2px_2px_0px_0px_#000000] focus:outline-none"
          />
          <div className="flex justify-end gap-2 pt-2 border-t-2 border-black">
            <BrutalButton type="button" variant="white" size="sm" onClick={() => setIsImportModalOpen(false)}>
              Cancel
            </BrutalButton>
            <BrutalButton type="submit" variant="green" size="sm">
              Restore Dataset
            </BrutalButton>
          </div>
        </form>
      </BrutalModal>
    </header>
  );
}
