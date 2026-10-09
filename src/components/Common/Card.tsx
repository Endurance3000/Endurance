import React from 'react';
import './Card.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'filled' | 'outlined';
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'filled',
  interactive = false,
  padding = 'md',
  className = '',
  tabIndex,
  role,
  onKeyDown,
  onClick,
  ...props
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (interactive && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
    }
    onKeyDown?.(e);
  };

  return (
    <div
      className={`m3-card m3-card-${variant} m3-card-pad-${padding} ${interactive ? 'm3-card-interactive' : ''} ${className}`}
      tabIndex={tabIndex ?? (interactive ? 0 : undefined)}
      role={role ?? (interactive ? 'button' : undefined)}
      onKeyDown={handleKeyDown}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};
