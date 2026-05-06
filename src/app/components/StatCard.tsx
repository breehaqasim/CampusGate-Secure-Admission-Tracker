import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: ReactNode;
  trend?: 'up' | 'down';
}

export function StatCard({ title, value, change, icon, trend }: StatCardProps) {
  const isPositive = trend === 'up';

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] shadow-lg hover:border-[#31A6A8]/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[#a0a0a0] text-sm">{title}</p>
          <p className="text-3xl text-white mt-2">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-3 text-sm ${
              isPositive ? 'text-[#22c55e]' : 'text-[#ef4444]'
            }`}>
              {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="w-12 h-12 bg-[#31A6A8]/10 rounded-lg flex items-center justify-center text-[#31A6A8]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
