import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number | string;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'segmented' | 'underline';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  variant = 'segmented',
  className = '',
}) => {
  if (variant === 'underline') {
    return (
      <div className={`tabs-underline-list ${className}`} role="tablist">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isActive}
              className={`tabs-underline-item ${isActive ? 'active' : ''}`}
              onClick={() => onChange(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span className={`badge ${isActive ? 'badge-primary' : 'badge-default'}`} style={{ fontSize: '11px', padding: '1px 6px' }}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`tabs-segmented ${className}`} role="tablist">
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            className={`tabs-segmented-item ${isActive ? 'active' : ''}`}
            onClick={() => onChange(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span className={`badge ${isActive ? 'badge-primary' : 'badge-default'}`} style={{ fontSize: '11px', padding: '1px 6px' }}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
