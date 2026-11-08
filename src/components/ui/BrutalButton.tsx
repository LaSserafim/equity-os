import React from 'react';

export type ButtonVariant = 
  | 'yellow' 
  | 'green' 
  | 'pink' 
  | 'blue' 
  | 'orange' 
  | 'purple' 
  | 'black' 
  | 'white' 
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function BrutalButton({
  variant = 'yellow',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...props
}: BrutalButtonProps) {
  const variantStyles: Record<ButtonVariant, string> = {
    yellow: 'bg-[#FFDE59] text-black hover:bg-[#FFE81D]',
    green: 'bg-[#46E88E] text-black hover:bg-[#34D399]',
    pink: 'bg-[#FF5E7E] text-white hover:bg-[#F43F5E]',
    blue: 'bg-[#4D96FF] text-white hover:bg-[#3B82F6]',
    orange: 'bg-[#FF8A3D] text-black hover:bg-[#F97316]',
    purple: 'bg-[#C084FC] text-black hover:bg-[#A855F7]',
    black: 'bg-black text-white hover:bg-neutral-800',
    white: 'bg-white text-black hover:bg-gray-100',
    danger: 'bg-[#EF4444] text-white hover:bg-[#DC2626]',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2 font-bold',
    lg: 'text-base px-6 py-3 gap-2.5 font-black',
  };

  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center font-mono uppercase tracking-wide border-2 border-black transition-all select-none ${
        disabled
          ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-600 border-gray-500 shadow-none'
          : 'shadow-[3px_3px_0px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none'
      } ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
