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
  ...props
}) => {
  return (
    <div
      className={`m3-card m3-card-${variant} m3-card-pad-${padding} ${interactive ? 'm3-card-interactive' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
