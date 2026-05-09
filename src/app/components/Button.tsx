import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  className = '',
  disabled = false,
  type = 'button',
}: ButtonProps) {
  const baseStyles = 'rounded-lg transition-all duration-200 inline-flex items-center justify-center';

  const variants = {
    primary: 'bg-[#31A6A8] text-white hover:bg-[#2a9395] active:bg-[#248284]',
    secondary: 'bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]',
    outline: 'border border-[#31A6A8] text-[#31A6A8] hover:bg-[#31A6A8] hover:text-white'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {children}
    </button>
  );
}
