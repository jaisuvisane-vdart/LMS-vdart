import React, { useState, useEffect } from 'react';
import NumberFlow from '@number-flow/react';

/**
 * AnimatedNumber
 * Provides smooth odometer/flow digit animation for dashboard and KPI metrics using @number-flow/react.
 * Automatically animates from 0 to the target value on initial mount, route entry, and state mutation.
 * Intelligently handles percentages, fraction ratios (e.g. '12 / 20'), and plain numbers.
 */
const AnimatedNumber = ({
  value,
  format,
  prefix: manualPrefix,
  suffix: manualSuffix,
  className = '',
}) => {
  // Graceful fallback for non-loaded or nullish states
  if (value === null || value === undefined || value === '—' || value === '') {
    return <span className={className}>—</span>;
  }

  // Check if value is a compound fraction ratio (e.g., "12 / 20" or "1 of 4")
  const strVal = String(value).trim();
  const ratioMatch = strVal.match(/^([-+]?\d*\.?\d+)\s*(\/|of)\s*([-+]?\d*\.?\d+)$/);

  if (ratioMatch) {
    const num1 = parseFloat(ratioMatch[1]);
    const delimiter = ratioMatch[2] === '/' ? '/' : 'of';
    const num2 = parseFloat(ratioMatch[3]);

    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <SingleAnimatedNumber value={num1} format={format} />
        <span className="opacity-70 font-sans font-normal text-sm">{delimiter}</span>
        <SingleAnimatedNumber value={num2} format={format} />
      </span>
    );
  }

  // Parse potential percentage or currency affixes (e.g. "95%", "+12", "75.5%")
  const singleMatch = strVal.match(/^([^0-9.-]*)([-+]?[0-9]*\.?[0-9]+)([^0-9.-]*)$/);

  if (singleMatch && singleMatch[2] !== undefined && singleMatch[2] !== '') {
    const parsedPrefix = manualPrefix || singleMatch[1] || '';
    const numericPart = parseFloat(singleMatch[2]);
    const parsedSuffix = manualSuffix || singleMatch[3] || '';

    return (
      <SingleAnimatedNumber
        value={numericPart}
        prefix={parsedPrefix}
        suffix={parsedSuffix}
        format={format}
        className={className}
      />
    );
  }

  // Fallback for non-numeric strings
  return <span className={className}>{strVal}</span>;
};

const SingleAnimatedNumber = ({
  value,
  prefix,
  suffix,
  format,
  className = '',
}) => {
  // Start from 0 on initial mount so NumberFlow triggers its entrance flow
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const target = typeof value === 'number' && !isNaN(value) ? value : parseFloat(value) || 0;
    const timer = setTimeout(() => {
      setDisplayValue(target);
    }, 60);

    return () => clearTimeout(timer);
  }, [value]);

  return (
    <span className={`inline-flex items-center ${className}`}>
      <NumberFlow
        value={displayValue}
        prefix={prefix}
        suffix={suffix}
        format={format}
        aria-live="polite"
      />
    </span>
  );
};

export default AnimatedNumber;
