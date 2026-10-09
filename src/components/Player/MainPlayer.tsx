import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Music2, FileEdit, Globe, AlertCircle, RotateCcw } from 'lucide-react';
import { Track } from '../../types';
import { usePlayback } from '../../state/PlaybackContext';
import { lyricsService } from '../../services/lyrics/lyricsService';
import { findActiveLyricIndex, ParsedLyrics } from '../../services/lyrics/lrcParser';
import { libraryService } from '../../services/library/libraryService';
import './MainPlayer.css';

export type LyricsLifecycleStatus =
  | 'idle'
  | 'loading'
  | 'lyrics-available'
  | 'no-lyrics'
  | 'error';

interface MainPlayerProps {
  onClose: () => void;
  onEditLyrics?: (track: Track) => void;
  onSearchLyrics?: (track: Track) => void;
}

export const MainPlayer: React.FC<MainPlayerProps> = ({
  onClose,
  onEditLyrics,
  onSearchLyrics,
}) => {
  const { currentTrack, currentTime, seek } = usePlayback();
  const [lyricsStatus, setLyricsStatus] = useState<LyricsLifecycleStatus>('loading');
  const [lyricsData, setLyricsData] = useState<ParsedLyrics>({ type: 'none' });
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const [artworkDataUri, setArtworkDataUri] = useState<string | null>(null);

  const requestSeqRef = useRef<number>(0);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Main overlay focus management
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  // Remember the element that opened the overlay.
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

  const loadLyricsForTrack = useCallback(
    async (track: Track | null, bypassCache = true) => {
      requestSeqRef.current += 1;
      const currentSeq = requestSeqRef.current;

      if (!track) {
        setLyricsStatus('idle');
        setLyricsData({ type: 'none' });
        setLyricsError(null);
        return;
      }

      setLyricsStatus('loading');
      setLyricsData({ type: 'none' });
      setLyricsError(null);

      const filePath = track.file_path;

      try {
        const loaded = await lyricsService.getLyrics(filePath, bypassCache);
        if (requestSeqRef.current !== currentSeq) {
          return;
        }

        if (loaded.type === 'synced' || loaded.type === 'plain') {
          setLyricsData(loaded);
          setLyricsStatus('lyrics-available');
        } else {
          setLyricsData({ type: 'none' });
          setLyricsStatus('no-lyrics');
        }
      } catch (err: unknown) {
        if (requestSeqRef.current !== currentSeq) {
          return;
        }
        console.warn('Failed to load track lyrics:', err);
        setLyricsError(err instanceof Error ? err.message : 'Failed to read lyrics file');
        setLyricsStatus('error');
      }
    },
    []
  );

  // Load lyrics when current track changes
  useEffect(() => {
    void loadLyricsForTrack(currentTrack, true);
  }, [currentTrack?.id, loadLyricsForTrack]);

  // Refresh lyrics on disk update
  useEffect(() => {
    const handleLyricsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ filePath?: string }>;
      if (!currentTrack) return;
      if (!customEvent.detail?.filePath || customEvent.detail.filePath === currentTrack.file_path) {
        void loadLyricsForTrack(currentTrack, true);
      }
    };

    window.addEventListener('endurance:lyrics-updated', handleLyricsUpdated);
    return () => window.removeEventListener('endurance:lyrics-updated', handleLyricsUpdated);
  }, [currentTrack, loadLyricsForTrack]);

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

  const handleSearchLyrics = () => {
    if (!currentTrack) return;
    if (onSearchLyrics) {
      onSearchLyrics(currentTrack);
    } else {
      window.dispatchEvent(
        new CustomEvent('endurance:open-lyrics-search', { detail: { track: currentTrack } })
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
        {/* LEFT COLUMN: Artwork & Primary Track Metadata */}
        <section
          className="main-player-left"
          aria-label="Current Song Overview"
        >
          <div className="main-player-artwork-wrap">
            {artworkDataUri ? (
              <img
                key={currentTrack.artwork_hash || currentTrack.id}
                src={artworkDataUri}
                alt={currentTrack.album || currentTrack.title}
                className="main-player-artwork-img"
              />
            ) : (
              <Music2
                size={80}
                className="main-player-artwork-fallback"
              />
            )}
          </div>

          <div
            className="main-player-meta-left motion-fade-in"
            key={currentTrack.id}
          >
            <h1 className="main-player-title-left" title={currentTrack.title}>
              {currentTrack.title}
            </h1>

            <h2 className="main-player-artist-left" title={currentTrack.artist}>
              {currentTrack.artist}
            </h2>

            {currentTrack.album && (
              <span className="main-player-album-left truncate" title={currentTrack.album}>
                {currentTrack.album}
              </span>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Synchronized Lyrics, Plain Lyrics, Loading Skeleton, Error, or Empty State */}
        <section
          className={`main-player-right ${
            lyricsStatus === 'lyrics-available' ? 'has-lyrics' : 'no-lyrics'
          }`}
          aria-label="Lyrics and Details"
        >
          {/* Loading Skeleton Placeholder (Theme-Aware, Prevents Flashing Empty State) */}
          {lyricsStatus === 'loading' && (
            <div className="lyrics-loading-skeleton motion-fade-in" aria-label="Loading lyrics">
              <div className="lyrics-skeleton-line skeleton-short" />
              <div className="lyrics-skeleton-line skeleton-medium" />
              <div className="lyrics-skeleton-line skeleton-long" />
              <div className="lyrics-skeleton-line skeleton-medium" />
              <div className="lyrics-skeleton-line skeleton-short" />
              <div className="lyrics-skeleton-line skeleton-long" />
              <div className="lyrics-skeleton-line skeleton-medium" />
            </div>
          )}

          {/* Synchronized LRC Lyrics */}
          {lyricsStatus === 'lyrics-available' && isSyncedLyrics && (
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

          {/* Plain-Text Lyrics */}
          {lyricsStatus === 'lyrics-available' && isPlainLyrics && (
            <div className="plain-lyrics-scroll-container motion-fade-in">
              {lyricsData.lines.map((line, idx) => (
                <p key={idx} className="plain-lyric-line">
                  {line}
                </p>
              ))}
            </div>
          )}

          {/* Load Error State */}
          {lyricsStatus === 'error' && (
            <div className="no-lyrics-fallback motion-fade-in">
              <div className="no-lyrics-card lyrics-error-card">
                <AlertCircle size={36} className="lyrics-error-icon" />
                <h3 className="no-lyrics-heading">Failed to Load Lyrics</h3>
                <p className="no-lyrics-description">
                  {lyricsError || 'An error occurred while reading the lyrics file.'}
                </p>
                <button
                  type="button"
                  className="main-player-collapse-btn main-player-edit-lyrics-btn"
                  onClick={() => loadLyricsForTrack(currentTrack, true)}
                  aria-label="Retry Loading Lyrics"
                >
                  <RotateCcw size={16} />
                  <span>Retry</span>
                </button>
              </div>
            </div>
          )}

          {/* Confirmed No Lyrics Available (Understated Empty State) */}
          {lyricsStatus === 'no-lyrics' && (
            <div
              className="no-lyrics-fallback motion-fade-in"
              key={currentTrack.id}
            >
              <div className="no-lyrics-card">
                <Music2 size={36} className="no-lyrics-icon" />
                <h3 className="no-lyrics-heading">No Lyrics Available</h3>
                <p className="no-lyrics-description">
                  Synchronized or plain text lyrics haven't been found for this track.
                </p>
                <div className="no-lyrics-actions">
                  <button
                    type="button"
                    className="main-player-collapse-btn main-player-search-lyrics-btn"
                    onClick={handleSearchLyrics}
                    aria-label="Search Lyrics Online"
                    title="Search Lyrics Online"
                  >
                    <Globe size={16} />
                    <span>Search Online</span>
                  </button>
                  <button
                    type="button"
                    className="main-player-collapse-btn main-player-edit-lyrics-btn"
                    onClick={handleEditLyrics}
                    aria-label="Add or Edit Lyrics"
                    title="Add or Edit Lyrics"
                  >
                    <FileEdit size={16} />
                    <span>Add or Edit Lyrics</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};