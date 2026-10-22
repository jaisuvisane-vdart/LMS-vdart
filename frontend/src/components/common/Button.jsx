import React from 'react';

/**
 * Enterprise Minimal Claymorphic Button component
 */
const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  icon: Icon = null,
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-150 rounded-xl select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-1';

  const variants = {
    primary: 'clay-btn-primary focus:ring-[#2C51A2]/30',
    secondary: 'clay-btn-secondary focus:ring-[#2C51A2]/30',
    navy: 'clay-btn-navy focus:ring-[#1E3B78]/30',
    outline: 'bg-white/80 hover:bg-[#EFF6FF] text-[#2C51A2] border border-[#2C51A2]/40 shadow-xs hover:border-[#2C51A2] active:translate-y-0.5 focus:ring-[#2C51A2]/30',
    danger: 'clay-btn-danger focus:ring-[#DC2626]/30',
    ghost: 'bg-transparent hover:bg-[#E2E9F4]/50 text-[#172B4D] border-transparent active:translate-y-0.5 focus:ring-transparent',
  };

  const sizes = {
    sm: 'text-xs px-4 py-2 h-9 min-h-[36px] gap-1.5 whitespace-nowrap shrink-0 font-semibold',
    md: 'text-xs sm:text-sm px-6 py-2.5 h-11 min-h-[44px] min-w-[84px] gap-2 whitespace-nowrap shrink-0 font-bold',
    lg: 'text-sm sm:text-base px-7 py-3 h-12 min-h-[48px] min-w-[110px] gap-2.5 whitespace-nowrap shrink-0 font-bold',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent animate-spin inline-block mr-1.5 rounded-full"></span>
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
};

export default Button;
