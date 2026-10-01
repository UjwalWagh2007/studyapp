import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: 'ghost' | 'outline' | 'secondary' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  label: string; // required for accessibility aria-label
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'ghost',
  size = 'md',
  label,
  className = '',
  ...props
}) => {
  const variantClass = variant === 'outline' ? 'icon-btn-outline' : `icon-btn-${variant}`;
  const sizeClass = `icon-btn-${size}`;

  return (
    <button
      className={`icon-btn ${variantClass} ${sizeClass} ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {icon}
    </button>
  );
};
