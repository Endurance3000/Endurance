import React from 'react';
import './Chip.css';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  children,
  selected = false,
  icon,
  className = '',
  ...props
}) => {
  return (
    <button
      type="button"
      className={`m3-chip ${selected ? 'selected' : ''} ${className}`}
      {...props}
    >
      {icon && <span className="m3-chip-icon" aria-hidden="true">{icon}</span>}
      <span className="m3-chip-label">{children}</span>
    </button>
  );
};
