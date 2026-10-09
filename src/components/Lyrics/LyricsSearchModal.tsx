import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  X,
  Loader2,
  AlertCircle,
  Music2,
  FileQuestion,
  Clock,
  Globe,
  Save,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Track } from '../../types';
import { Button } from '../Common/Button';
import { IconButton } from '../Common/IconButton';
import { lyricsService } from '../../services/lyrics/lyricsService';
import { parseLrc, ParsedLyrics } from '../../services/lyrics/lrcParser';
import {
  lyricsOnlineService,
  ScoredLyricsResult,
} from '../../services/lyrics/lyricsOnlineService';
import { LyricsProviderError } from '../../services/lyrics/providers/types';
import './LyricsSearchModal.css';

export interface LyricsSearchModalProps {
  track: Track;
  onClose: () => void;
  onSaved?: () => void;
}

export const LyricsSearchModal: React.FC<LyricsSearchModalProps> = ({
  track,
  onClose,
  onSaved,
}) => {
  const initialQuery = `${track.title || ''} ${track.artist || ''}`.trim() || track.file_name || '';
  const [query, setQuery] = useState<string>(initialQuery);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ScoredLyricsResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const [error, setError] = useState<{ message: string; code?: string; retryAfter?: number } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Focus & Accessibility Refs
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Capture opener focus
  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      openerRef.current?.focus();
    };
  }, []);

  const handleSearch = useCallback(
    async (searchQueryString: string) => {
      const q = searchQueryString.trim();
      if (!q) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      // Abort any in-flight search
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);
      setSaveError(null);
      setHasSearched(true);

      try {
        const scoredResults = await lyricsOnlineService.searchLyrics(track, {
          customQuery: q,
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setResults(scoredResults);
          setSelectedIndex(0);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        if (err instanceof LyricsProviderError) {
          if (err.code === 'CANCELLED') return;

          if (err.code === 'RATE_LIMITED') {
            setError({
              code: 'RATE_LIMITED',
              message: `Rate limit reached. Please wait ${err.retryAfterSeconds ? `${err.retryAfterSeconds}s` : 'a moment'} before searching again.`,
              retryAfter: err.retryAfterSeconds,
            });
          } else if (err.code === 'TIMEOUT') {
            setError({
              code: 'TIMEOUT',
              message: 'Search timed out. The lyrics service took too long to respond.',
            });
          } else if (err.code === 'NETWORK_ERROR') {
            setError({
              code: 'NETWORK_ERROR',
              message: 'Network error. Please check your internet connection and try again.',
            });
          } else {
            setError({
              code: err.code,
              message: err.message || 'An error occurred while fetching online lyrics.',
            });
          }
        } else {
          setError({
            message: err instanceof Error ? err.message : 'Failed to perform online lyrics search.',
          });
        }
        setResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [track]
  );

  // Auto-search on mount
  useEffect(() => {
    if (initialQuery) {
      void handleSearch(initialQuery);
    }
  }, [handleSearch, initialQuery]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSearch(query);
  };

  const selectedItem: ScoredLyricsResult | undefined = results[selectedIndex];

  // Parse preview lyrics
  let previewParsed: ParsedLyrics = { type: 'none' };
  if (selectedItem?.candidate) {
    if (selectedItem.candidate.syncedLyrics) {
      previewParsed = parseLrc(selectedItem.candidate.syncedLyrics);
    } else if (selectedItem.candidate.plainLyrics) {
      previewParsed = parseLrc(selectedItem.candidate.plainLyrics);
    }
  }

  // Save selected lyrics to local .lrc
  const handleSave = async () => {
    if (!selectedItem || !selectedItem.candidate.hasUsableLyrics || isSaving) {
      return;
    }

    const candidate = selectedItem.candidate;
    const content = candidate.syncedLyrics || candidate.plainLyrics || '';
    if (!content.trim()) {
      setSaveError('Selected item has no usable lyric text to save.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Phase 1 Rust command
      await invoke('create_lrc_sidecar', {
        trackFilePath: track.file_path,
        content,
      });

      // Clear local memory cache
      lyricsService.clearCache();

      // Dispatch global refresh event
      window.dispatchEvent(
        new CustomEvent('endurance:lyrics-updated', {
          detail: { filePath: track.file_path },
        })
      );

      if (onSaved) {
        onSaved();
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already has a resolved lyrics file') || msg.includes('already exists')) {
        setSaveError('A local lyrics file is already present or was created for this track.');
      } else {
        setSaveError(msg || 'Failed to save lyrics file to disk.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard navigation & Dialog dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        if (results.length > 0 && document.activeElement !== searchInputRef.current) {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : prev));
        }
      } else if (e.key === 'ArrowUp') {
        if (results.length > 0 && document.activeElement !== searchInputRef.current) {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, results.length]);

  return (
    <div
      className="lyrics-search-modal-backdrop motion-fade-in"
      onClick={(e) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node) && !isSaving) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="lyrics-search-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Search Lyrics Online"
      >
        {/* HEADER */}
        <header className="lyrics-search-header">
          <div className="lyrics-search-header-title-wrap">
            <div className="lyrics-search-badge">
              <Globe size={14} />
              <span>Online Lyrics</span>
            </div>
            <h2 className="lyrics-search-title">Search Lyrics Online</h2>
            <p className="lyrics-search-subtitle truncate" title={`${track.title} • ${track.artist}`}>
              {track.title} &bull; {track.artist}
            </p>
          </div>

          <IconButton
            icon={<X size={18} />}
            aria-label="Close"
            variant="standard"
            size="md"
            onClick={onClose}
          />
        </header>

        {/* SEARCH BAR */}
        <form className="lyrics-search-form" onSubmit={handleFormSubmit}>
          <div className="lyrics-search-input-wrapper">
            <Search size={18} className="lyrics-search-input-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="lyrics-search-input"
              placeholder="Search by title, artist, or keywords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isSaving}
            />
            {query.length > 0 && (
              <button
                type="button"
                className="lyrics-search-clear-btn"
                onClick={() => {
                  setQuery('');
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <Button
            type="submit"
            variant="filled"
            size="md"
            icon={isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            disabled={isLoading || isSaving || !query.trim()}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </form>

        {/* ERROR BANNERS */}
        {error && (
          <div className="lyrics-search-banner lyrics-search-banner-error">
            <div className="lyrics-search-banner-content">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error.message}</span>
            </div>
            <Button
              variant="tonal"
              size="sm"
              icon={<RotateCcw size={13} />}
              onClick={() => handleSearch(query)}
            >
              Retry
            </Button>
          </div>
        )}

        {saveError && (
          <div className="lyrics-search-banner lyrics-search-banner-conflict">
            <div className="lyrics-search-banner-content">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span>{saveError}</span>
            </div>
          </div>
        )}

        {/* BODY (MASTER-DETAIL LAYOUT) */}
        <div className="lyrics-search-body">
          {isLoading && (
            <div className="lyrics-search-status-view">
              <Loader2 size={36} className="animate-spin lyrics-search-spinner" />
              <p className="lyrics-search-status-text">Searching LRCLIB for matches...</p>
            </div>
          )}

          {!isLoading && hasSearched && results.length === 0 && !error && (
            <div className="lyrics-search-status-view">
              <FileQuestion size={44} className="lyrics-search-status-icon" />
              <h3 className="lyrics-search-status-title">No Lyrics Found</h3>
              <p className="lyrics-search-status-desc">
                No matches were found for &ldquo;{query}&rdquo;. Try simplifying your search query or searching by track title only.
              </p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="lyrics-search-split-view">
              {/* LEFT COLUMN: CANDIDATE LIST */}
              <div className="lyrics-search-list-column" role="listbox" aria-label="Search results">
                <div className="lyrics-search-list-header">
                  <span>{results.length} {results.length === 1 ? 'match' : 'matches'} found</span>
                  <span className="lyrics-search-list-hint">Use &uarr;&darr; to navigate</span>
                </div>

                <div className="lyrics-search-list-scroll">
                  {results.map((res, idx) => {
                    const isSelected = idx === selectedIndex;
                    const cand = res.candidate;

                    return (
                      <div
                        key={`${cand.id}_${idx}`}
                        className={`lyrics-search-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedIndex(idx)}
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedIndex(idx);
                          }
                        }}
                      >
                        <div className="lyrics-card-top-row">
                          <span className="lyrics-card-title truncate" title={cand.trackName}>
                            {cand.trackName}
                          </span>
                          <span className={`lyrics-badge ${cand.hasSyncedLyrics ? 'badge-synced' : cand.hasPlainLyrics ? 'badge-plain' : 'badge-empty'}`}>
                            {cand.hasSyncedLyrics ? 'LRC Synced' : cand.hasPlainLyrics ? 'Plain Text' : 'Instrumental'}
                          </span>
                        </div>

                        <div className="lyrics-card-artist truncate" title={cand.artistName}>
                          {cand.artistName} {cand.albumName ? `\u2022 ${cand.albumName}` : ''}
                        </div>

                        <div className="lyrics-card-meta-row">
                          <span className={`lyrics-duration-tag ${res.isDurationWarning ? 'tag-warning' : res.isDurationMatched ? 'tag-matched' : ''}`}>
                            <Clock size={12} />
                            <span>{res.durationDeltaFormatted}</span>
                          </span>

                          <span className={`lyrics-confidence-tag confidence-${res.confidence}`}>
                            {res.confidence.toUpperCase()} MATCH
                          </span>
                        </div>

                        {res.versionMismatchWarning && (
                          <div className="lyrics-card-warning" title={res.versionMismatchWarning}>
                            <AlertTriangle size={12} className="flex-shrink-0" />
                            <span className="truncate">{res.versionMismatchWarning}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT COLUMN: PREVIEW PANE */}
              <div className="lyrics-search-preview-column">
                <div className="lyrics-preview-header">
                  <span className="lyrics-preview-title">
                    Preview: {selectedItem?.candidate.trackName}
                  </span>
                  <span className="lyrics-preview-type">
                    {selectedItem?.candidate.hasSyncedLyrics ? 'Synchronized LRC' : selectedItem?.candidate.hasPlainLyrics ? 'Plain Text' : 'No Text'}
                  </span>
                </div>

                <div className="lyrics-preview-scroll">
                  {previewParsed.type === 'synced' && (
                    <div className="lyrics-preview-synced">
                      {previewParsed.lines.map((line, i) => (
                        <div key={i} className="lyrics-preview-synced-line">
                          <span className="lyrics-preview-timestamp">
                            {Math.floor(line.time / 60)}:{(line.time % 60).toFixed(2).padStart(5, '0')}
                          </span>
                          <span className="lyrics-preview-text">{line.text || '\u266a'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {previewParsed.type === 'plain' && (
                    <div className="lyrics-preview-plain">
                      {previewParsed.lines.map((line, i) => (
                        <p key={i} className="lyrics-preview-plain-line">
                          {line}
                        </p>
                      ))}
                    </div>
                  )}

                  {previewParsed.type === 'none' && (
                    <div className="lyrics-preview-empty">
                      <Music2 size={36} className="lyrics-preview-empty-icon" />
                      <p>
                        {selectedItem?.candidate.instrumental
                          ? 'This track is tagged as Instrumental (no lyrics).'
                          : 'No preview lyrics available for this candidate.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer className="lyrics-search-footer">
          <div className="lyrics-search-footer-info truncate">
            {selectedItem ? (
              <span>
                Selected: <strong>{selectedItem.candidate.trackName}</strong> by {selectedItem.candidate.artistName} ({selectedItem.candidate.hasSyncedLyrics ? 'Synced' : selectedItem.candidate.hasPlainLyrics ? 'Plain' : 'Instrumental'})
              </span>
            ) : (
              <span>Select a candidate to review and save.</span>
            )}
          </div>

          <div className="lyrics-search-footer-actions">
            <Button variant="outlined" size="md" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>

            <Button
              variant="filled"
              size="md"
              icon={isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              onClick={handleSave}
              disabled={
                !selectedItem ||
                !selectedItem.candidate.hasUsableLyrics ||
                isSaving ||
                isLoading
              }
            >
              {isSaving ? 'Saving...' : 'Save to Song Folder'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};
