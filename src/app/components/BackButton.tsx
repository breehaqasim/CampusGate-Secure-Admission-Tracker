import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
}

export function BackButton({ onClick }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      className="absolute top-6 left-6 flex items-center gap-2 text-[#a0a0a0] hover:text-[#31A6A8] transition-colors"
    >
      <ArrowLeft size={20} />
      <span>Back</span>
    </button>
  );
}
