import React from 'react';

/**
 * Enterprise Minimal Claymorphic ProgressBar component
 */
const ProgressBar = ({ value = 0, max = 100, height = 'h-2.5', showLabel = false, className = '' }) => {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-bold text-[#172B4D] mb-1.5">
          <span className="text-[#64748B] uppercase tracking-wide">Completion</span>
          <span className="text-[#2C51A2] font-mono">{percentage}%</span>
        </div>
      )}
      <div 
        className={`w-full bg-[#E2E9F4] rounded-full overflow-hidden ${height}`}
        style={{
          boxShadow: 'inset 0 1.5px 3px rgba(30, 59, 120, 0.12), 0 1px 1px rgba(255, 255, 255, 0.8)'
        }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ 
            width: `${percentage}%`,
            background: 'linear-gradient(160deg, #325bb5 0%, #25468d 100%)',
            boxShadow: 'inset 0 1px 0.5px rgba(255, 255, 255, 0.4), 0 1px 3px rgba(44, 81, 162, 0.3)'
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
