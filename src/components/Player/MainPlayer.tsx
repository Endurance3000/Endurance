import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Music2, FileEdit } from 'lucide-react';
import { Track } from '../../types';
import { usePlayback } from '../../state/PlaybackContext';
import { lyricsService } from '../../services/lyrics/lyricsService';
import { findActiveLyricIndex, ParsedLyrics } from '../../services/lyrics/lrcParser';
import { libraryService } from '../../services/library/libraryService';
import './MainPlayer.css';

interface MainPlayerProps {
  onClose: () => void;
  onEditLyrics?: (track: Track) => void;
}

export const MainPlayer: React.FC<MainPlayerProps> = ({ onClose, onEditLyrics }) => {
  const { currentTrack, currentTime, seek } = usePlayback();
  const [lyricsData, setLyricsData] = useState<ParsedLyrics>({ type: 'none' });
  const [artworkDataUri, setArtworkDataUri] = useState<string | null>(null);

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Main overlay focus management
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  // Remember the element that opened the overlay.
  // This lets MainPlayer restore focus without requiring the parent
  // component to pass a trigger ref.
  useEffect(() => {
    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    wasOpenRef.current = true;

    const frame = requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);

      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        openerRef.current?.focus();
      }
    };
  }, []);

  // Load lyrics when current track changes
  useEffect(() => {
    let isMounted = true;
    setLyricsData({ type: 'none' });

    if (!currentTrack) {
      return;
    }

    const filePath = currentTrack.file_path;
    lyricsService.getLyrics(filePath, true).then((loaded) => {
      if (isMounted) {
        setLyricsData(loaded);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.id]);

  // Refresh lyrics on disk update
  useEffect(() => {
    const handleLyricsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ filePath?: string }>;
      if (!currentTrack) return;
      if (!customEvent.detail?.filePath || customEvent.detail.filePath === currentTrack.file_path) {
        lyricsService.getLyrics(currentTrack.file_path, true).then((loaded) => {
          setLyricsData(loaded);
        });
      }
    };

    window.addEventListener('endurance:lyrics-updated', handleLyricsUpdated);
    return () => window.removeEventListener('endurance:lyrics-updated', handleLyricsUpdated);
  }, [currentTrack]);

  const handleEditLyrics = () => {
    if (!currentTrack) return;
    if (onEditLyrics) {
      onEditLyrics(currentTrack);
    } else {
      window.dispatchEvent(
        new CustomEvent('endurance:open-lyrics-editor', { detail: { track: currentTrack } })
      );
    }
  };

  // Load high-res artwork data URI
  useEffect(() => {
    let isMounted = true;
    setArtworkDataUri(null);

    if (!currentTrack?.artwork_hash) {
      return;
    }

    const hash = currentTrack.artwork_hash;
    libraryService.getTrackArtwork(hash).then((uri) => {
      if (isMounted) {
        setArtworkDataUri(uri);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.artwork_hash]);

  const isNoLyrics = lyricsData.type === 'none';
  const isPlainLyrics = lyricsData.type === 'plain';
  const isSyncedLyrics = lyricsData.type === 'synced';
  const hasLyrics = !isNoLyrics;

  // Determine active lyric index only for synced lyrics
  const activeIndex = isSyncedLyrics
    ? findActiveLyricIndex(lyricsData.lines, currentTime)
    : -1;

  // Smoothly center the active lyric line in the scroll container
  // for synced lyrics
  useEffect(() => {
    if (
      isSyncedLyrics &&
      activeLineRef.current &&
      scrollContainerRef.current
    ) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, isSyncedLyrics]);

  // Keyboard handling for the modal overlay:
  // - Escape closes the overlay.
  // - Tab / Shift+Tab are trapped inside the overlay.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') {
        return;
      }

      const overlay = overlayRef.current;

      if (!overlay) {
        return;
      }

      const focusableElements = Array.from(
        overlay.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => {
        const style = window.getComputedStyle(element);

        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          element.getAttribute('aria-hidden') !== 'true'
        );
      });

      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
        return;
      }

      if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!currentTrack) {
    return null;
  }

  return (
    <div
      className="main-player-overlay m3-expressive-main-player"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Now Playing Main View"
    >
      {/* Dynamic Ambient Color Aura Glow */}
      <div className="main-player-ambient-aura" aria-hidden="true" />

      {/* Top Bar with Collapse Action */}
      <header className="main-player-topbar">
        <button
          ref={closeButtonRef}
          type="button"
          className="main-player-collapse-btn"
          onClick={onClose}
          aria-label="Collapse to Library"
          title="Collapse to Library (Esc)"
        >
          <ChevronDown size={18} className="collapse-icon" />
          <span>Collapse</span>
        </button>

        {currentTrack && (
          <button
            type="button"
            className="main-player-collapse-btn main-player-edit-lyrics-btn"
            onClick={handleEditLyrics}
            aria-label="Edit Lyrics"
            title="Edit Lyrics"
          >
            <FileEdit size={16} />
            <span>Edit Lyrics</span>
          </button>
        )}
      </header>

      {/* Main 2-Column Body */}
      <div
        className={`main-player-body ${
          hasLyrics ? 'has-lyrics' : 'no-lyrics'
        }`}
      >
        {/* LEFT COLUMN: Large Artwork */}
        <section
          className={`main-player-left ${
            hasLyrics ? 'has-lyrics' : 'no-lyrics'
          }`}
          aria-label="Current Song Overview"
        >
          <div
            className={`main-player-artwork-wrap ${
              hasLyrics ? 'artwork-standard' : 'artwork-expanded'
            }`}
          >
            {artworkDataUri ? (
              <img
                key={currentTrack.artwork_hash || currentTrack.id}
                src={artworkDataUri}
                alt={currentTrack.album || currentTrack.title}
                className="main-player-artwork-img"
              />
            ) : (
              <Music2
                size={hasLyrics ? 88 : 120}
                className="main-player-artwork-fallback"
              />
            )}
          </div>

          {/* Title and artist underneath artwork ONLY rendered
              when lyrics ARE available */}
          {hasLyrics && (
            <div
              className="main-player-meta-left motion-fade-in"
              key={currentTrack.id}
            >
              <h1 className="main-player-title-left">
                {currentTrack.title}
              </h1>

              <h2 className="main-player-artist-left">
                {currentTrack.artist}
              </h2>

              {currentTrack.album && (
                <span className="main-player-album-left">
                  {currentTrack.album}
                </span>
              )}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: 3 Mutually Exclusive States */}
        <section
          className={`main-player-right ${
            hasLyrics ? 'has-lyrics' : 'no-lyrics'
          }`}
          aria-label="Lyrics and Details"
        >
          {/* STATE 3: Synchronized LRC Lyrics */}
          {isSyncedLyrics && (
            <div
              className="lyrics-scroll-container"
              ref={scrollContainerRef}
            >
              {lyricsData.lines.map((line, idx) => {
                const isActive = idx === activeIndex;

                return (
                  <div
                    key={`${line.time}_${idx}`}
                    ref={isActive ? activeLineRef : null}
                    className={`lyric-line ${
                      isActive ? 'active' : ''
                    }`}
                    onClick={() => seek(line.time)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        seek(line.time);
                      }
                    }}
                    title={`Seek to ${line.time.toFixed(1)}s`}
                  >
                    {line.text || '♪'}
                  </div>
                );
              })}
            </div>
          )}

          {/* STATE 2: Plain-Text Lyrics */}
          {isPlainLyrics && (
            <div className="plain-lyrics-scroll-container motion-fade-in">
              {lyricsData.lines.map((line, idx) => (
                <p key={idx} className="plain-lyric-line">
                  {line}
                </p>
              ))}
            </div>
          )}

          {/* STATE 1: No Lyrics File Available */}
          {isNoLyrics && (
            <div
              className="no-lyrics-fallback motion-fade-in"
              key={currentTrack.id}
            >
              <div className="no-lyrics-title">
                {currentTrack.title}
              </div>

              <div className="no-lyrics-artist">
                {currentTrack.artist}
              </div>

              {currentTrack.album && (
                <div className="no-lyrics-album">
                  {currentTrack.album}
                </div>
              )}

              <div style={{ marginTop: 'var(--space-md)' }}>
                <button
                  type="button"
                  className="main-player-collapse-btn"
                  onClick={handleEditLyrics}
                >
                  <FileEdit size={15} />
                  <span>Edit Lyrics</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};