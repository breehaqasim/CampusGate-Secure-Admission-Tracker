import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, subtitle, children, className = '' }: CardProps) {
  return (
    <div className={`bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] shadow-lg ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-white">{title}</h3>}
          {subtitle && <p className="text-[#a0a0a0] text-sm mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
