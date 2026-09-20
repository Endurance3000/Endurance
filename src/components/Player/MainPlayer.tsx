import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Music2, FileEdit } from 'lucide-react';
import { Track } from '../../types';
import { usePlayback } from '../../state/PlaybackContext';
import { lyricsService } from '../../services/lyrics/lyricsService';
import { findActiveLyricIndex, ParsedLyrics } from '../../services/lyrics/lrcParser';
import { libraryService } from '../../services/library/libraryService';
import { Record } from './Record';
import { Tonearm } from './Tonearm';
import { EmptyState } from '../Common/EmptyState';
import {
  getClampedAmbientColor,
  DEFAULT_AMBIENT,
  ClampedAmbientColor,
} from '../../services/artwork/ambientClampedColor';
import './MainPlayer.css';

interface MainPlayerProps {
  onClose: () => void;
  onEditLyrics?: (track: Track) => void;
}

export const MainPlayer: React.FC<MainPlayerProps> = ({ onClose, onEditLyrics }) => {
  const { currentTrack, isPlaying, currentTime, duration, seek } = usePlayback();
  const [lyricsData, setLyricsData] = useState<ParsedLyrics>({ type: 'none' });
  const [artworkDataUri, setArtworkDataUri] = useState<string | null>(null);
  const [ambientLighting, setAmbientLighting] = useState<ClampedAmbientColor>(DEFAULT_AMBIENT);

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

  // Calculate clamped ambient lighting from artwork
  useEffect(() => {
    let isMounted = true;
    if (!artworkDataUri) {
      setAmbientLighting(DEFAULT_AMBIENT);
      return;
    }

    getClampedAmbientColor(artworkDataUri, currentTrack?.artwork_hash).then((clamped) => {
      if (isMounted) {
        setAmbientLighting(clamped);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [artworkDataUri, currentTrack?.artwork_hash]);

  const isNoLyrics = lyricsData.type === 'none';
  const isPlainLyrics = lyricsData.type === 'plain';
  const isSyncedLyrics = lyricsData.type === 'synced';

  // Determine active lyric index only for synced lyrics
  const activeIndex = isSyncedLyrics
    ? findActiveLyricIndex(lyricsData.lines, currentTime)
    : -1;

  // Smoothly center the active lyric line in the scroll container for synced lyrics
  useEffect(() => {
    if (
      isSyncedLyrics &&
      activeLineRef.current &&
      scrollContainerRef.current
    ) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      activeLineRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
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
      className="main-player-overlay"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Now Playing Expanded View"
    >
      {/* Dynamic Clamped Ambient Lighting Aura Glow */}
      <div
        className="main-player-ambient-wide"
        style={ambientLighting.wideGlowStyle}
        aria-hidden="true"
      />
      <div
        className="main-player-ambient-floor"
        style={ambientLighting.floorGlowStyle}
        aria-hidden="true"
      />

      {/* 8.5 Header: 64px Top Bar */}
      <header className="main-player-topbar">
        <button
          ref={closeButtonRef}
          type="button"
          className="main-player-ghost-btn"
          onClick={onClose}
          aria-label="Collapse to Library"
          title="Collapse to Library (Esc)"
        >
          <ChevronDown size={18} className="collapse-icon" />
          <span>Collapse</span>
        </button>

        <button
          type="button"
          className="main-player-ghost-btn main-player-edit-lyrics-btn"
          onClick={handleEditLyrics}
          aria-label="Edit Lyrics"
          title="Edit Lyrics"
        >
          <FileEdit size={16} />
          <span>Edit lyrics</span>
        </button>
      </header>

      {/* 8.4 Balance the Halves: 2-Column Master Body */}
      <div className="main-player-body">
        {/* LEFT COLUMN: Mirrored Record Backdrop + Sleeve + Metadata */}
        <section
          className="main-player-left"
          aria-label="Current Song Overview"
        >
          {/* 8.1 Mirrored Record & Tonearm Backdrop (60% opacity) */}
          <div className="main-player-record-stage" aria-hidden="true">
            <Record
              isPlaying={isPlaying}
              artworkHash={currentTrack.artwork_hash}
              artworkUrl={artworkDataUri}
              album={currentTrack.album}
              artist={currentTrack.artist}
              title={currentTrack.title}
              labelColor={ambientLighting.labelColor}
              className="main-player-record-disc"
            />
            <Tonearm
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              className="main-player-tonearm"
            />
          </div>

          {/* Sleeve & Meta Lockup (Vertically centered) */}
          <div className="main-player-sleeve-meta-lockup">
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
                  size={88}
                  className="main-player-artwork-fallback"
                />
              )}
            </div>

            <div
              className="main-player-meta motion-fade-in"
              key={currentTrack.id}
            >
              <h1 className="main-player-title" title={currentTrack.title}>
                {currentTrack.title}
              </h1>

              <div className="main-player-artist" title={currentTrack.artist}>
                {currentTrack.artist}
              </div>

              {currentTrack.album && (
                <div className="main-player-album" title={currentTrack.album}>
                  {currentTrack.album}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Lyrics & Details (Max width 620px) */}
        <section
          className="main-player-right"
          aria-label="Lyrics and Details"
        >
          <div className="main-player-right-inner">
            {/* STATE 1: Synchronized LRC Lyrics */}
            {isSyncedLyrics && (
              <div
                className="lyrics-scroll-container"
                ref={scrollContainerRef}
                data-testid="lyrics-scroll-container"
              >
                {lyricsData.lines.map((line, idx) => {
                  const isActive = idx === activeIndex;
                  const isAdjacent = Math.abs(idx - activeIndex) === 1;

                  return (
                    <div
                      key={`${line.time}_${idx}`}
                      ref={isActive ? activeLineRef : null}
                      className={`lyric-line ${
                        isActive ? 'active' : isAdjacent ? 'adjacent' : 'inactive'
                      }`}
                      onClick={() => seek(line.time)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          seek(line.time);
                        }
                      }}
                      title={`Seek to ${line.time.toFixed(1)}s`}
                      data-active={isActive ? 'true' : 'false'}
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

            {/* STATE 3: No Lyrics Available — Centred EmptyState (Phase 8.6) */}
            {isNoLyrics && (
              <div className="main-player-no-lyrics-container motion-fade-in">
                <EmptyState
                  icon={<Music2 size={36} />}
                  title="No lyrics found"
                  description="Synchronized lyrics (.lrc) for this song were not found in your audio folder."
                  actionLabel="Add lyrics"
                  actionIcon={<FileEdit size={16} />}
                  actionVariant="outlined"
                  onAction={handleEditLyrics}
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MainPlayer;