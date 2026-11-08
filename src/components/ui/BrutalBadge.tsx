import React from 'react';

interface BrutalBadgeProps {
  children: React.ReactNode;
  color?: 'yellow' | 'green' | 'pink' | 'blue' | 'purple' | 'orange' | 'white' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export function BrutalBadge({
  children,
  color = 'yellow',
  size = 'md',
  className = '',
  icon,
}: BrutalBadgeProps) {
  const colorBg = {
    yellow: 'bg-[#FFDE59] text-black',
    green: 'bg-[#46E88E] text-black',
    pink: 'bg-[#FF5E7E] text-white',
    blue: 'bg-[#4D96FF] text-white',
    purple: 'bg-[#C084FC] text-black',
    orange: 'bg-[#FF8A3D] text-black',
    white: 'bg-white text-black',
    gray: 'bg-gray-200 text-gray-900',
  }[color];

  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1 font-bold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_#000000] select-none ${sizeClasses} ${colorBg} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
