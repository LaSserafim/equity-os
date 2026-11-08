import React from 'react';

interface BrutalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  prefix?: string;
}

export function BrutalInput({
  label,
  helperText,
  error,
  prefix,
  className = '',
  ...props
}: BrutalInputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-black uppercase tracking-wider font-mono text-black">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 font-mono font-bold text-gray-700 select-none">
            {prefix}
          </span>
        )}
        <input
          className={`w-full bg-white border-2 border-black px-3 py-2 text-sm font-mono text-black placeholder-gray-500 shadow-[3px_3px_0px_0px_#000000] focus:outline-none focus:bg-[#FFFBEB] focus:shadow-[4px_4px_0px_0px_#000000] transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${
            prefix ? 'pl-8' : ''
          } ${error ? 'border-[#EF4444]' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs font-bold text-[#EF4444] font-mono">{error}</span>}
      {!error && helperText && (
        <span className="text-xs text-gray-600 font-mono">{helperText}</span>
      )}
    </div>
  );
}

interface BrutalSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { label: string; value: string }[];
  helperText?: string;
}

export function BrutalSelect({
  label,
  options,
  helperText,
  className = '',
  ...props
}: BrutalSelectProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-black uppercase tracking-wider font-mono text-black">
          {label}
        </label>
      )}
      <select
        className={`w-full bg-white border-2 border-black px-3 py-2 text-sm font-mono text-black shadow-[3px_3px_0px_0px_#000000] focus:outline-none focus:bg-[#FFFBEB] focus:shadow-[4px_4px_0px_0px_#000000] transition-all cursor-pointer ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {helperText && <span className="text-xs text-gray-600 font-mono">{helperText}</span>}
    </div>
  );
}
