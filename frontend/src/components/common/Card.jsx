import React from 'react';

/**
 * Enterprise Minimal Claymorphic Card component
 */
const Card = ({ 
  children, 
  title, 
  subtitle, 
  action, 
  className = '', 
  headerClassName = '', 
  bodyClassName = '',
  hoverable = false 
}) => {
  return (
    <div className={`clay-card rounded-2xl overflow-hidden ${hoverable ? 'clay-card-hover' : ''} ${className}`}>
      {(title || action) && (
        <div className={`px-4 sm:px-6 py-4 border-b border-[#E2E8F0]/80 flex flex-wrap items-center justify-between gap-3 bg-white/50 backdrop-blur-xs ${headerClassName}`}>
          <div>
            {title && <h3 className="text-base font-bold text-[#172B4D] tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={`p-4 sm:p-6 ${bodyClassName}`}>{children}</div>
    </div>
  );
};

export default Card;
