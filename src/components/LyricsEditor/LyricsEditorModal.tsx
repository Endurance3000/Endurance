import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Plus,
  Trash2,
  ChevronDown,
  AlertCircle,
  Check,
  Loader2,
  FileQuestion,
  RotateCcw,
} from 'lucide-react';
import { Track } from '../../types';
import {
  createEditableLyricLine,
  LyricsDocument,
} from '../../services/lyrics/lyricsDocument';
import { lyricsService } from '../../services/lyrics/lyricsService';
import { Button } from '../Common/Button';
import { IconButton } from '../Common/IconButton';
import {
  EditorLine,
  formatTimeMs,
  parseTimeInput,
  createDocSnapshot,
} from './lyricsEditorHelpers';
import './LyricsEditorModal.css';

export type { EditorLine };
export { formatTimeMs, parseTimeInput, createDocSnapshot };

export interface LyricsEditorModalProps {
  track: Track;
  onClose: () => void;
}

export const LyricsEditorModal: React.FC<LyricsEditorModalProps> = ({
  track,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasNoLrc, setHasNoLrc] = useState<boolean>(false);
  const [doc, setDoc] = useState<LyricsDocument | null>(null);

  // Editable Form State
  const [lines, setLines] = useState<EditorLine[]>([]);
  const [title, setTitle] = useState<string>('');
  const [artist, setArtist] = useState<string>('');
  const [album, setAlbum] = useState<string>('');
  const [lyricist, setLyricist] = useState<string>('');
  const [offset, setOffset] = useState<string>('0');

  // UI States
  const [isMetadataExpanded, setIsMetadataExpanded] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);

  // Snapshot for dirty comparison
  const [initialSnapshot, setInitialSnapshot] = useState<string>('');

  // DOM Refs for accessibility and focus management
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const pendingFocusLineIdRef = useRef<string | null>(null);
  const lineInputsRef = useRef<Map<string, HTMLInputElement>>(new Map());

  // 1. Capture opener and focus close button on mount
  useEffect(() => {
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const frame = requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      openerRef.current?.focus();
    };
  }, []);

  // 2. Load document on mount / track change
  const initializeWithDocument = (loadedDoc: LyricsDocument) => {
    setDoc(loadedDoc);
    const initialLines: EditorLine[] = loadedDoc.lines.map((l) => ({
      id: l.id,
      timeMilliseconds: l.timeMilliseconds,
      timeString: formatTimeMs(l.timeMilliseconds),
      isTimeInvalid: false,
      text: l.text,
    }));

    const initTitle = loadedDoc.metadata.title || '';
    const initArtist = loadedDoc.metadata.artist || '';
    const initAlbum = loadedDoc.metadata.album || '';
    const initLyricist = loadedDoc.metadata.lyricist || '';
    const initOffset = String(loadedDoc.offsetMilliseconds || 0);

    setLines(initialLines);
    setTitle(initTitle);
    setArtist(initArtist);
    setAlbum(initAlbum);
    setLyricist(initLyricist);
    setOffset(initOffset);

    setInitialSnapshot(
      createDocSnapshot(
        initTitle,
        initArtist,
        initAlbum,
        initLyricist,
        initOffset,
        initialLines
      )
    );
    setHasNoLrc(false);
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setHasNoLrc(false);
    setErrorMessage(null);
    setConflictError(null);

    lyricsService
      .getLyricsDocument(track.file_path)
      .then((loaded) => {
        if (!isMounted) return;
        if (!loaded) {
          setHasNoLrc(true);
          setDoc(null);
        } else {
          initializeWithDocument(loaded);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to load lyrics file.'
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [track.file_path]);

  // 3. Focus newly added line if requested
  useEffect(() => {
    if (pendingFocusLineIdRef.current) {
      const id = pendingFocusLineIdRef.current;
      pendingFocusLineIdRef.current = null;
      const inputEl = lineInputsRef.current.get(id);
      inputEl?.focus();
    }
  }, [lines]);

  // 4. Dirty tracking and validation
  const currentSnapshot = createDocSnapshot(
    title,
    artist,
    album,
    lyricist,
    offset,
    lines
  );
  const isDirty = initialSnapshot !== '' && currentSnapshot !== initialSnapshot;
  const hasValidationErrors = lines.some((l) => l.isTimeInvalid);
  const canSave = isDirty && !hasValidationErrors && !isSaving && !hasNoLrc;

  // 5. Line manipulation
  const handleLineTextChange = (id: string, text: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, text } : l))
    );
  };

  const handleTimestampChange = (id: string, rawInput: string) => {
    const { isValid, ms } = parseTimeInput(rawInput);
    setLines((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              timeString: rawInput,
              isTimeInvalid: !isValid,
              timeMilliseconds: isValid ? ms : l.timeMilliseconds,
            }
          : l
      )
    );
  };

  const handleDeleteLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
    lineInputsRef.current.delete(id);
  };

  const handleAddLineAtBottom = () => {
    const newLineModel = createEditableLyricLine('');
    const newLine: EditorLine = {
      id: newLineModel.id,
      timeMilliseconds: null,
      timeString: '',
      isTimeInvalid: false,
      text: '',
    };
    pendingFocusLineIdRef.current = newLine.id;
    setLines((prev) => [...prev, newLine]);
  };

  const handleLineKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      const newLineModel = createEditableLyricLine('');
      const newLine: EditorLine = {
        id: newLineModel.id,
        timeMilliseconds: null,
        timeString: '',
        isTimeInvalid: false,
        text: '',
      };
      pendingFocusLineIdRef.current = newLine.id;

      setLines((prev) => {
        const next = [...prev];
        next.splice(index + 1, 0, newLine);
        return next;
      });
    }
  };

  // 6. Save handler
  const handleSave = async () => {
    if (!doc || !canSave) return;

    setIsSaving(true);
    setErrorMessage(null);
    setConflictError(null);

    const docToSave: LyricsDocument = {
      ...doc,
      metadata: {
        ...doc.metadata,
        title: title.trim() === '' ? null : title,
        artist: artist.trim() === '' ? null : artist,
        album: album.trim() === '' ? null : album,
        lyricist: lyricist.trim() === '' ? null : lyricist,
        unknown: [...doc.metadata.unknown],
      },
      offsetMilliseconds: parseInt(offset, 10) || 0,
      lines: lines.map((l) => ({
        id: l.id,
        timeMilliseconds: l.timeMilliseconds,
        text: l.text,
      })),
    };

    try {
      const newFp = await lyricsService.saveLyricsDocument(docToSave);
      lyricsService.clearCache();
      window.dispatchEvent(
        new CustomEvent('endurance:lyrics-updated', {
          detail: { filePath: track.file_path },
        })
      );

      const updatedDoc: LyricsDocument = {
        ...docToSave,
        sourceFingerprint: newFp,
      };
      setDoc(updatedDoc);

      const savedSnapshot = createDocSnapshot(
        title,
        artist,
        album,
        lyricist,
        offset,
        lines
      );
      setInitialSnapshot(savedSnapshot);

      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
      }, 2200);
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      const lower = errStr.toLowerCase();
      if (
        lower.includes('modified externally') ||
        lower.includes('conflict')
      ) {
        setConflictError('Conflict detected: the lyrics file was modified externally.');
      } else {
        setErrorMessage(errStr || 'Failed to save lyrics file.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 7. Conflict reload handler
  const handleReloadFromDisk = async () => {
    setIsLoading(true);
    setConflictError(null);
    setErrorMessage(null);

    try {
      const loaded = await lyricsService.getLyricsDocument(track.file_path);
      if (!loaded) {
        setHasNoLrc(true);
        setDoc(null);
      } else {
        initializeWithDocument(loaded);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to reload lyrics from disk.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 8. Close / Discard handlers
  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // 9. Keyboard Focus & Escape Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
        } else {
          handleRequestClose();
        }
        return;
      }

      if (e.key !== 'Tab') return;

      const container = panelRef.current;
      if (!container) return;

      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstEl = focusableElements[0];
      const lastEl = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDiscardConfirm, isDirty, onClose]);

  return (
    <div
      className="lyrics-editor-backdrop"
      onClick={(e) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
          handleRequestClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="lyrics-editor-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Lyrics Editor: ${track.title}`}
      >
        {/* HEADER */}
        <header className="lyrics-editor-header">
          <div className="lyrics-editor-header-left">
            <div className="lyrics-editor-title-wrap">
              <h2 className="lyrics-editor-title">Lyrics Editor</h2>
              <span className="lyrics-editor-subtitle truncate">
                {track.title} &bull; {track.artist}
              </span>
            </div>

            {isDirty && !hasNoLrc && (
              <span className="lyrics-editor-dirty-badge">
                &bull; Unsaved changes
              </span>
            )}

            {isSaved && (
              <span className="lyrics-editor-saved-badge">
                <Check size={12} /> Saved
              </span>
            )}
          </div>

          <div className="lyrics-editor-header-actions">
            <button
              ref={closeBtnRef}
              type="button"
              className="m3-btn m3-btn-outlined m3-btn-sm"
              onClick={handleRequestClose}
            >
              <span className="m3-btn-label">Cancel</span>
            </button>

            {!hasNoLrc && (
              <Button
                variant="filled"
                size="sm"
                onClick={handleSave}
                disabled={!canSave}
                icon={isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </header>

        {/* ERROR BANNERS */}
        {conflictError && (
          <div className="lyrics-editor-banner lyrics-editor-banner-conflict">
            <div className="lyrics-editor-banner-content">
              <AlertCircle size={16} />
              <span>{conflictError}</span>
            </div>
            <Button
              variant="tonal"
              size="sm"
              icon={<RotateCcw size={13} />}
              onClick={handleReloadFromDisk}
            >
              Reload from Disk
            </Button>
          </div>
        )}

        {errorMessage && !conflictError && (
          <div className="lyrics-editor-banner lyrics-editor-banner-error">
            <div className="lyrics-editor-banner-content">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* MAIN BODY */}
        <div className="lyrics-editor-body">
          {isLoading && (
            <div className="lyrics-editor-loading">
              <Loader2 size={32} className="animate-spin" />
              <span>Loading lyrics file...</span>
            </div>
          )}

          {!isLoading && hasNoLrc && (
            <div className="lyrics-editor-empty-state">
              <FileQuestion size={48} className="lyrics-editor-empty-icon" />
              <h3 className="lyrics-editor-empty-title">No Lyrics File Found</h3>
              <p className="lyrics-editor-empty-desc">
                No lyrics file found for this track. An existing LRC file is required to edit lyrics.
              </p>
              <Button variant="tonal" size="md" onClick={onClose}>
                Close
              </Button>
            </div>
          )}

          {!isLoading && !hasNoLrc && (
            <>
              {/* Collapsible Metadata Card */}
              <div className="lyrics-editor-metadata-card">
                <button
                  type="button"
                  className="lyrics-editor-metadata-toggle"
                  onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
                  aria-expanded={isMetadataExpanded}
                >
                  <span className="lyrics-editor-metadata-toggle-left">
                    <ChevronDown
                      size={16}
                      style={{
                        transform: isMetadataExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.18s ease',
                      }}
                    />
                    <span>Track Metadata & Offset</span>
                  </span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                    {offset !== '0' ? `Offset: ${offset}ms` : 'Optional metadata tags'}
                  </span>
                </button>

                {isMetadataExpanded && (
                  <div className="lyrics-editor-metadata-fields">
                    <div className="metadata-input-group">
                      <label className="metadata-input-label">Title [ti]</label>
                      <input
                        type="text"
                        className="metadata-input"
                        placeholder="Track title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>

                    <div className="metadata-input-group">
                      <label className="metadata-input-label">Artist [ar]</label>
                      <input
                        type="text"
                        className="metadata-input"
                        placeholder="Artist name"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                      />
                    </div>

                    <div className="metadata-input-group">
                      <label className="metadata-input-label">Album [al]</label>
                      <input
                        type="text"
                        className="metadata-input"
                        placeholder="Album name"
                        value={album}
                        onChange={(e) => setAlbum(e.target.value)}
                      />
                    </div>

                    <div className="metadata-input-group">
                      <label className="metadata-input-label">Lyricist [by]</label>
                      <input
                        type="text"
                        className="metadata-input"
                        placeholder="Author / creator"
                        value={lyricist}
                        onChange={(e) => setLyricist(e.target.value)}
                      />
                    </div>

                    <div className="metadata-input-group">
                      <label className="metadata-input-label">Offset [offset] (ms)</label>
                      <input
                        type="number"
                        className="metadata-input"
                        placeholder="0"
                        value={offset}
                        onChange={(e) => setOffset(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Rows List */}
              <div className="lyrics-editor-rows-header">
                <span>Timestamp</span>
                <span>Lyric Text</span>
                <span style={{ textAlign: 'center' }}>Action</span>
              </div>

              <div className="lyrics-editor-rows-list">
                {lines.map((line, index) => (
                  <div key={line.id} className="lyrics-editor-row">
                    <div className="timestamp-col">
                      <input
                        type="text"
                        className={`timestamp-input ${line.isTimeInvalid ? 'is-invalid' : ''}`}
                        placeholder="--:--.--"
                        value={line.timeString}
                        onChange={(e) => handleTimestampChange(line.id, e.target.value)}
                        title={
                          line.isTimeInvalid
                            ? 'Invalid format. Expected mm:ss.xx (seconds 00–59) or blank for untimed'
                            : 'Timestamp in mm:ss.xx format'
                        }
                        aria-label={`Timestamp for line ${index + 1}`}
                      />
                    </div>

                    <div className="lyric-text-col">
                      <input
                        ref={(el) => {
                          if (el) lineInputsRef.current.set(line.id, el);
                          else lineInputsRef.current.delete(line.id);
                        }}
                        type="text"
                        className="lyric-text-input"
                        placeholder="Blank line"
                        value={line.text}
                        onChange={(e) => handleLineTextChange(line.id, e.target.value)}
                        onKeyDown={(e) => handleLineKeyDown(e, index)}
                        aria-label={`Lyric text line ${index + 1}`}
                      />
                    </div>

                    <div className="row-delete-col">
                      <IconButton
                        icon={<Trash2 size={15} />}
                        aria-label={`Delete line ${index + 1}`}
                        size="sm"
                        onClick={() => handleDeleteLine(line.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="lyrics-editor-add-line-wrap">
                <Button
                  variant="outlined"
                  size="md"
                  className="lyrics-editor-add-line-btn"
                  icon={<Plus size={16} />}
                  onClick={handleAddLineAtBottom}
                >
                  Add Line
                </Button>
              </div>
            </>
          )}
        </div>

        {/* NESTED DISCARD CONFIRMATION DIALOG */}
        {showDiscardConfirm && (
          <div
            className="lyrics-editor-confirm-backdrop"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="lyrics-editor-confirm-panel"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-desc"
            >
              <h4 id="confirm-title" className="confirm-title">
                Discard unsaved changes?
              </h4>
              <p id="confirm-desc" className="confirm-desc">
                You have unsaved changes in this lyrics file. Discarding will lose all recent edits.
              </p>
              <div className="confirm-actions">
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  Keep Editing
                </Button>
                <Button
                  variant="filled"
                  size="sm"
                  onClick={onClose}
                >
                  Discard Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
