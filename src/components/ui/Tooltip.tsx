import React, { useState } from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && content && (
        <div
          style={{
            position: 'absolute',
            zIndex: 1500,
            padding: '4px 8px',
            fontSize: '11.5px',
            fontWeight: 500,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-medium)',
            boxShadow: 'var(--shadow-md)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            ...(position === 'top'
              ? { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' }
              : position === 'bottom'
              ? { top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' }
              : position === 'left'
              ? { right: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' }
              : { left: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' }),
          }}
          className="animate-fade-in"
        >
          {content}
        </div>
      )}
    </div>
  );
};
