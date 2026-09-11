import React, { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { IconButton } from "../Common/IconButton";
import { TrackArtwork } from "../Library/TrackArtwork";
import { ExpressiveWaveSlider } from "../Player/ExpressiveWaveSlider";
import { formatDuration } from "../../utils/formatters";
import { PlaybackSnapshot } from "../../services/playback/playbackProtocol";
import {
  connectMiniPlayerBridge,
  sendMiniPlayerCommand,
} from "./miniPlayerBridge";

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
      <VolumeX size={16} />
    ) : volume < 0.5 ? (
      <Volume1 size={16} />
    ) : (
      <Volume2 size={16} />
    );

  return (
    <div className="mini-player-volume">
      <IconButton
        icon={volumeIcon}
        aria-label={isMuted ? "Unmute" : "Mute"}
        tooltip={isMuted ? "Unmute" : "Mute"}
        onClick={onToggleMute}
        disabled={disabled}
        size="sm"
      />
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
  const currentTrack = snapshot?.currentTrack ?? null;
  const hasTrack = currentTrack !== null;
  const duration = snapshot?.duration ?? 0;
  const currentTime = snapshot?.currentTime ?? 0;
  const clampedCurrentTime =
    duration > 0
      ? Math.min(duration, Math.max(0, currentTime))
      : Math.max(0, currentTime);

  return (
    <main aria-label="Mini Player" className="mini-player-placeholder">
      <section className="mini-player-now-playing" aria-label="Now playing">
        <TrackArtwork
          artworkHash={currentTrack?.artworkHash}
          alt={
            currentTrack?.album || currentTrack?.title || "No track selected"
          }
          size="lg"
          className="mini-player-artwork"
        />
        <div className="mini-player-metadata">
          {hasTrack ? (
            <>
              <strong
                className="mini-player-title truncate"
                title={currentTrack.title}
              >
                {currentTrack.title}
              </strong>
              <span
                className="mini-player-artist truncate"
                title={currentTrack.artist}
              >
                {currentTrack.artist}
              </span>
            </>
          ) : (
            <>
              <strong className="mini-player-title">No Track Selected</strong>
              <span className="mini-player-artist">
                Endurance Offline Player
              </span>
            </>
          )}
          {snapshot?.isLoading && (
            <span className="mini-player-status" aria-live="polite">
              <Loader2 size={13} className="spin-animation" /> Loading audio
            </span>
          )}
          {snapshot?.playbackError && (
            <span className="mini-player-error" role="alert">
              {snapshot.playbackError}
            </span>
          )}
        </div>
      </section>

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
          onSeek={(seconds) => sendMiniPlayerCommand({ type: "seek", seconds })}
          disabled={!hasTrack || duration <= 0}
        />
        <span className="timeline-time">
          {duration > 0 ? formatDuration(duration) : "0:00"}
        </span>
      </div>

      <footer className="mini-player-controls" aria-label="Playback controls">
        <IconButton
          icon={<SkipBack size={17} />}
          aria-label="Previous track"
          tooltip="Previous"
          onClick={() => sendMiniPlayerCommand({ type: "previous-track" })}
          disabled={!hasTrack}
          size="sm"
        />
        <button
          type="button"
          className="player-play-btn mini-player-play-btn"
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
            <Loader2 size={19} className="spin-animation" />
          ) : snapshot?.isPlaying ? (
            <Pause size={19} fill="currentColor" />
          ) : (
            <Play size={19} fill="currentColor" style={{ marginLeft: 2 }} />
          )}
        </button>
        <IconButton
          icon={<SkipForward size={17} />}
          aria-label="Next track"
          tooltip="Next"
          onClick={() => sendMiniPlayerCommand({ type: "next-track" })}
          disabled={!hasTrack}
          size="sm"
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
        if (!disposed) console.warn("Mini Player bridge unavailable:", error);
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  return <MiniPlayerView snapshot={snapshot} />;
};
