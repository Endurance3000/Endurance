import React from 'react';
import './SectionHeader.css';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
}) => {
  return (
    <div className={`m3-section-header ${className}`}>
      <div className="m3-section-header-text">
        <h2 className="m3-section-title">{title}</h2>
        {subtitle && <p className="m3-section-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="m3-section-header-action">{action}</div>}
    </div>
  );
};
