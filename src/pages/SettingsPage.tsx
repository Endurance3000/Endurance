import React, { useState, useEffect } from "react";
import {
  Palette,
  FolderCog,
  FileText,
  Keyboard,
  Info,
  FolderPlus,
  Trash2,
  RefreshCw,
  Loader2,
  Folder,
  Check,
  ExternalLink,
  Play,
  Volume2,
} from "lucide-react";
import { Chip } from "../components/Common/Chip";
import { Button } from "../components/Common/Button";
import { IconButton } from "../components/Common/IconButton";
import { formatDate } from "../utils/formatters";
import { SystemInfo, LibraryFolder } from "../types";
import { useTheme, AppTheme } from "../state/ThemeContext";
import { usePlayback } from "../state/PlaybackContext";
import { getPrimaryModifierLabel } from "../services/audio/shortcutHelper";
import "./Pages.css";

interface SettingsPageProps {
  systemInfo: SystemInfo | null;
  folders: LibraryFolder[];
  tracksCount: number;
  isScanning: boolean;
  onAddFolder: () => Promise<void>;
  onRemoveFolder: (path: string) => Promise<void>;
  onRescan: () => Promise<void>;
}

type SettingsCategory =
  | "library"
  | "appearance"
  | "playback"
  | "audio"
  | "lyrics"
  | "shortcuts"
  | "about";

interface ThemeCardOption {
  id: AppTheme;
  name: string;
  subtitle: string;
  surfaceBase: string;
  surfacePanel: string;
  inkPrimary: string;
  accent: string;
}

