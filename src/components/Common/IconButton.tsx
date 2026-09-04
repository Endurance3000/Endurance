import React from 'react';
import './IconButton.css';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  'aria-label': string;
  variant?: 'standard' | 'filled' | 'tonal' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
  selected?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  'aria-label': ariaLabel,
  variant = 'standard',
  size = 'md',
  tooltip,
  selected = false,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      type="button"
      className={`m3-icon-btn m3-icon-btn-${variant} m3-icon-btn-${size} ${selected ? 'selected' : ''} ${className}`}
      aria-label={ariaLabel}
      title={tooltip || ariaLabel}
      disabled={disabled}
      {...props}
    >
      <span className="m3-icon-btn-inner" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
};
