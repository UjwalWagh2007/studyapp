import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  hint,
  error,
  iconLeft,
  iconRight,
  required,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className={`form-label ${required ? 'form-label-required' : ''}`}>
          <span>{label}</span>
          {hint && <span className="form-hint">{hint}</span>}
        </label>
      )}

      <div className="input-wrapper">
        {iconLeft && <span className="input-icon-left">{iconLeft}</span>}
        <input
          id={inputId}
          className={`form-input ${iconLeft ? 'has-icon-left' : ''} ${iconRight ? 'has-icon-right' : ''} ${error ? 'input-error' : ''} ${className}`}
          {...props}
        />
        {iconRight && <span className="input-icon-right">{iconRight}</span>}
      </div>

      {error && <span className="form-error-text">{error}</span>}
    </div>
  );
};