const THEME_OPTIONS: ThemeCardOption[] = [
  {
    id: "endurance",
    name: "Endurance",
    subtitle: "Warm Clay (Default)",
    surfaceBase: "#14100E",
    surfacePanel: "#241D19",
    inkPrimary: "#FFFBE9",
    accent: "#CEAB93",
  },
  {
    id: "coffee",
    name: "Coffee",
    subtitle: "Maroon & Cream",
    surfaceBase: "#1E0E11",
    surfacePanel: "#561C24",
    inkPrimary: "#E8D8C4",
    accent: "#C7B7A3",
  },
  {
    id: "parchment",
    name: "Parchment",
    subtitle: "Leather & Blue Vinyl",
    surfaceBase: "#2A1B15",
    surfacePanel: "#46291D",
    inkPrimary: "#F2E7D2",
    accent: "#CDB58E",
  },
  {
    id: "mauve",
    name: "Mauve",
    subtitle: "Dusk Rose",
    surfaceBase: "#2A2228",
    surfacePanel: "#4E3F47",
    inkPrimary: "#F7EFE7",
    accent: "#C7A9A3",
  },
  {
    id: "slate",
    name: "Slate",
    subtitle: "Slate & Apricot",
    surfaceBase: "#191A22",
    surfacePanel: "#2A2C38",
    inkPrimary: "#F5E7D2",
    accent: "#FED7A5",
  },
  {
    id: "ash",
    name: "Ash",
    subtitle: "Cool Grey & Taupe",
    surfaceBase: "#1D2028",
    surfacePanel: "#333844",
    inkPrimary: "#D7D7D6",
    accent: "#A08A81",
  },
  {
    id: "daylight",
    name: "Daylight",
    subtitle: "Warm Cream (Light)",
    surfaceBase: "#FFFBE9",
    surfacePanel: "#F2E8CF",
    inkPrimary: "#241B14",
    accent: "#96714F",
  },
  {
    id: "porcelain",
    name: "Porcelain",
    subtitle: "Rose & Bone (Light)",
    surfaceBase: "#F7EFE7",
    surfacePanel: "#E8D2C4",
    inkPrimary: "#3E3239",
    accent: "#8C6E78",
  },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  systemInfo: _systemInfo,
  folders,
  tracksCount,
  isScanning,
  onAddFolder,
  onRemoveFolder,
  onRescan,
}) => {
  const [activeCategory, setActiveCategory] =
    useState<SettingsCategory>("library");
  const { theme, setTheme, dynamicColorEnabled, setDynamicColorEnabled } =
    useTheme();
  const { currentTrack } = usePlayback();
  const [deletingFolderPath, setDeletingFolderPath] = useState<string | null>(
    null,
  );

  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) =>
        setPrefersReducedMotion(e.matches);
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, []);

  const handleOpenLyricsEditor = () => {
    if (currentTrack) {
      window.dispatchEvent(
        new CustomEvent("endurance:open-lyrics-editor", {
          detail: { track: currentTrack },
        }),
      );
    }
  };

  const handleConfirmRemoveFolder = async (path: string) => {
    await onRemoveFolder(path);
    setDeletingFolderPath(null);
  };

  const categories = [
    { id: "library", label: "Library", icon: <FolderCog size={16} /> },
    { id: "appearance", label: "Appearance", icon: <Palette size={16} /> },
    { id: "playback", label: "Playback", icon: <Play size={16} /> },
    { id: "audio", label: "Audio", icon: <Volume2 size={16} /> },
    { id: "lyrics", label: "Lyrics", icon: <FileText size={16} /> },
    { id: "shortcuts", label: "Shortcuts", icon: <Keyboard size={16} /> },
    { id: "about", label: "About", icon: <Info size={16} /> },
  ] as const;

  return (
    <div className="page-container motion-fade-in settings-lean-container">
      <header className="page-header settings-page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          Configure Endurance library, themes, and audio behavior
        </p>
      </header>

      {/* Category Filter Chips Bar */}
      <div
        className="chips-bar settings-chips-bar"
        role="tablist"
        aria-label="Settings Categories"
      >
        {categories.map((cat) => (
          <Chip
            key={cat.id}
            selected={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
            icon={cat.icon}
            role="tab"
            aria-selected={activeCategory === cat.id}
          >
            {cat.label}
          </Chip>
        ))}
      </div>

      <div className="settings-content-area">
        {/* TAB 1: LIBRARY */}
        {activeCategory === "library" && (
          <div className="settings-section-lean motion-fade-in">
            <div className="settings-header-action-row">
              <div>
                <h2 className="settings-section-title">
                  Music Library Folders
                </h2>
                <p className="settings-section-desc">
                  {folders.length} {folders.length === 1 ? "folder" : "folders"}{" "}
                  configured · {tracksCount}{" "}
                  {tracksCount === 1 ? "track" : "tracks"} indexed
                </p>
              </div>
              <div className="settings-header-buttons">
                <Button
                  variant="tonal"
                  size="sm"
                  icon={
                    isScanning ? (
                      <Loader2 size={15} className="spin-animation" />
                    ) : (
                      <RefreshCw size={15} />
                    )
                  }
                  onClick={onRescan}
                  disabled={isScanning || folders.length === 0}
                >
                  {isScanning ? "Scanning..." : "Rescan All"}
                </Button>
                <Button
                  variant="filled"
                  size="sm"
                  icon={<FolderPlus size={15} />}
                  onClick={onAddFolder}
                  disabled={isScanning}
                >
                  Add Folder
                </Button>
              </div>
            </div>

            {/* Configured Folders List */}
            <div className="folders-list">
              {folders.length === 0 ? (
                <div className="folders-empty-notice">
                  <Folder size={20} className="folders-empty-icon" />
                  <span>
                    No music folders added yet. Click &ldquo;Add Folder&rdquo;
                    to select a music directory.
                  </span>
                </div>
              ) : (
                folders.map((folder) => (
                  <div key={folder.id} className="folder-item-row">
                    <div className="folder-item-icon">
                      <Folder size={18} />
                    </div>
                    <div className="folder-item-details">
                      <span className="folder-item-path truncate">
                        {folder.path}
                      </span>
                      <span className="folder-item-meta">
                        Last scanned:{" "}
                        {folder.last_scanned
                          ? formatDate(folder.last_scanned)
                          : "Never"}
                      </span>
                    </div>

                    {deletingFolderPath === folder.path ? (
                      <div className="folder-delete-confirm-group">
                        <span className="folder-delete-confirm-text">
                          Remove?
                        </span>
                        <Button
                          variant="filled"
                          size="sm"
                          onClick={() => handleConfirmRemoveFolder(folder.path)}
                          className="folder-confirm-btn"
                        >
                          Yes
                        </Button>
                        <Button
                          variant="text"
                          size="sm"
                          onClick={() => setDeletingFolderPath(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <IconButton
                        icon={<Trash2 size={16} />}
                        aria-label={`Remove folder ${folder.path}`}
                        tooltip="Remove folder from library"
                        onClick={() => setDeletingFolderPath(folder.path)}
                        size="sm"
                      />
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="settings-row">
              <div>
                <div className="setting-label">Supported Audio Formats</div>
                <div className="setting-sublabel">
                  FLAC, WAV, MP3, M4A, AAC, OGG, Opus, AIFF, AIF (offline
                  read-only)
                </div>
              </div>
            </div>

            <div className="settings-row">
              <div>
                <div className="setting-label">File Safety Principle</div>
                <div className="setting-sublabel">
                  Endurance never moves, renames, or modifies your local audio
                  files. Scanning is strictly read-only.
                </div>
              </div>
              <span className="setting-badge-accent-wash">Read-Only Safe</span>
            </div>
          </div>
        )}

        {/* TAB 2: APPEARANCE */}
        {activeCategory === "appearance" && (
          <div className="settings-section-lean motion-fade-in">
            <h2 className="settings-section-title">Theme System</h2>
            <p className="settings-section-desc">
              Choose a curated atmosphere for The Record Room
            </p>

            {/* 8 Live Miniature Theme Cards Grid */}
            <div
              className="theme-grid"
              role="radiogroup"
              aria-label="Theme Selection"
            >
              {THEME_OPTIONS.map((opt) => {
                const isSelected = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`theme-card ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setTheme(opt.id)}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setTheme(opt.id);
                      }
                    }}
                  >
                    {/* Live miniature preview viewport */}
                    <div
                      className="theme-card-preview"
                      style={{ backgroundColor: opt.surfaceBase }}
                    >
                      <div
                        className="theme-preview-sleeve"
                        style={{ backgroundColor: opt.surfacePanel }}
                      />
                      <div className="theme-preview-lines">
                        <div
                          className="theme-preview-text-line"
                          style={{ backgroundColor: opt.inkPrimary }}
                        />
                        <div
                          className="theme-preview-accent-pill"
                          style={{ backgroundColor: opt.accent }}
                        />
                      </div>
                    </div>

                    <div className="theme-card-footer">
                      <div className="theme-card-info">
                        <span className="theme-card-name">{opt.name}</span>
                        <span className="theme-card-sub">{opt.subtitle}</span>
                      </div>
                      {isSelected && (
                        <div className="theme-card-check" aria-hidden="true">
                          <Check size={14} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Adapt to Album Art Toggle */}
            <div
              className="settings-row"
              style={{ marginTop: "var(--space-2xl)" }}
            >
              <div>
                <div className="setting-label">Adapt colours to album art</div>
                <div className="setting-sublabel">
                  Accents and ambient glow follow the current cover art;
                  surfaces and text remain fixed for high contrast.
                </div>
              </div>
              <button
                type="button"
                className={`m3-switch ${dynamicColorEnabled ? "active" : ""}`}
                onClick={() => setDynamicColorEnabled(!dynamicColorEnabled)}
                aria-label="Toggle dynamic album art colors"
              >
                <span className="m3-switch-thumb" />
              </button>
            </div>

            {/* Match System Theme Toggle */}
            <div className="settings-row">
              <div>
                <div className="setting-label">Match system theme</div>
                <div className="setting-sublabel">
                  Automatically select Endurance (dark) or Daylight (light)
                  based on your OS preference.
                </div>
              </div>
              <button
                type="button"
                className={`m3-switch ${theme === "system" ? "active" : ""}`}
                onClick={() =>
                  setTheme(theme === "system" ? "endurance" : "system")
                }
                aria-label="Toggle match system theme"
              >
                <span className="m3-switch-thumb" />
              </button>
            </div>

            {/* Reduced Motion System Info */}
            <div className="settings-row">
              <div>
                <div className="setting-label">Reduced Motion</div>
                <div className="setting-sublabel">
                  Operating system accessibility preference:{" "}
                  {prefersReducedMotion
                    ? "Active (Animations minimized)"
                    : "Inactive"}
                </div>
              </div>
              <span className="setting-badge">
                {prefersReducedMotion ? "Reduced Motion ON" : "Standard Motion"}
              </span>
            </div>
          </div>
        )}

        {/* TAB 3: LYRICS */}
        {activeCategory === "lyrics" && (
          <div className="settings-section-lean motion-fade-in">
            <h2 className="settings-section-title">Synchronized Lyrics</h2>
            <p className="settings-section-desc">
              Endurance resolves matching sidecar <code>.lrc</code> files
              located alongside your audio tracks.
            </p>

            <div className="settings-row">
              <div>
                <div className="setting-label">Sidecar LRC Editor</div>
                <div className="setting-sublabel">
                  Edit, adjust timestamps, and save synchronized lyrics directly
                  to disk for the active song.
                </div>
              </div>
              <Button
                variant="filled"
                size="sm"
                icon={<FileText size={15} />}
                onClick={handleOpenLyricsEditor}
                disabled={!currentTrack}
              >
                {currentTrack
                  ? "Edit Current Song Lyrics"
                  : "Play a Song to Edit"}
              </Button>
            </div>
          </div>
        )}

        {/* TAB 4: PLAYBACK */}
        {activeCategory === "playback" && (
          <div className="settings-section-lean motion-fade-in">
            <h2 className="settings-section-title">Playback Behavior</h2>
            <p className="settings-section-desc">
              Control how Endurance transitions between tracks
            </p>

            <div className="settings-row">
              <div>
                <div className="setting-label">Gapless Playback</div>
                <div className="setting-sublabel">
                  Seamlessly cross from one track to the next with no silence
                  gap (for continuous albums and mixes).
                </div>
              </div>
              <span className="setting-badge-accent-wash">Enabled</span>
            </div>

            <div className="settings-row">
              <div>
                <div className="setting-label">Crossfade Duration</div>
                <div className="setting-sublabel">
                  Blend audio output between consecutive tracks. Set to 0 to
                  disable.
                </div>
              </div>
              <span className="setting-badge">0 ms</span>
            </div>

            <div className="settings-row">
              <div>
                <div className="setting-label">Remember Playback Position</div>
                <div className="setting-sublabel">
                  Resume long tracks (audiobooks, podcasts) from where you left
                  off.
                </div>
              </div>
              <span className="setting-badge">Off</span>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIO */}
        {activeCategory === "audio" && (
          <div className="settings-section-lean motion-fade-in">
            <h2 className="settings-section-title">Audio Output</h2>
            <p className="settings-section-desc">
              Output device routing and volume normalization
            </p>

            <div className="settings-row">
              <div>
                <div className="setting-label">Output Device</div>
                <div className="setting-sublabel">
                  Endurance uses the system default audio output. Change output
                  in your OS sound settings.
                </div>
              </div>
              <span className="setting-badge">System Default</span>
            </div>

            <div className="settings-row">
              <div>
                <div className="setting-label">Volume Normalization</div>
                <div className="setting-sublabel">
                  Automatically level track volumes using ReplayGain metadata
                  when available.
                </div>
              </div>
              <span className="setting-badge">Off</span>
            </div>

            <div className="settings-row">
              <div>
                <div className="setting-label">Bit-perfect Output</div>
                <div className="setting-sublabel">
                  Bypass the OS audio mixer for direct hardware output (requires
                  exclusive device access).
                </div>
              </div>
              <span className="setting-badge">Unavailable</span>
            </div>
          </div>
        )}

        {/* TAB 6: SHORTCUTS */}
        {activeCategory === "shortcuts" && (
          <div className="settings-section-lean motion-fade-in">
            <h2 className="settings-section-title">Keyboard Shortcuts</h2>
            <p className="settings-section-desc">
              Desktop controls for rapid navigation and playback
            </p>

            <div className="settings-row">
              <span className="setting-label">Play / Pause</span>
              <kbd className="m3-kbd">Space</kbd>
            </div>
            <div className="settings-row">
              <span className="setting-label">Previous Track</span>
              <kbd className="m3-kbd">{getPrimaryModifierLabel()} + Left</kbd>
            </div>
            <div className="settings-row">
              <span className="setting-label">Next Track</span>
              <kbd className="m3-kbd">{getPrimaryModifierLabel()} + Right</kbd>
            </div>
            <div className="settings-row">
              <span className="setting-label">
                Seek Backward / Forward (5s)
              </span>
              <kbd className="m3-kbd">Left / Right</kbd>
            </div>
            <div className="settings-row">
              <span className="setting-label">Volume Up / Down</span>
              <kbd className="m3-kbd">Up / Down</kbd>
            </div>
            <div className="settings-row">
              <span className="setting-label">Toggle Mute</span>
              <kbd className="m3-kbd">M</kbd>
            </div>
          </div>
        )}

        {/* TAB 5: ABOUT */}
        {activeCategory === "about" && (
          <div className="settings-section-lean motion-fade-in">
            <h2 className="settings-section-title">About Endurance</h2>
            <p className="settings-section-desc">
              Endurance is a high-fidelity, offline-first music sanctuary with
              the tactile soul of a record room.
            </p>

            <div className="settings-row">
              <div>
                <div className="setting-label">Version</div>
                <div className="setting-sublabel">
                  Endurance v0.3 — The Record Room Edition
                </div>
              </div>
              <span className="setting-badge">v0.3.0</span>
            </div>

            <div className="settings-row">
              <div>
                <div className="setting-label">Offline Integrity</div>
                <div className="setting-sublabel">
                  Strictly zero remote network calls, tracking, or cloud
                  dependencies
                </div>
              </div>
              <span className="setting-badge-accent-wash">100% Offline</span>
            </div>

            <div className="settings-row">
              <div>
                <div className="setting-label">Source Repository</div>
                <div className="setting-sublabel">
                  Explore open-source development and release notes
                </div>
              </div>
              <a
                href="https://github.com/Endurance3000/Endurance"
                target="_blank"
                rel="noopener noreferrer"
                className="settings-link"
              >
                <span>GitHub</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
