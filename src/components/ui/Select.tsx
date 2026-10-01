import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  required?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  hint,
  error,
  options,
  required,
  id,
  className = '',
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={selectId} className={`form-label ${required ? 'form-label-required' : ''}`}>
          <span>{label}</span>
          {hint && <span className="form-hint">{hint}</span>}
        </label>
      )}

      <select
        id={selectId}
        className={`form-select ${error ? 'input-error' : ''} ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && <span className="form-error-text">{error}</span>}
    </div>
  );
};
