import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Music2 } from 'lucide-react';
import { usePlayback } from '../../state/PlaybackContext';
import { lyricsService } from '../../services/lyrics/lyricsService';
import { findActiveLyricIndex, ParsedLyrics } from '../../services/lyrics/lrcParser';
import { libraryService } from '../../services/library/libraryService';
import './MainPlayer.css';

interface MainPlayerProps {
  onClose: () => void;
}

export const MainPlayer: React.FC<MainPlayerProps> = ({ onClose }) => {
  const { currentTrack, currentTime, seek } = usePlayback();
  const [lyricsData, setLyricsData] = useState<ParsedLyrics>({ type: 'none' });
  const [artworkDataUri, setArtworkDataUri] = useState<string | null>(null);

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Load lyrics when current track changes
  useEffect(() => {
    let isMounted = true;
    if (!currentTrack) {
      setLyricsData({ type: 'none' });
      return;
    }

    lyricsService.getLyrics(currentTrack.file_path, true).then((loaded) => {
      if (isMounted) {
        setLyricsData(loaded);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentTrack]);

  // Load high-res artwork data URI
  useEffect(() => {
    let isMounted = true;
    if (!currentTrack?.artwork_hash) {
      setArtworkDataUri(null);
      return;
    }

    libraryService.getTrackArtwork(currentTrack.artwork_hash).then((uri) => {
      if (isMounted) {
        setArtworkDataUri(uri);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentTrack]);

  const isNoLyrics = lyricsData.type === 'none';
  const isPlainLyrics = lyricsData.type === 'plain';
  const isSyncedLyrics = lyricsData.type === 'synced';
  const hasLyrics = !isNoLyrics;

  // Determine active lyric index only for synced lyrics
  const activeIndex = isSyncedLyrics ? findActiveLyricIndex(lyricsData.lines, currentTime) : -1;

  // Smoothly center the active lyric line in the scroll container for synced lyrics
  useEffect(() => {
    if (isSyncedLyrics && activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, isSyncedLyrics]);

  // Escape key listener to close full player view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!currentTrack) {
    return null;
  }

  return (
    <div className="main-player-overlay" role="region" aria-label="Now Playing Main View">
      {/* Top Bar with Collapse Action */}
      <header className="main-player-topbar">
        <button
          type="button"
          className="main-player-collapse-btn"
          onClick={onClose}
          aria-label="Collapse to Library"
          title="Collapse to Library (Esc)"
        >
          <ChevronDown size={18} />
          <span>Collapse</span>
        </button>
      </header>

      {/* Main 2-Column Body */}
      <div className={`main-player-body ${hasLyrics ? 'has-lyrics' : 'no-lyrics'}`}>
        {/* LEFT COLUMN: Large Artwork (expands larger when lyrics are unavailable) */}
        <section className={`main-player-left ${hasLyrics ? 'has-lyrics' : 'no-lyrics'}`} aria-label="Current Song Overview">
          <div className={`main-player-artwork-wrap ${hasLyrics ? 'artwork-standard' : 'artwork-expanded'}`}>
            {artworkDataUri ? (
              <img
                src={artworkDataUri}
                alt={currentTrack.album || currentTrack.title}
                className="main-player-artwork-img"
              />
            ) : (
              <Music2 size={hasLyrics ? 88 : 120} className="main-player-artwork-fallback" />
            )}
          </div>

          {/* Title and artist underneath artwork ONLY rendered when lyrics ARE available (plain or synced) */}
          {hasLyrics && (
            <div className="main-player-meta-left motion-fade-in">
              <h1 className="main-player-title-left">{currentTrack.title}</h1>
              <h2 className="main-player-artist-left">{currentTrack.artist}</h2>
              {currentTrack.album && (
                <span className="main-player-album-left">{currentTrack.album}</span>
              )}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: 3 Mutually Exclusive States */}
        <section className={`main-player-right ${hasLyrics ? 'has-lyrics' : 'no-lyrics'}`} aria-label="Lyrics and Details">
          {/* STATE 3: Synchronized LRC Lyrics with click-to-seek, emphasis, and smooth scroll */}
          {isSyncedLyrics && (
            <div className="lyrics-scroll-container" ref={scrollContainerRef}>
              {lyricsData.lines.map((line, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={`${line.time}_${idx}`}
                    ref={isActive ? activeLineRef : null}
                    className={`lyric-line ${isActive ? 'active' : ''}`}
                    onClick={() => seek(line.time)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') seek(line.time);
                    }}
                    title={`Seek to ${line.time.toFixed(1)}s`}
                  >
                    {line.text || '♪'}
                  </div>
                );
              })}
            </div>
          )}

          {/* STATE 2: Plain-Text Lyrics (Scrollable, full text, no fake sync or timing) */}
          {isPlainLyrics && (
            <div className="plain-lyrics-scroll-container motion-fade-in">
              {lyricsData.lines.map((line, idx) => (
                <p key={idx} className="plain-lyric-line">
                  {line}
                </p>
              ))}
            </div>
          )}

          {/* STATE 1: No Lyrics File Available (Prominent Title + Artist Showcase on right) */}
          {isNoLyrics && (
            <div className="no-lyrics-fallback motion-fade-in">
              <div className="no-lyrics-title">{currentTrack.title}</div>
              <div className="no-lyrics-artist">{currentTrack.artist}</div>
              {currentTrack.album && (
                <div className="no-lyrics-album">{currentTrack.album}</div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
