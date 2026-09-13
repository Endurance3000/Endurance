import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ListPlus, ArrowUpToLine, FolderOpen, Copy, Check, FileEdit } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Track } from '../../types';
import { usePlayback } from '../../state/PlaybackContext';
import './SongActionMenu.css';

interface SongActionMenuProps {
  track: Track;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
  onEditLyrics?: (track: Track) => void;
}

export const SongActionMenu: React.FC<SongActionMenuProps> = ({
  track,
  isOpen,
  onClose,
  position,
  triggerRef,
  onEditLyrics,
}) => {
  const { playNext, addToQueue } = usePlayback();

  const menuRef = useRef<HTMLDivElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  const [copied, setCopied] = useState(false);

  // Move focus into the menu when it opens.
  // Restore focus when the menu unmounts/closes.
  useEffect(() => {
    if (!isOpen) return;

    firstMenuItemRef.current?.focus();
    wasOpenRef.current = true;

    return () => {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        triggerRef?.current?.focus();
      }
    };
  }, [isOpen, triggerRef]);

  // Close on outside click, Escape, and trap Tab focus inside the menu.
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key !== 'Tab') {
        return;
      }

      const menu = menuRef.current;

      if (!menu) {
        return;
      }

      const focusableItems = Array.from(
        menu.querySelectorAll<HTMLButtonElement>(
          'button:not([disabled])'
        )
      );

      if (focusableItems.length === 0) {
        return;
      }

      const firstItem = focusableItems[0];
      const lastItem = focusableItems[focusableItems.length - 1];

      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
        return;
      }

      if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOpenFolder = async () => {
    try {
      await invoke('show_in_folder', { filePath: track.file_path });
    } catch (err) {
      console.warn('Could not reveal file in explorer:', err);
    }

    onClose();
  };

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(track.file_path);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 600);
    } catch (err) {
      console.warn('Could not copy path to clipboard:', err);
      onClose();
    }
  };

  const handleEditLyrics = () => {
    if (onEditLyrics) {
      onEditLyrics(track);
    } else {
      window.dispatchEvent(
        new CustomEvent('endurance:open-lyrics-editor', { detail: { track } })
      );
    }
    onClose();
  };

  // Viewport boundary clamping
  const menuWidth = 210;
  const menuHeight = 205;

  let targetX = position.x;
  let targetY = position.y;

  if (targetX + menuWidth > window.innerWidth - 12) {
    targetX = targetX - menuWidth;
  }

  if (targetY + menuHeight > window.innerHeight - 12) {
    targetY = targetY - menuHeight;
  }

  const clampedX = Math.max(
    12,
    Math.min(targetX, window.innerWidth - menuWidth - 12)
  );

  const clampedY = Math.max(
    12,
    Math.min(targetY, window.innerHeight - menuHeight - 12)
  );

  return createPortal(
    <div
      className="song-action-menu"
      ref={menuRef}
      style={{
        left: `${clampedX}px`,
        top: `${clampedY}px`,
      }}
      role="menu"
      aria-label={`Actions for ${track.title}`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        ref={firstMenuItemRef}
        type="button"
        className="song-menu-item"
        role="menuitem"
        onClick={() => {
          playNext(track);
          onClose();
        }}
      >
        <span className="song-menu-item-icon">
          <ArrowUpToLine size={15} />
        </span>
        <span>Play Next</span>
      </button>

      <button
        type="button"
        className="song-menu-item"
        role="menuitem"
        onClick={() => {
          addToQueue(track);
          onClose();
        }}
      >
        <span className="song-menu-item-icon">
          <ListPlus size={15} />
        </span>
        <span>Add to Queue</span>
      </button>

      <div className="song-menu-divider" />

      <button
        type="button"
        className="song-menu-item"
        role="menuitem"
        onClick={handleEditLyrics}
      >
        <span className="song-menu-item-icon">
          <FileEdit size={15} />
        </span>
        <span>Edit Lyrics</span>
      </button>

      <button
        type="button"
        className="song-menu-item"
        role="menuitem"
        onClick={handleOpenFolder}
      >
        <span className="song-menu-item-icon">
          <FolderOpen size={15} />
        </span>
        <span>Open in File Explorer</span>
      </button>

      <button
        type="button"
        className="song-menu-item"
        role="menuitem"
        onClick={handleCopyPath}
      >
        <span className="song-menu-item-icon">
          {copied ? (
            <Check size={15} color="var(--md-sys-color-primary)" />
          ) : (
            <Copy size={15} />
          )}
        </span>
        <span>{copied ? 'Path Copied!' : 'Copy File Path'}</span>
      </button>
    </div>,
    document.body
  );
};