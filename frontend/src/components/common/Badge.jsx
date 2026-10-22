import React from 'react';

/**
 * Enterprise Minimal Claymorphic Badge / Status Pill component
 */
const Badge = ({ children, variant = 'default', size = 'sm', className = '' }) => {
  const variants = {
    default: 'bg-[#E2E9F4] text-[#2C51A2] border-[#BCD0EC]',
    primary: 'bg-[#2C51A2] text-white border-[#2C51A2]',
    navy: 'bg-[#1E3B78] text-white border-[#1E3B78]',
    success: 'bg-[#E2E9F4] text-[#2C51A2] border-[#BFDBFE]',
    warning: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
    error: 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]',
    neutral: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
  };

  const sizes = {
    sm: 'text-[11px] px-2.5 py-0.5 font-bold tracking-wide',
    md: 'text-xs px-3.5 py-1 font-bold tracking-wide',
  };

  return (
    <span
      className={`inline-flex items-center uppercase rounded-full border clay-pill ${variants[variant] || variants.default} ${sizes[size] || sizes.sm} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
