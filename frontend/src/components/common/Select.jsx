import React from 'react';

/**
 * Enterprise Minimal Claymorphic Select Component
 */
const Select = ({
  label,
  id,
  name,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  error = '',
  className = '',
}) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={id || name} className="block text-xs font-semibold uppercase tracking-wider text-[#172B4D] mb-1.5">
          {label} {required && <span className="text-[#DC2626] font-bold">*</span>}
        </label>
      )}
      <select
        id={id || name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`w-full text-[#172B4D] text-xs sm:text-sm font-semibold h-11 px-4 pr-10 rounded-xl transition-all duration-150 focus:outline-none clay-input cursor-pointer ${
          error
            ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'
            : ''
        } disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:cursor-not-allowed`}
      >
        {options.map((opt, idx) => (
          <option key={idx} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-[#DC2626] font-medium">{error}</p>}
    </div>
  );
};

export default Select;
