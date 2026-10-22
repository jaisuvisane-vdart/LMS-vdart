import React from 'react';

/**
 * Enterprise Minimal Claymorphic Input component
 */
const Input = ({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  disabled = false,
  error = '',
  helperText = '',
  className = '',
  icon: Icon = null,
}) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={id || name} className="block text-xs font-semibold uppercase tracking-wider text-[#172B4D] mb-1.5">
          {label} {required && <span className="text-[#DC2626] font-bold">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-[#64748B]">
            <Icon className="w-4 h-4 shrink-0" />
          </div>
        )}
        <input
          id={id || name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full text-[#172B4D] text-sm h-11 px-4 rounded-xl transition-all duration-150 focus:outline-none clay-input ${
            Icon ? 'pl-11' : 'pl-4'
          } ${
            error
              ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'
              : ''
          } disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:cursor-not-allowed`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-[#DC2626] font-medium">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-[#64748B]">{helperText}</p>}
    </div>
  );
};

export default Input;
