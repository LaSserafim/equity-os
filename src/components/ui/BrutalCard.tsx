import React from 'react';

interface BrutalCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: 'yellow' | 'green' | 'pink' | 'blue' | 'purple' | 'orange';
  headerColor?: string;
  action?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function BrutalCard({
  children,
  title,
  subtitle,
  badge,
  badgeColor = 'yellow',
  headerColor,
  action,
  className = '',
  onClick,
}: BrutalCardProps) {
  const badgeBg = {
    yellow: 'bg-[#FFDE59]',
    green: 'bg-[#46E88E]',
    pink: 'bg-[#FF5E7E] text-white',
    blue: 'bg-[#4D96FF] text-white',
    purple: 'bg-[#C084FC]',
    orange: 'bg-[#FF8A3D] text-white',
  }[badgeColor];

  return (
    <div
      onClick={onClick}
      className={`bg-white border-[3px] border-black shadow-[5px_5px_0px_0px_#000000] relative flex flex-col transition-all ${
        onClick ? 'cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_0px_#000000]' : ''
      } ${className}`}
    >
      {(title || badge || action) && (
        <div
          className={`flex items-center justify-between border-b-[3px] border-black px-4 py-3 ${
            headerColor || 'bg-[#FFFBEB]'
          }`}
        >
          <div className="flex items-center gap-2">
            {badge && (
              <span
                className={`text-xs font-black uppercase px-2 py-0.5 border-2 border-black tracking-wider ${badgeBg}`}
              >
                {badge}
              </span>
            )}
            {title && (
              <div>
                <h3 className="font-black text-sm tracking-tight uppercase text-black font-mono">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs font-medium text-gray-700">{subtitle}</p>
                )}
              </div>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="p-4 flex-1">{children}</div>
    </div>
  );
}
