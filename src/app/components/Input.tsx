import { ReactNode } from 'react';

interface InputProps {
  label?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: ReactNode;
  className?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
}

export function Input({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  icon,
  className = '',
  required = false,
  inputMode,
  autoComplete,
}: InputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-white text-sm mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className={`w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6a6a6a] focus:outline-none focus:border-[#31A6A8] focus:ring-2 focus:ring-[#31A6A8]/20 transition-all ${
            icon ? 'pl-10' : ''
          }`}
        />
      </div>
    </div>
  );
}
