import React from 'react';
import { Search, X } from 'lucide-react';
import './SearchField.css';

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChange,
  placeholder = 'Search tracks, artists, albums...',
  onClear,
  className = '',
}) => {
  const handleClear = () => {
    onChange('');
    if (onClear) onClear();
  };

  return (
    <div className={`m3-search-field ${className}`}>
      <Search size={16} className="m3-search-icon" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="m3-search-input"
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          className="m3-search-clear"
          onClick={handleClear}
          aria-label="Clear search query"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
