import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BrutalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function BrutalModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}: BrutalModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full ${maxWidthClass} bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_#000000] flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-100`}
      >
        {/* Modal Ribbon Header */}
        <div className="flex items-center justify-between border-b-[3px] border-black bg-[#FFE81D] px-4 py-3 select-none">
          <h2 className="font-mono font-black text-sm uppercase tracking-wider text-black">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center bg-white border-2 border-black hover:bg-[#FF5E7E] hover:text-white shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Modal Body */}
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-60px)]">{children}</div>
      </div>
    </div>
  );
}
