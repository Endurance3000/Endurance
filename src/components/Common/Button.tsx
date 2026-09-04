import React from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tonal' | 'text';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`m3-button m3-button-${variant} m3-button-${size} ${className}`}
      {...props}
    >
      {icon && <span className="m3-button-icon">{icon}</span>}
      {children && <span className="m3-button-label">{children}</span>}
    </button>
  );
};
