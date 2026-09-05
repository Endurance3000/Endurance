import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpDown, ChevronDown, Check } from 'lucide-react';
import './SortMenu.css';

export type SortOption = 'title-asc' | 'title-desc' | 'date-desc' | 'date-asc';

export const VALID_SORT_OPTIONS: SortOption[] = [
  'title-asc',
  'title-desc',
  'date-desc',
  'date-asc',
];

interface SortMenuProps {
  value: SortOption;
  onChange: (sort: SortOption) => void;
}

const SORT_LABELS: Record<SortOption, string> = {
  'title-asc': 'Title (A → Z)',
  'title-desc': 'Title (Z → A)',
  'date-desc': 'Recently Added',
  'date-asc': 'Oldest Added',
};

export const SortMenu: React.FC<SortMenuProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const safeValue: SortOption = VALID_SORT_OPTIONS.includes(value) ? value : 'title-asc';

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPosition({
        x: rect.right,
        y: rect.bottom + 6,
      });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (option: SortOption) => {
    onChange(option);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const menuWidth = 190;
  const menuHeight = 160;
  let targetX = menuPosition.x - menuWidth;
  let targetY = menuPosition.y;

  if (targetX < 12) {
    targetX = 12;
  } else if (targetX + menuWidth > window.innerWidth - 12) {
    targetX = window.innerWidth - menuWidth - 12;
  }

  if (targetY + menuHeight > window.innerHeight - 12) {
    targetY = menuPosition.y - menuHeight - 40;
  }

  return (
    <div className="sort-menu-container">
      <button
        ref={triggerRef}
        type="button"
        className={`sort-menu-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="Change sort order"
      >
        <span className="sort-trigger-icon">
          <ArrowUpDown size={14} />
        </span>
        <span>{SORT_LABELS[safeValue]}</span>
        <span className="sort-trigger-caret">
          <ChevronDown size={14} />
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            className="sort-menu-popover"
            style={{ left: `${targetX}px`, top: `${targetY}px` }}
            role="listbox"
            aria-label="Sort options"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {VALID_SORT_OPTIONS.map((opt) => {
              const isSelected = opt === safeValue;
              return (
                <button
                  key={opt}
                  type="button"
                  className={`sort-menu-item ${isSelected ? 'selected' : ''}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt)}
                >
                  <span>{SORT_LABELS[opt]}</span>
                  {isSelected && (
                    <span className="sort-check-icon">
                      <Check size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};
