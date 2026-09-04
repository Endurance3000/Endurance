import React from 'react';
import { Button, ButtonProps } from './Button';
import './EmptyState.css';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  actionVariant?: ButtonProps['variant'];
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  actionVariant = 'filled',
  className = '',
}) => {
  return (
    <div className={`m3-empty-state ${className}`}>
      <div className="m3-empty-icon-container" aria-hidden="true">
        {icon}
      </div>
      <h3 className="m3-empty-title">{title}</h3>
      <p className="m3-empty-description">{description}</p>
      {actionLabel && onAction && (
        <div className="m3-empty-action">
          <Button variant={actionVariant} icon={actionIcon} onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
