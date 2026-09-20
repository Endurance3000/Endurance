import React, { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Pause,
  Pin,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  Shuffle,
  Heart,
  Maximize2,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { IconButton } from "../Common/IconButton";
import { TrackArtwork } from "../Library/TrackArtwork";
import { ExpressiveWaveSlider } from "../Player/ExpressiveWaveSlider";
import { formatDuration } from "../../utils/formatters";
import { PlaybackSnapshot } from "../../services/playback/playbackProtocol";
import { libraryService } from "../../services/library/libraryService";
import {
  connectMiniPlayerBridge,
  sendMiniPlayerCommand,
} from "./miniPlayerBridge";
import "./MiniPlayerPlaceholder.css";

interface MiniPlayerVolumeProps {
  volume: number;
  isMuted: boolean;
  disabled: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

const MiniPlayerVolume: React.FC<MiniPlayerVolumeProps> = ({
  volume,
  isMuted,
  disabled,
  onVolumeChange,
  onToggleMute,
}) => {
  const volumeTrackRef = useRef<HTMLDivElement>(null);

  const setVolumeFromPointer = (clientX: number) => {
    const track = volumeTrackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;

    onVolumeChange(
      Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
    );
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;

    setVolumeFromPointer(event.clientX);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setVolumeFromPointer(moveEvent.clientX);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onVolumeChange(Math.max(0, volume - 0.05));
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onVolumeChange(Math.min(1, volume + 0.05));
    }
  };

  const volumeIcon =
    isMuted || volume === 0 ? (
      <VolumeX size={15} />
    ) : volume < 0.5 ? (
      <Volume1 size={15} />
    ) : (
      <Volume2 size={15} />
    );

  return (
    <div className="mini-player-volume">
      <button
        type="button"
        className="mini-player-vol-icon-btn"
        onClick={onToggleMute}
        disabled={disabled}
        aria-label={isMuted ? "Unmute" : "Mute"}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {volumeIcon}
      </button>
      <div
        ref={volumeTrackRef}
        className="mini-player-volume-track"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={isMuted ? 0 : volume}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
      >
        <div
          className="mini-player-volume-fill"
          style={{ width: `${isMuted ? 0 : volume * 100}%` }}
        />
        <div
          className="mini-player-volume-thumb"
          style={{ left: `${isMuted ? 0 : volume * 100}%` }}
        />
      </div>
    </div>
  );
};

export const MiniPlayerView: React.FC<{
  snapshot: PlaybackSnapshot | null;
}> = ({ snapshot }) => {
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [backdropUri, setBackdropUri] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const currentTrack = snapshot?.currentTrack ?? null;
  const hasTrack = currentTrack !== null;
  const duration = snapshot?.duration ?? 0;
  const currentTime = snapshot?.currentTime ?? 0;

  const clampedCurrentTime =
    duration > 0
      ? Math.min(duration, Math.max(0, currentTime))
      : Math.max(0, currentTime);

  const remainingTime = Math.max(0, duration - clampedCurrentTime);

  // Load blurred backdrop artwork URI
  useEffect(() => {
    let isMounted = true;
    if (!currentTrack?.artworkHash) {
      setBackdropUri(null);
      return;
    }

    libraryService.getTrackArtwork(currentTrack.artworkHash).then((uri) => {
      if (isMounted && uri) {
        setBackdropUri(uri);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.artworkHash]);

  const handleAlwaysOnTopToggle = async () => {
    const nextValue = !alwaysOnTop;
    try {
      await invoke("set_mini_player_always_on_top", {
        alwaysOnTop: nextValue,
      });
      setAlwaysOnTop(nextValue);
    } catch (error: unknown) {
      console.warn("Failed to change Mini Player always-on-top state:", error);
    }
  };

  const handleFocusMainWindow = async () => {
    try {
      await invoke("focus_main_window");
    } catch {
      // Fallback
      try {
        const appWindow = getCurrentWindow();
        await appWindow.setFocus();
      } catch (err) {
        console.warn("Focus main window failed:", err);
      }
    }
  };

  const handleToggleFavorite = async () => {
    if (!currentTrack) return;
    try {
      const newState = await invoke<boolean>("toggle_track_favorite", {
        trackId: currentTrack.id,
      });
      setIsFavorite(newState);
    } catch (err) {
      console.warn("Could not toggle favorite:", err);
    }
  };

  return (
    <main aria-label="Mini Player" className="mini-player-placeholder">
      {/* Blurred Artwork Backdrop (~18% opacity, darkened) */}
      {backdropUri && (
        <div
          className="mini-player-backdrop-img"
          style={{ backgroundImage: `url(${backdropUri})` }}
          aria-hidden="true"
        />
      )}
      <div className="mini-player-surface-overlay" aria-hidden="true" />
      <div className="mini-player-grain" aria-hidden="true" />

      {/* Top row: Artwork (72px), Title/Artist (clickable), and Window Actions */}
      <section className="mini-player-now-playing" aria-label="Now playing">
        <div
          className="mini-player-artwork-wrap"
          onClick={handleFocusMainWindow}
          role="button"
          tabIndex={0}
          title="Click to raise main window"
        >
          <TrackArtwork
            artworkHash={currentTrack?.artworkHash}
            alt={currentTrack?.album || currentTrack?.title || "No track selected"}
            size="lg"
            className="mini-player-artwork"
          />
        </div>

        <div
          className="mini-player-metadata"
          onClick={handleFocusMainWindow}
          role="button"
          tabIndex={0}
          title="Click to raise main window"
        >
          {hasTrack ? (
            <>
              <div
                className="mini-player-title truncate"
                title={currentTrack.title}
              >
                {currentTrack.title}
              </div>

              <div
                className="mini-player-artist truncate"
                title={currentTrack.artist}
              >
                {currentTrack.artist}
              </div>
            </>
          ) : (
            <>
              <div className="mini-player-title">No Track Selected</div>
              <div className="mini-player-artist">Endurance Offline Player</div>
            </>
          )}

          {snapshot?.isLoading && (
            <span className="mini-player-status" aria-live="polite">
              <Loader2 size={12} className="spin-animation" />
              Loading audio
            </span>
          )}

          {snapshot?.playbackError && (
            <span className="mini-player-error" role="alert">
              {snapshot.playbackError}
            </span>
          )}
        </div>

        {/* Window Controls: Always on Top, Expand to Main Window */}
        <div className="mini-player-window-actions">
          <IconButton
            icon={<Pin size={14} fill={alwaysOnTop ? "currentColor" : "none"} />}
            aria-label={alwaysOnTop ? "Disable Always on Top" : "Enable Always on Top"}
            tooltip={alwaysOnTop ? "Always on Top (On)" : "Always on Top"}
            onClick={() => void handleAlwaysOnTopToggle()}
            size="sm"
            className={alwaysOnTop ? "mini-player-always-on-top-active" : undefined}
          />
          <IconButton
            icon={<Maximize2 size={14} />}
            aria-label="Expand to full application"
            tooltip="Open main window"
            onClick={handleFocusMainWindow}
            size="sm"
          />
        </div>
      </section>

      {/* Progress row: scaled wave slider with elapsed and remaining */}
      <div
        className="mini-player-progress"
        role="group"
        aria-label="Playback progress"
      >
        <span className="timeline-time">
          {formatDuration(clampedCurrentTime)}
        </span>

        <ExpressiveWaveSlider
          currentTime={currentTime}
          duration={duration}
          isPlaying={snapshot?.isPlaying ?? false}
          onSeek={(seconds) =>
            sendMiniPlayerCommand({ type: "seek", seconds })
          }
          disabled={!hasTrack || duration <= 0}
        />

        <span className="timeline-time">
          {duration > 0 ? `-${formatDuration(remainingTime)}` : "-0:00"}
        </span>
      </div>

      {/* Bottom row: transport, favourite, shuffle, and volume */}
      <footer
        className="mini-player-controls"
        aria-label="Playback controls"
      >
        <IconButton
          icon={<Shuffle size={15} />}
          aria-label={snapshot?.shuffleEnabled ? "Shuffle On" : "Shuffle Off"}
          tooltip={snapshot?.shuffleEnabled ? "Shuffle On" : "Shuffle"}
          onClick={() => sendMiniPlayerCommand({ type: "toggle-shuffle" })}
          selected={snapshot?.shuffleEnabled}
          size="sm"
          className={snapshot?.shuffleEnabled ? "mini-player-toggle-active" : undefined}
        />

        <IconButton
          icon={<SkipBack size={16} />}
          aria-label="Previous track"
          tooltip="Previous"
          onClick={() => sendMiniPlayerCommand({ type: "previous-track" })}
          disabled={!hasTrack}
          size="sm"
        />

        <button
          type="button"
          className="mini-player-play-btn"
          onClick={() => sendMiniPlayerCommand({ type: "toggle-play" })}
          disabled={!hasTrack && !(snapshot?.isLoading ?? false)}
          aria-label={
            snapshot?.isLoading
              ? "Loading audio"
              : snapshot?.isPlaying
                ? "Pause"
                : "Play"
          }
          title={
            snapshot?.isLoading
              ? "Loading audio"
              : snapshot?.isPlaying
                ? "Pause"
                : "Play"
          }
        >
          {snapshot?.isLoading ? (
            <Loader2 size={18} className="spin-animation" />
          ) : snapshot?.isPlaying ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />
          )}
        </button>

        <IconButton
          icon={<SkipForward size={16} />}
          aria-label="Next track"
          tooltip="Next"
          onClick={() => sendMiniPlayerCommand({ type: "next-track" })}
          disabled={!hasTrack}
          size="sm"
        />

        <IconButton
          icon={<Heart size={15} fill={isFavorite ? "currentColor" : "none"} />}
          aria-label={isFavorite ? "In favorites" : "Add to favorites"}
          tooltip={isFavorite ? "In favorites" : "Favorite"}
          onClick={() => void handleToggleFavorite()}
          disabled={!hasTrack}
          size="sm"
          color={isFavorite ? "var(--accent-bright)" : "currentColor"}
        />

        <MiniPlayerVolume
          volume={snapshot?.volume ?? 0.75}
          isMuted={snapshot?.isMuted ?? false}
          disabled={!hasTrack}
          onVolumeChange={(volume) =>
            sendMiniPlayerCommand({ type: "set-volume", volume })
          }
          onToggleMute={() => sendMiniPlayerCommand({ type: "toggle-mute" })}
        />
      </footer>
    </main>
  );
};

export const MiniPlayer: React.FC = () => {
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot | null>(null);

  // Sync theme with document element
  useEffect(() => {
    const applyStoredTheme = () => {
      const savedTheme = localStorage.getItem("endurance_theme") || "endurance";
      document.documentElement.setAttribute("data-theme", savedTheme);
    };
    applyStoredTheme();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "endurance_theme" && e.newValue) {
        document.documentElement.setAttribute("data-theme", e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void connectMiniPlayerBridge((nextSnapshot) => {
      if (!disposed) setSnapshot(nextSnapshot);
    })
      .then((cleanup) => {
        if (disposed) cleanup();
        else unlisten = cleanup;
      })
      .catch((error: unknown) => {
        if (!disposed) {
          console.warn("Mini Player bridge unavailable:", error);
        }
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  return <MiniPlayerView snapshot={snapshot} />;
};