import React, { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, Copy, X } from 'lucide-react';
import './TitleBar.css';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const checkMaximized = async () => {
      try {
        const appWindow = getCurrentWindow();
        setIsMaximized(await appWindow.isMaximized());
        unlisten = await appWindow.onResized(async () => {
          setIsMaximized(await appWindow.isMaximized());
        });
      } catch (err) {
        // Fallback for browser preview environment
        console.warn('Tauri window API not available:', err);
      }
    };
    checkMaximized();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch (err) {
      console.warn('Minimize failed:', err);
    }
  };

  const handleToggleMaximize = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
      setIsMaximized(await appWindow.isMaximized());
    } catch (err) {
      console.warn('Toggle maximize failed:', err);
    }
  };

  const handleClose = async () => {
    try {
      await getCurrentWindow().close();
    } catch (err) {
      console.warn('Close failed:', err);
    }
  };

  return (
    <header className="titlebar" data-tauri-drag-region onDoubleClick={handleToggleMaximize}>
      <div className="titlebar-leading" data-tauri-drag-region>
        <div className="titlebar-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
          </svg>
        </div>
        <span className="titlebar-title" data-tauri-drag-region>Endurance</span>
        <span className="titlebar-badge" data-tauri-drag-region>Local</span>
      </div>

      <div className="titlebar-center" data-tauri-drag-region>
        {/* Intentionally clean, serves as drag area */}
      </div>

      <div className="titlebar-controls">
        <button
          type="button"
          className="titlebar-btn"
          onClick={handleMinimize}
          title="Minimize"
          aria-label="Minimize window"
        >
          <Minus size={14} />
        </button>

        <button
          type="button"
          className="titlebar-btn"
          onClick={handleToggleMaximize}
          title={isMaximized ? "Restore" : "Maximize"}
          aria-label={isMaximized ? "Restore window" : "Maximize window"}
        >
          {isMaximized ? <Copy size={12} /> : <Square size={13} />}
        </button>

        <button
          type="button"
          className="titlebar-btn titlebar-btn-close"
          onClick={handleClose}
          title="Close"
          aria-label="Close window"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  );
};
