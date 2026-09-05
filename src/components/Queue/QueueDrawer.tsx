import React, { useEffect, useRef, useCallback } from 'react';
import { X, GripVertical, Play, Trash2, ListMusic, ChevronUp, ChevronDown } from 'lucide-react';
import { usePlayback } from '../../state/PlaybackContext';
import { TrackArtwork } from '../Library/TrackArtwork';
import { IconButton } from '../Common/IconButton';
import { formatDuration } from '../../utils/formatters';
import './QueueDrawer.css';

// ---------------------------------------------------------------------------
// Pointer-events drag state (all in refs — no React state during drag to
// avoid re-renders that would destroy the drag visual in WebView2/Tauri)
// ---------------------------------------------------------------------------
interface DragState {
  active: boolean;
  srcQueueIndex: number;     // actual index inside playbackQueue
  startY: number;
  currentY: number;
  thresholdMet: boolean;     // true once cursor moved > 6px
  ghostEl: HTMLElement | null;
  insertBeforeQueueIndex: number | null; // null means "append at end"
  pointerId: number;
}

const DRAG_THRESHOLD_PX = 6;

export const QueueDrawer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    playbackQueue,
    currentIndex,
    isQueueOpen,
    setIsQueueOpen,
    playQueueItem,
    removeFromQueue,
    reorderQueue,
    clearUpcomingQueue,
  } = usePlayback();

  const panelRef    = useRef<HTMLDivElement>(null);
  const listRef     = useRef<HTMLDivElement>(null);
  const dragRef     = useRef<DragState | null>(null);
  const frameRef    = useRef<number>(0);

  // Close on Escape
  useEffect(() => {
    if (!isQueueOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsQueueOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isQueueOpen, setIsQueueOpen]);

  // ---------------------------------------------------------------------------
  // Ghost element helpers
  // ---------------------------------------------------------------------------
  const createGhost = useCallback((srcEl: HTMLElement, y: number) => {
    const ghost = srcEl.cloneNode(true) as HTMLElement;
    const rect  = srcEl.getBoundingClientRect();
    ghost.style.cssText = `
      position: fixed;
      top: ${y - rect.height / 2}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      opacity: 0.88;
      pointer-events: none;
      z-index: 9999;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
      background: var(--md-sys-color-surface-container-highest);
      transform: scale(1.02);
      transition: box-shadow 0.15s;
    `;
    document.body.appendChild(ghost);
    return ghost;
  }, []);

  const moveGhost = useCallback((ghost: HTMLElement, y: number, srcEl: HTMLElement) => {
    const rect = srcEl.getBoundingClientRect();
    ghost.style.top = `${y - rect.height / 2}px`;
  }, []);

  const removeGhost = useCallback((ghost: HTMLElement) => {
    if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
  }, []);

  // ---------------------------------------------------------------------------
  // Insertion indicator helpers  (direct DOM — no React state)
  // ---------------------------------------------------------------------------
  const clearIndicators = useCallback(() => {
    listRef.current?.querySelectorAll<HTMLElement>('.queue-item').forEach(el => {
      el.classList.remove('dnd-insert-above', 'dnd-insert-below', 'dnd-src');
    });
  }, []);

  /**
   * Walk the rendered queue items, find which gap the pointer is currently in,
   * and update CSS classes + return the `insertBeforeQueueIndex` (null = append).
   */
  const updateIndicator = useCallback((clientY: number): number | null => {
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('.queue-item[data-queue-idx]') ?? []
    );
    clearIndicators();

    // Mark the source item
    const ds = dragRef.current;
    if (!ds) return null;
    const srcEl = listRef.current?.querySelector<HTMLElement>(
      `.queue-item[data-queue-idx="${ds.srcQueueIndex}"]`
    );
    srcEl?.classList.add('dnd-src');

    if (items.length === 0) return null;

    for (let i = 0; i < items.length; i++) {
      const itemEl  = items[i];
      const qIdx    = Number(itemEl.dataset.queueIdx);
      if (qIdx === ds.srcQueueIndex) continue; // skip the item being dragged

      const rect = itemEl.getBoundingClientRect();
      const mid  = rect.top + rect.height / 2;

      if (clientY < mid) {
        // insert BEFORE this item
        itemEl.classList.add('dnd-insert-above');
        return qIdx;
      }
    }

    // Pointer is below all items — append at end
    items[items.length - 1]?.classList.add('dnd-insert-below');
    return null; // null = append to end
  }, [clearIndicators]);

  // ---------------------------------------------------------------------------
  // Pointer event handlers (attached to the drag handle)
  // ---------------------------------------------------------------------------
  const onHandlePointerDown = useCallback((
    e: React.PointerEvent<HTMLDivElement>,
    queueIndex: number,
  ) => {
    // Only primary button (left click / touch)
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    e.preventDefault();
    e.stopPropagation();

    // Capture pointer so we receive pointermove/pointerup even if cursor leaves
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    dragRef.current = {
      active: true,
      srcQueueIndex: queueIndex,
      startY: e.clientY,
      currentY: e.clientY,
      thresholdMet: false,
      ghostEl: null,
      insertBeforeQueueIndex: null,
      pointerId: e.pointerId,
    };

    // Store a ref to the row we cloned for the ghost
    (e.currentTarget as HTMLElement).dataset.dragRowEl = 'true';
  }, []);

  const onHandlePointerMove = useCallback((
    e: React.PointerEvent<HTMLDivElement>,
    rowEl: HTMLElement,
  ) => {
    const ds = dragRef.current;
    if (!ds || !ds.active) return;
    e.preventDefault();

    const dy = Math.abs(e.clientY - ds.startY);

    if (!ds.thresholdMet) {
      if (dy < DRAG_THRESHOLD_PX) return;
      // Cross threshold — create ghost and start visual drag
      ds.thresholdMet = true;
      ds.ghostEl = createGhost(rowEl, e.clientY);
    }

    ds.currentY = e.clientY;

    // Throttle updates to animation frames
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      if (!ds.ghostEl || !ds.active) return;
      moveGhost(ds.ghostEl, ds.currentY, rowEl);
      ds.insertBeforeQueueIndex = updateIndicator(ds.currentY);
    });
  }, [createGhost, moveGhost, updateIndicator]);

  const onHandlePointerUp = useCallback((
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    const ds = dragRef.current;
    if (!ds || !ds.active) return;
    e.preventDefault();
    e.stopPropagation();

    // Release capture
    try { (e.currentTarget as HTMLElement).releasePointerCapture(ds.pointerId); } catch {}

    // Cancel animation frame
    if (frameRef.current) { cancelAnimationFrame(frameRef.current); frameRef.current = 0; }

    // Remove ghost
    if (ds.ghostEl) removeGhost(ds.ghostEl);

    // Clear DOM indicators
    clearIndicators();

    const fromIdx = ds.srcQueueIndex;
    dragRef.current = null;

    if (!ds.thresholdMet) return; // Didn't actually drag — treat as nothing

    // Determine destination index
    let toIdx: number;
    if (ds.insertBeforeQueueIndex === null) {
      // Append at end of upcoming queue
      toIdx = playbackQueue.length - 1;
    } else {
      toIdx = ds.insertBeforeQueueIndex;
      // If we're moving DOWN, the insertion-before index needs to be decremented
      // because removing the source shifts everything above it
      if (fromIdx < toIdx) toIdx = toIdx - 1;
    }

    // Clamp to valid upcoming range (can't move before currentIndex+1 or past end)
    const minIdx = currentIndex + 1;
    const maxIdx = playbackQueue.length - 1;
    toIdx = Math.max(minIdx, Math.min(maxIdx, toIdx));

    if (fromIdx !== toIdx) {
      reorderQueue(fromIdx, toIdx);
    }
  }, [playbackQueue.length, currentIndex, reorderQueue, removeGhost, clearIndicators]);

  const onHandlePointerCancel = useCallback((
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    const ds = dragRef.current;
    if (!ds) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(ds.pointerId); } catch {}
    if (frameRef.current) { cancelAnimationFrame(frameRef.current); frameRef.current = 0; }
    if (ds.ghostEl) removeGhost(ds.ghostEl);
    clearIndicators();
    dragRef.current = null;
  }, [removeGhost, clearIndicators]);

  // ---------------------------------------------------------------------------
  // Cleanup on unmount / close
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (dragRef.current?.ghostEl) removeGhost(dragRef.current.ghostEl);
      clearIndicators();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [removeGhost, clearIndicators]);

  if (!isQueueOpen) return null;

  const upcomingTracks = playbackQueue
    .map((track, idx) => ({ track, idx }))
    .filter(({ idx }) => idx > currentIndex);

  const previousTracks = playbackQueue
    .map((track, idx) => ({ track, idx }))
    .filter(({ idx }) => idx < currentIndex);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      className="queue-drawer-backdrop"
      onClick={(e) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
          setIsQueueOpen(false);
        }
      }}
    >
      <div className="queue-drawer-panel" ref={panelRef} role="dialog" aria-label="Play Queue">

        {/* ── Header ── */}
        <header className="queue-header">
          <div className="queue-header-left">
            <h2 className="queue-title">Queue</h2>
            <span className="queue-badge">
              {playbackQueue.length} {playbackQueue.length === 1 ? 'song' : 'songs'}
            </span>
          </div>
          <div className="queue-header-actions">
            {upcomingTracks.length > 0 && (
              <button
                type="button"
                className="queue-clear-btn"
                onClick={clearUpcomingQueue}
                title="Clear upcoming songs from queue"
              >
                Clear Upcoming
              </button>
            )}
            <IconButton
              icon={<X size={18} />}
              aria-label="Close queue"
              tooltip="Close (Esc)"
              onClick={() => setIsQueueOpen(false)}
              size="sm"
            />
          </div>
        </header>

        {/* ── Body ── */}
        <div className="queue-body">

          {/* 1. NOW PLAYING */}
          {currentTrack ? (
            <section className="queue-section">
              <div className="queue-section-label">Now Playing</div>
              <div className="queue-now-playing-card">
                <TrackArtwork artworkHash={currentTrack.artwork_hash} alt={currentTrack.title} size="md" />
                <div className="queue-card-meta">
                  <span className="queue-card-title truncate">{currentTrack.title}</span>
                  <span className="queue-card-artist truncate">{currentTrack.artist}</span>
                </div>
                {isPlaying && (
                  <div className="queue-equalizer" title="Playing">
                    <span className="queue-eq-bar" />
                    <span className="queue-eq-bar" />
                    <span className="queue-eq-bar" />
                  </div>
                )}
              </div>
            </section>
          ) : (
            <div className="queue-empty-state">
              <ListMusic size={36} className="queue-empty-icon" />
              <span className="queue-empty-title">Nothing Playing</span>
              <span className="queue-empty-desc">Select any song in your library to start playback.</span>
            </div>
          )}

          {/* 2. UP NEXT */}
          <section className="queue-section">
            <div className="queue-section-label">
              Up Next {upcomingTracks.length > 0 && `(${upcomingTracks.length})`}
            </div>

            {upcomingTracks.length === 0 ? (
              <div className="queue-empty-state">
                <span className="queue-empty-title">End of queue</span>
                <span className="queue-empty-desc">
                  Add tracks via "Play Next" or "Add to Queue" in any song menu.
                </span>
              </div>
            ) : (
              <div className="queue-list" ref={listRef} role="list">
                {upcomingTracks.map(({ track, idx }) => {
                  const isFirstUpcoming = idx === currentIndex + 1;
                  const isLastUpcoming  = idx === playbackQueue.length - 1;

                  return (
                    <div
                      key={`${track.id}_${idx}`}
                      className="queue-item"
                      role="listitem"
                      data-queue-idx={idx}
                      onClick={() => {
                        // Only play if we weren't dragging
                        if (!dragRef.current?.thresholdMet) playQueueItem(idx);
                      }}
                      title="Click to play, or drag the handle to reorder"
                    >
                      {/* ── Drag handle (pointer events only) ── */}
                      <div
                        className="queue-item-drag-handle"
                        title="Drag to reorder"
                        // Prevent click from propagating to the row's onClick (no play)
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => {
                          onHandlePointerDown(e, idx);
                        }}
                        onPointerMove={(e) => {
                          const rowEl = e.currentTarget.closest<HTMLElement>('.queue-item')!;
                          onHandlePointerMove(e, rowEl);
                        }}
                        onPointerUp={onHandlePointerUp}
                        onPointerCancel={onHandlePointerCancel}
                      >
                        <GripVertical size={16} />
                      </div>

                      <TrackArtwork artworkHash={track.artwork_hash} alt={track.title} size="sm" />

                      <div className="queue-item-meta">
                        <span className="queue-item-title truncate">{track.title}</span>
                        <span className="queue-item-artist truncate">{track.artist}</span>
                      </div>

                      <span className="queue-item-duration">{formatDuration(track.duration)}</span>

                      {/* ── Action buttons ── */}
                      <div
                        className="queue-item-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconButton
                          icon={<ChevronUp size={15} />}
                          aria-label="Move up"
                          tooltip="Move up one position"
                          size="sm"
                          disabled={isFirstUpcoming}
                          onClick={() => reorderQueue(idx, idx - 1)}
                        />
                        <IconButton
                          icon={<ChevronDown size={15} />}
                          aria-label="Move down"
                          tooltip="Move down one position"
                          size="sm"
                          disabled={isLastUpcoming}
                          onClick={() => reorderQueue(idx, idx + 1)}
                        />
                        <IconButton
                          icon={<Play size={14} fill="currentColor" />}
                          aria-label={`Play ${track.title}`}
                          tooltip="Play now"
                          size="sm"
                          onClick={() => playQueueItem(idx)}
                        />
                        <IconButton
                          icon={<Trash2 size={14} />}
                          aria-label="Remove from queue"
                          tooltip="Remove"
                          size="sm"
                          onClick={() => removeFromQueue(idx)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 3. PREVIOUSLY PLAYED */}
          {previousTracks.length > 0 && (
            <section className="queue-section">
              <div className="queue-section-label" style={{ opacity: 0.6 }}>
                Previously Played ({previousTracks.length})
              </div>
              <div className="queue-list" style={{ opacity: 0.7 }}>
                {previousTracks.map(({ track, idx }) => (
                  <div
                    key={`${track.id}_${idx}`}
                    className="queue-item"
                    onClick={() => playQueueItem(idx)}
                    title="Play again"
                  >
                    <TrackArtwork artworkHash={track.artwork_hash} alt={track.title} size="sm" />
                    <div className="queue-item-meta">
                      <span className="queue-item-title truncate">{track.title}</span>
                      <span className="queue-item-artist truncate">{track.artist}</span>
                    </div>
                    <span className="queue-item-duration">{formatDuration(track.duration)}</span>
                    <IconButton
                      icon={<Play size={14} fill="currentColor" />}
                      aria-label={`Replay ${track.title}`}
                      tooltip="Play"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); playQueueItem(idx); }}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
