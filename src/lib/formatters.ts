import { CurrencyCode } from '@/types/finance';

export function formatCurrency(amount: number, currency: CurrencyCode = 'USD'): string {
  if (isNaN(amount)) return '$0.00';
  
  // Format depending on currency
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'IDR' || currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'IDR' || currency === 'JPY' ? 0 : 2,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
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
