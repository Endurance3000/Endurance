import React, { useState, useEffect, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../components/Common/Button';
import { IconButton } from '../components/Common/IconButton';
import { TrackArtwork } from '../components/Library/TrackArtwork';
import {
  FolderPlus,
  Play,
  Pause,
  Shuffle,
  MoreHorizontal,
  Heart,
  Sparkles,
  Disc3,
  Music,
} from 'lucide-react';
import { Record } from '../components/Player/Record';
import { Tonearm } from '../components/Player/Tonearm';
import { PlayingBars } from '../components/Common/PlayingBars';
import { usePlayback } from '../state/PlaybackContext';
import { historyService } from '../services/history/historyService';
import { libraryService } from '../services/library/libraryService';
import { lyricsService } from '../services/lyrics/lyricsService';
import { ParsedLyrics } from '../services/lyrics/lrcParser';
import {
  getClampedAmbientColor,
  DEFAULT_AMBIENT,
  ClampedAmbientColor,
} from '../services/artwork/ambientClampedColor';
import { selectEditorialLyricLine } from '../utils/editorialLyrics';
import { getFormatStamp } from '../utils/formatStamp';
import { SongActionMenu } from '../components/Common/SongActionMenu';
import { formatDuration, formatRelativeDate } from '../utils/formatters';
import { Track, LibraryFolder, HistoryItem } from '../types';
import './Pages.css';

interface HomeProps {
  tracks: Track[];
  folders: LibraryFolder[];
  onNavigateSongs: () => void;
  onAddFolder: () => Promise<void>;
}

export const Home: React.FC<HomeProps> = ({
  tracks,
  folders: _folders,
  onNavigateSongs,
  onAddFolder,
}) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playbackQueue,
    currentIndex,
    nextTrack,
    playTrack,
    togglePlay,
    toggleShuffle,
    shuffleEnabled,
  } = usePlayback();

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [heroArtworkUri, setHeroArtworkUri] = useState<string | null>(null);
  const [heroLyrics, setHeroLyrics] = useState<ParsedLyrics | null>(null);
  const [ambientLighting, setAmbientLighting] = useState<ClampedAmbientColor>(DEFAULT_AMBIENT);
  const [localFavorites, setLocalFavorites] = useState<Record<string, boolean>>({});

  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Subscribe to playback history
  useEffect(() => {
    const unsub = historyService.subscribe(setHistoryItems);
    historyService.getHistory(20);
    return unsub;
  }, []);

  // Deduplicate history items for recent listening (up to 8 items)
  const recentHistoryTracks = useMemo(() => {
    const list: Track[] = [];
    const seenIds = new Set<string>();
    for (const item of historyItems) {
      if (!seenIds.has(item.track.id)) {
        seenIds.add(item.track.id);
        list.push(item.track);
        if (list.length >= 8) break;
      }
    }
    return list;
  }, [historyItems]);

  // Recently added tracks (sorted by date_added desc, capped at 6)
  const recentTracks = useMemo(() => {
    return [...tracks]
      .sort(
        (a, b) =>
          (parseInt(b.date_added, 10) || 0) -
          (parseInt(a.date_added, 10) || 0)
      )
      .slice(0, 6);
  }, [tracks]);

  // Spotlight / Hero Track selection:
  // 1. Current active track if playing/paused
  // 2. Or latest played track from history
  // 3. Or most recently added track
  // 4. Or first available library track
  const heroTrack = useMemo(() => {
    return (
      currentTrack ||
      recentHistoryTracks[0] ||
      recentTracks[0] ||
      tracks[0] ||
      null
    );
  }, [currentTrack, recentHistoryTracks, recentTracks, tracks]);

  // Load high-resolution artwork URI for the hero spotlight & ambient glow
  useEffect(() => {
    let isMounted = true;
    if (!heroTrack?.artwork_hash) {
      setHeroArtworkUri(null);
      return;
    }
    libraryService.getTrackArtwork(heroTrack.artwork_hash).then((uri) => {
      if (isMounted) setHeroArtworkUri(uri || null);
    });
    return () => {
      isMounted = false;
    };
  }, [heroTrack?.artwork_hash]);

  // Load lyrics for the hero track
  useEffect(() => {
    let isMounted = true;
    if (!heroTrack?.file_path) {
      setHeroLyrics(null);
      return;
    }
    lyricsService.getLyrics(heroTrack.file_path).then((parsed) => {
      if (isMounted) setHeroLyrics(parsed);
    });
    return () => {
      isMounted = false;
    };
  }, [heroTrack?.file_path]);

  // Calculate clamped ambient lighting
  useEffect(() => {
    let isMounted = true;
    if (!heroArtworkUri) {
      setAmbientLighting(DEFAULT_AMBIENT);
      return;
    }
    getClampedAmbientColor(heroArtworkUri, heroTrack?.artwork_hash).then((clamped) => {
      if (isMounted) setAmbientLighting(clamped);
    });
    return () => {
      isMounted = false;
    };
  }, [heroArtworkUri, heroTrack?.artwork_hash]);

  const isCurrentTrackHero = currentTrack?.id === heroTrack?.id;
  const isHeroPlaying = isCurrentTrackHero && isPlaying;
  const isHeroFavorite = heroTrack
    ? localFavorites[heroTrack.id] ?? heroTrack.is_favorite
    : false;

  // Up next track in queue (Phase 2.10)
  const nextTrackInQueue = useMemo(() => {
    if (currentIndex >= 0 && currentIndex + 1 < playbackQueue.length) {
      return playbackQueue[currentIndex + 1];
    }
    return null;
  }, [currentIndex, playbackQueue]);

  // Single editorial lyric line (Phase 2.7)
  const editorialLyric = useMemo(() => {
    return selectEditorialLyricLine(
      heroLyrics,
      isCurrentTrackHero ? currentTime : 0,
      isHeroPlaying
    );
  }, [heroLyrics, isCurrentTrackHero, currentTime, isHeroPlaying]);

  // Container & bitrate stamp (Phase 2.9)
  const formatStamp = useMemo(() => {
    return getFormatStamp(heroTrack);
  }, [heroTrack]);

  const handleHeroPlayClick = () => {
    if (!heroTrack) return;
    if (isCurrentTrackHero) {
      togglePlay();
    } else {
      playTrack(heroTrack, tracks);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    try {
      const newState = await invoke<boolean>('toggle_track_favorite', {
        trackId: track.id,
      });
      setLocalFavorites((prev) => ({ ...prev, [track.id]: newState }));
    } catch (err) {
      console.warn('Could not toggle favorite:', err);
    }
  };

  const handleOpenMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    track: Track
  ) => {
    e.preventDefault();
    e.stopPropagation();

    menuTriggerRef.current = e.currentTarget;
    const rect = e.currentTarget.getBoundingClientRect();

    setMenuPosition({
      x: rect.right,
      y: rect.bottom + 4,
    });

    setMenuTrack(track);
  };

  const handleContextMenu = (
    e: React.MouseEvent<HTMLElement>,
    track: Track
  ) => {
    e.preventDefault();
    menuTriggerRef.current = null;
    setMenuPosition({
      x: e.clientX,
      y: e.clientY,
    });
    setMenuTrack(track);
  };

  // =========================================================================
  // STATE 1: EMPTY LIBRARY (Artistic Sanctuary Awaiting Music)
  // =========================================================================
  if (tracks.length === 0) {
    return (
      <div className="home-super-container motion-fade-in">
        <div className="home-empty-stage">
          <div className="home-empty-sculpture" aria-hidden="true">
            <div className="home-empty-disc">
              <div className="home-empty-grooves" />
              <div className="home-empty-center-hole">
                <Music size={36} className="home-empty-note-icon" />
              </div>
            </div>
            <div className="home-empty-aura" />
          </div>

          <div className="home-empty-editorial">
            <div className="home-empty-pill">
              <Sparkles size={13} /> OFFLINE AUDIO SANCTUARY
            </div>

            <h1 className="home-empty-title">
              Your Music Sanctuary is Ready
            </h1>

            <p className="home-empty-lead">
              Endurance is designed exclusively for your offline local audio collection. Connect your music folders to index, stream, and experience your library with pure local fidelity.
            </p>

            <div className="home-empty-actions">
              <Button
                variant="filled"
                icon={<FolderPlus size={18} />}
                onClick={onAddFolder}
                className="home-empty-cta-btn"
              >
                Import Music Folder
              </Button>
            </div>

            <div className="home-empty-feature-row">
              <div className="home-empty-feature-badge">
                <Disc3 size={15} />
                <span>FLAC, WAV, MP3, M4A, AAC, OGG & AIFF</span>
              </div>
              <div className="home-empty-feature-badge">
                <Sparkles size={15} />
                <span>Synchronized LRC & Dynamic Themes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE 2: POPULATED LIBRARY (THE RECORD ROOM EXPERIENCE)
  // =========================================================================
  return (
    <div className="home-super-container motion-fade-in">
      {/* ---------------------------------------------------------------------
          HERO BLEED STAGE: 3-Zone Composition (Sleeve — Type — The Record)
          --------------------------------------------------------------------- */}
      {heroTrack && (
        <section className="home-hero-bleed-stage" key={heroTrack.id}>
          {/* Dual-Layer Clamped Ambient Lighting (Phase 2.5) */}
          <div
            className="home-hero-ambient-wide"
            style={ambientLighting.wideGlowStyle}
            aria-hidden="true"
          />
          <div
            className="home-hero-ambient-floor"
            style={ambientLighting.floorGlowStyle}
            aria-hidden="true"
          />

          <div className="home-hero-composition">
            {/* ZONE 1: Sleeve (400px) + Up Next (Phase 2.4 & 2.10) */}
            <div className="home-hero-zone-sleeve">
              <div
                className={`home-hero-sleeve ${isHeroPlaying ? 'is-playing' : ''}`}
                onClick={handleHeroPlayClick}
                onContextMenu={(e) => handleContextMenu(e, heroTrack)}
                role="button"
                tabIndex={0}
                aria-label={`${isHeroPlaying ? 'Pause' : 'Play'} ${heroTrack.title}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleHeroPlayClick();
                  }
                }}
              >
                {heroArtworkUri ? (
                  <img
                    src={heroArtworkUri}
                    alt={heroTrack.title}
                    className="home-hero-sleeve-img"
                  />
                ) : (
                  <div className="home-hero-sleeve-placeholder">
                    <Disc3 size={80} className="home-placeholder-icon" />
                  </div>
                )}
                {/* Sleeve Realism Overlays */}
                <div className="home-hero-sleeve-spine" aria-hidden="true" />
                <div className="home-hero-sleeve-grain" aria-hidden="true" />
                <div className="home-hero-sleeve-hairline" aria-hidden="true" />
              </div>

              {/* Up Next Line (Phase 2.10) */}
              {nextTrackInQueue && (
                <button
                  type="button"
                  className="home-hero-up-next"
                  onClick={() => nextTrack()}
                  title={`Next: ${nextTrackInQueue.title} — ${nextTrackInQueue.artist}`}
                >
                  <Play size={11} fill="currentColor" className="home-up-next-glyph" />
                  <span className="home-up-next-tag">Next:</span>
                  <span className="home-up-next-title">{nextTrackInQueue.title}</span>
                </button>
              )}
            </div>

            {/* ZONE 2: Editorial Type Block (Bottom-aligned, Phase 2.6) */}
            <div className="home-hero-zone-type">
              {/* 1. Artist (Small, above, sans) */}
              <div className="home-hero-type-artist">{heroTrack.artist}</div>

              {/* 2. Title (Fraunces Display, max 2 lines) */}
              <h1
                className="home-hero-type-title"
                title={heroTrack.title}
                onClick={handleHeroPlayClick}
              >
                {heroTrack.title}
              </h1>

              {/* 3. Album (Separate line, no middle dot) */}
              <div className="home-hero-type-album" title={heroTrack.album}>
                {heroTrack.album}
              </div>

              {/* 4. The Lyric Line (Phase 2.7) */}
              {editorialLyric && (
                <div className="home-hero-lyric-line" title={editorialLyric}>
                  &ldquo;{editorialLyric}&rdquo;
                </div>
              )}

              {/* 5. Actions Deck (Phase 2.8) */}
              <div className="home-hero-actions-deck">
                <button
                  type="button"
                  className="home-hero-primary-play"
                  onClick={handleHeroPlayClick}
                  aria-label={isHeroPlaying ? 'Pause' : 'Play'}
                >
                  {isHeroPlaying ? (
                    <Pause size={18} fill="currentColor" />
                  ) : (
                    <Play size={18} fill="currentColor" />
                  )}
                  <span>{isHeroPlaying ? 'Pause' : 'Play'}</span>
                </button>

                <div className="home-hero-actions-group">
                  <IconButton
                    icon={
                      <Heart
                        size={18}
                        fill={isHeroFavorite ? 'currentColor' : 'none'}
                        color={
                          isHeroFavorite
                            ? 'var(--accent-bright)'
                            : 'currentColor'
                        }
                      />
                    }
                    aria-label={
                      isHeroFavorite
                        ? 'Remove from favorites'
                        : 'Add to favorites'
                    }
                    tooltip={
                      isHeroFavorite
                        ? 'In favorites'
                        : 'Add to favorites'
                    }
                    onClick={(e) => handleToggleFavorite(e, heroTrack)}
                    className="home-hero-ghost-btn"
                  />
                  <IconButton
                    icon={<Shuffle size={18} />}
                    aria-label={shuffleEnabled ? 'Disable shuffle' : 'Enable shuffle'}
                    tooltip={shuffleEnabled ? 'Shuffle on' : 'Shuffle'}
                    color={shuffleEnabled ? 'var(--accent-bright)' : 'currentColor'}
                    onClick={() => toggleShuffle()}
                    className="home-hero-ghost-btn"
                  />
                  <IconButton
                    icon={<MoreHorizontal size={18} />}
                    aria-label="Track options"
                    tooltip="More options"
                    onClick={(e) => handleOpenMenu(e, heroTrack)}
                    className="home-hero-ghost-btn"
                  />
                </div>
              </div>

              {/* 6. The Format Stamp (Phase 2.9) */}
              {formatStamp && (
                <div className="home-hero-format-stamp" title="Audio Format & Bitrate">
                  <span>{formatStamp}</span>
                </div>
              )}
            </div>

            {/* ZONE 3: The Record & Tonearm (Phase 1 & 2.3) */}
            <div className="home-hero-zone-record">
              <Record
                isPlaying={isHeroPlaying}
                artworkHash={heroTrack.artwork_hash}
                artworkUrl={heroArtworkUri}
                album={heroTrack.album}
                artist={heroTrack.artist}
                title={heroTrack.title}
                labelColor={ambientLighting.labelColor}
                className="home-hero-record-disc"
              />
              <Tonearm
                currentTime={isCurrentTrackHero ? currentTime : 0}
                duration={isCurrentTrackHero ? duration : 0}
                isPlaying={isHeroPlaying}
                className="home-hero-tonearm"
              />
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------------
          LOWER TWO-COLUMN LAYOUT: Just added & Back in rotation (Phase 3)
          --------------------------------------------------------------------- */}
      <section className="home-rhythm-section">
        <div className="home-rhythm-grid">
          {/* LEFT COLUMN: Just added (Grid of square sleeves, Phase 3.1 & 3.2) */}
          <div className="home-rhythm-left">
            <div className="home-section-header">
              <h2 className="home-section-heading">Just added</h2>
              <button
                className="home-section-link"
                onClick={onNavigateSongs}
              >
                See all
              </button>
            </div>

            <div className="home-added-grid">
              {recentTracks.map((track, idx) => {
                const isItemPlaying = isPlaying && currentTrack?.id === track.id;
                const relativeDate = formatRelativeDate(track.date_added);
                const isRotatedEven = idx % 2 === 0;

                return (
                  <div
                    key={track.id}
                    className={`home-added-card ${isRotatedEven ? 'tilt-left' : 'tilt-right'} ${
                      isItemPlaying ? 'is-playing' : ''
                    }`}
                    onClick={() => playTrack(track, recentTracks)}
                    onContextMenu={(e) => handleContextMenu(e, track)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Play ${track.title} by ${track.artist}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        playTrack(track, recentTracks);
                      }
                    }}
                  >
                    {/* Square Sleeve with depth stagger */}
                    <div className="home-added-sleeve">
                      <TrackArtwork
                        artworkHash={track.artwork_hash}
                        alt={track.title}
                        size="lg"
                      />
                      <div
                        className={`home-added-play-pill ${
                          isItemPlaying ? 'is-active' : ''
                        }`}
                      >
                        {isItemPlaying ? (
                           <Pause size={18} fill="currentColor" />
                        ) : (
                          <Play size={18} fill="currentColor" />
                        )}
                      </div>
                    </div>

                    {/* Title & Artist & Date BELOW artwork (no pill over art) */}
                    <div className="home-added-meta">
                      <div className="home-added-title truncate" title={track.title}>
                        {track.title}
                      </div>
                      <div className="home-added-meta-row">
                        <span className="home-added-artist truncate" title={track.artist}>
                          {track.artist}
                        </span>
                        {relativeDate && (
                          <span className="home-added-date">
                            · {relativeDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Back in rotation + Library Footer (Phase 3.1 & 3.3) */}
          <div className="home-rhythm-right">
            <div className="home-section-header">
              <h2 className="home-section-heading">Back in rotation</h2>
              <button
                className="home-section-link"
                onClick={onNavigateSongs}
              >
                See all
              </button>
            </div>

            <div className="home-rotation-list">
              {recentHistoryTracks.map((track) => {
                const isItemPlaying = isPlaying && currentTrack?.id === track.id;
                const isItemFav = localFavorites[track.id] ?? track.is_favorite;

                return (
                  <div
                    key={track.id}
                    className={`home-rotation-row ${
                      isItemPlaying ? 'is-playing' : ''
                    }`}
                    onClick={() => playTrack(track, recentHistoryTracks)}
                    onContextMenu={(e) => handleContextMenu(e, track)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Play ${track.title} by ${track.artist}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        playTrack(track, recentHistoryTracks);
                      }
                    }}
                  >
                    {/* 40px Sleeve with PlayingBars when active */}
                    <div className="home-rotation-art-wrap">
                      <TrackArtwork
                        artworkHash={track.artwork_hash}
                        alt={track.title}
                        size="sm"
                      />
                      {isItemPlaying ? (
                        <div className="home-rotation-playing-indicator">
                          <PlayingBars isPlaying={isPlaying} size="sm" />
                        </div>
                      ) : (
                        <div className="home-rotation-hover-play">
                          <Play size={12} fill="currentColor" />
                        </div>
                      )}
                    </div>

                    <div className="home-rotation-info">
                      <div className="home-rotation-title truncate" title={track.title}>
                        {track.title}
                      </div>
                      <div className="home-rotation-artist truncate" title={track.artist}>
                        {track.artist}
                      </div>
                    </div>

                    <span className="home-rotation-duration">
                      {formatDuration(track.duration)}
                    </span>

                    <div className="home-rotation-actions">
                      <IconButton
                        icon={
                          <Heart
                            size={14}
                            fill={isItemFav ? 'currentColor' : 'none'}
                            color={
                              isItemFav
                                ? 'var(--accent-bright)'
                                : 'currentColor'
                            }
                          />
                        }
                        aria-label={
                          isItemFav ? 'Remove favorite' : 'Add favorite'
                        }
                        onClick={(e) => handleToggleFavorite(e, track)}
                        className="home-rotation-action-btn"
                      />
                      <IconButton
                        icon={<MoreHorizontal size={14} />}
                        aria-label="Track options"
                        onClick={(e) => handleOpenMenu(e, track)}
                        className="home-rotation-action-btn"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Library Footer Block (Phase 3.1 & 3.4) */}
            <div className="home-library-footer-card">
              <div className="home-library-footer-text">
                <div className="home-library-footer-title">Your library</div>
                <div className="home-library-footer-count">{tracks.length} songs</div>
              </div>
              <Button
                variant="outlined"
                onClick={onNavigateSongs}
                className="home-library-browse-btn"
              >
                Browse library
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Track Action Context Menu */}
      {menuTrack && (
        <SongActionMenu
          track={menuTrack}
          isOpen={Boolean(menuTrack)}
          position={menuPosition}
          onClose={() => setMenuTrack(null)}
          triggerRef={menuTriggerRef}
        />
      )}
    </div>
  );
};

export default Home;