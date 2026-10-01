import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  hint,
  error,
  required,
  id,
  className = '',
  rows = 3,
  ...props
}) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={textareaId} className={`form-label ${required ? 'form-label-required' : ''}`}>
          <span>{label}</span>
          {hint && <span className="form-hint">{hint}</span>}
        </label>
      )}

      <textarea
        id={textareaId}
        rows={rows}
        className={`form-textarea ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />

      {error && <span className="form-error-text">{error}</span>}
    </div>
  );
};
