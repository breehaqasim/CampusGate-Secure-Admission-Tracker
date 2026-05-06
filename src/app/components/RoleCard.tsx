import { ReactNode } from 'react';

interface RoleCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

export function RoleCard({ icon, title, description, onClick }: RoleCardProps) {
  return (
    <button
      onClick={onClick}
      className="group w-full bg-[#1a1a1a] border-2 border-[#2a2a2a] rounded-2xl p-8 transition-all duration-300 hover:border-[#31A6A8] hover:bg-[#1a1a1a]/80 hover:shadow-xl hover:shadow-[#31A6A8]/10 hover:scale-105"
    >
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-[#2a2a2a] flex items-center justify-center text-[#a0a0a0] transition-all duration-300 group-hover:bg-[#31A6A8] group-hover:text-white group-hover:scale-110">
          {icon}
        </div>
        <div>
          <h3 className="text-white text-xl mb-1">{title}</h3>
          <p className="text-[#a0a0a0] text-sm">{description}</p>
        </div>
      </div>
    </button>
  );
}
