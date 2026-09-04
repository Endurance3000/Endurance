import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'primary' | 'tonal' | 'outlined' | 'text';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'filled',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  // Normalize 'primary' to 'filled'
  const effectiveVariant = variant === 'primary' ? 'filled' : variant;

  return (
    <button
      className={`m3-btn m3-btn-${effectiveVariant} m3-btn-${size} ${fullWidth ? 'm3-btn-full' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="m3-btn-icon" aria-hidden="true">{icon}</span>}
      {children && <span className="m3-btn-label">{children}</span>}
      {icon && iconPosition === 'right' && <span className="m3-btn-icon" aria-hidden="true">{icon}</span>}
    </button>
  );
};
