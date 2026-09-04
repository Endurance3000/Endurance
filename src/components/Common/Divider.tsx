import React from 'react';
import './Divider.css';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  spacing = 'md',
  className = '',
}) => {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={`m3-divider m3-divider-${orientation} m3-divider-space-${spacing} ${className}`}
    />
  );
};
