import { CurrencyCode } from '@/types/finance';

export function formatCurrency(amount: number, currency: CurrencyCode = 'IDR'): string {
  if (isNaN(amount)) return currency === 'IDR' ? 'Rp 0' : '$0.00';
  
  try {
    if (currency === 'IDR') {
      // Indonesian Rupiah standard convention: Rp 150.000 (no fractional cents)
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(amount));
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return currency === 'IDR'
      ? `Rp ${Math.round(amount).toLocaleString('id-ID')}`
      : `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
}

export function formatCompactCurrency(amount: number, currency: CurrencyCode = 'IDR'): string {
  if (isNaN(amount)) return currency === 'IDR' ? 'Rp 0' : '$0';
  
  if (currency === 'IDR') {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1)}M`; // Milyar
    if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1)}jt`; // Juta
    if (abs >= 1_000) return `${sign}Rp ${(abs / 1_000).toFixed(0)}rb`; // Ribu
    return `${sign}Rp ${Math.round(abs)}`;
  }

  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${Math.round(abs)}`;
}

export function formatPercent(value: number, decimals: number = 1): string {
  if (isNaN(value)) return '0.0%';
  return `${value.toFixed(decimals)}%`;
}

export function formatDateLabel(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
