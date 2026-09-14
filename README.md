![Endurance Logo](https://github.com/Endurance3000/Endurance/raw/main/branding/endurance-logo-master.png)

# Endurance

### A premium, open-source, offline-first music player.

Beautiful local music playback. No streaming. No cloud lock-in.

[![Latest Release](https://img.shields.io/github/v/release/Endurance3000/Endurance?style=flat-square&color=c48b71&label=Release)](https://github.com/Endurance3000/Endurance/releases/latest)
[![Platform: Windows & macOS](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-607274?style=flat-square)](https://github.com/Endurance3000/Endurance/releases/latest)
[![GitHub Stars](https://img.shields.io/github/stars/Endurance3000/Endurance?style=flat-square&color=8a6552)](https://github.com/Endurance3000/Endurance)
[![GitHub Issues](https://img.shields.io/github/issues/Endurance3000/Endurance?style=flat-square&color=789461)](https://github.com/Endurance3000/Endurance/issues)

[**Download**](#download) · [**Preview**](#preview) · [**Why Endurance?**](#why-endurance) · [**Features**](#features) · [**Tech Stack**](#technology-stack) · [**Architecture**](#architecture) · [**Build from Source**](#building-from-source) · [**Roadmap**](#roadmap) · [**Contributing**](#contributing)

---

## Overview

**Endurance** is a fast, elegant, and private desktop music player designed for people who want their music collection to live and play directly on their computer.

Built with **Tauri v2**, **Rust**, **React 19**, and **SQLite**, Endurance pairs high-performance local directory scanning with a warm, Material 3-inspired user interface, an editable offline LRC lyrics experience, a floating Mini Player, and two-state shuffle queue management — now with early cross-platform support for **Windows and macOS**.

---

## Download

### Latest Release — v0.2.0

Endurance v0.2.0 is a major feature release focused on accessibility, an offline Lyrics Editor, a Mini Player, a native startup screen, and cross-platform desktop support.

[![Download Latest Release](https://img.shields.io/badge/Download-Endurance%20v0.2.0-c48b71?style=for-the-badge)](https://github.com/Endurance3000/Endurance/releases/latest)

#### Available Package Formats on the [Releases Page](https://github.com/Endurance3000/Endurance/releases/latest):

**Windows**
- **`Endurance_0.2.0_x64-setup.exe`** — Standard NSIS setup installer (*recommended for most users*).
- **`Endurance_0.2.0_x64_en-US.msi`** — Windows Installer package (*ideal for enterprise and managed environments*).

**macOS** *(new in v0.2.0)*
- **Apple Silicon / ARM64 `.dmg`** — for M-series Macs.
- **Intel x64 `.dmg`** — for Intel-based Macs.

> **Note:** macOS packages build and install successfully on both architectures, but runtime validation on physical macOS hardware is still in progress. Windows remains the fully verified, primary platform.

---

## Why Endurance?

- **Your Music Stays Yours** — Plays audio directly from your local filesystem without moving, altering, or re-encoding your files.
- **Offline-First by Design** — No cloud accounts, remote servers, streaming lock-in, or telemetry. Every installation is self-contained.
- **Warm, Expressive Interface** — Built on Material 3 design principles with dynamic color extraction from album art, smooth transitions, and an organic sine-wave playback scrubber.
- **Lightweight & Fast** — Powered by a multi-threaded Rust backend with a local SQLite database that starts quickly and uses minimal system resources.
- **Accessible by Default** — Full keyboard navigation, visible focus indicators, and platform-appropriate shortcuts (`Ctrl` on Windows, `⌘` on macOS).
- **Open & Transparent** — Built with modern open-source technologies with a clear codebase open to community contributions.

---

## Preview

### Homepage
*Recent tracks, listening statistics, and quick navigation across your collection.*

![Endurance Homepage](https://github.com/Endurance3000/Endurance/raw/main/branding/Screenshot-Homepage.png)

### Library View
*Fast local collection browsing with instant search, multi-field sorting, and album artwork.*

![Endurance Library](https://github.com/Endurance3000/Endurance/raw/main/branding/Screenshot-Library.png)

### Player — Light Theme
*Full player view with synchronized LRC lyrics and ambient album art tonal colors.*

![Endurance Player - Light Theme](<https://github.com/Endurance3000/Endurance/raw/main/branding/Screenshot-Player (Light).png>)

### Player — Dark Theme
*Immersive dark mode with expressive sine-wave scrubbing and active line lyric emphasis.*

![Endurance Player - Dark Theme](<https://github.com/Endurance3000/Endurance/raw/main/branding/Screenshot-Player (Dark).png>)

---

## Features

### 📁 Library & File Management
- **Folder-Based Indexing** — Add one or more music directories; files are scanned and indexed recursively.
- **Fast Metadata Extraction** — Uses pure Rust [`lofty`](https://crates.io/crates/lofty) to read ID3v1/v2 and MP4/ILST tags (title, artist, album, album artist, genre, year, track number, disc number).
- **Album Artwork Caching** — Embedded pictures are extracted, hashed via SHA-256, and cached locally on disk.
- **Deterministic Track Identity** — Tracks receive stable IDs derived from canonical paths, preserving favorites, history, and play counts across restarts.
- **Graceful Missing-File Handling** — If a storage drive is disconnected, tracks remain safely marked as unavailable rather than removed from your database.

### 🎵 Audio Engine & Playback
- **Native Audio Pipeline** — Centralized audio pipeline utilizing custom Tauri asset streaming and hardware-accelerated Web Audio / HTML5 Audio decoding.
- **Supported Audio Formats** — High-fidelity playback for **MP3** (`.mp3`) and **M4A / AAC / ALAC** (`.m4a`).
- **Expressive Wave Slider** — An animated sine-wave progress scrubber that dynamically pulses with playback, supporting pointer scrubbing, bounds clamping, and keyboard seeking.
- **Volume & Mute Control** — Accurate linear volume slider, remapped for perceptual accuracy, with automatic local state persistence.

### 🪟 Mini Player *(new in v0.2.0)*
- **Compact Floating Window** — A dedicated Mini Player window with album art, title, artist, and essential playback controls.
- **Always-on-Top** — Stays visible above other windows so playback controls are always within reach.
- **Shared Playback State** — Fully synchronized with the main Endurance window via an internal playback bridge — no drift between the two.

### ✍️ Offline Lyrics & Lyrics Editor *(editor new in v0.2.0)*
- **Automatic Local Discovery** — Automatically detects `.lrc` lyric files located in the same folder as the audio track, with deterministic file resolution.
- **Built-In Lyrics Editor** — Write, paste, or edit lyrics directly inside Endurance, for both plain and time-synced formats.
- **Timestamp Detection & Sync** — Automatically detects timestamped lines and synchronizes them with playback; timestamps can be adjusted manually.
- **Safe Native Saving** — Edits are parsed, serialized, and written back to disk using an atomic, conflict-safe save — your original lyrics file is never left in a corrupted state.
- **Robust Encoding Support** — Decodes UTF-8 (with or without BOM), UTF-16 LE, and UTF-16 BE files.
- **Interactive Seeking** — Synchronized active line highlighting with past/future lyric fading; click any lyric line to jump audio playback directly to that timestamp.
- **Untimed Lyrics Fallback** — Clean typographic presentation for plain text lyrics without timestamps.

### 🔀 Queue & Two-State Shuffle
- **Smart Queue Drawer** — Add songs, insert tracks via "Play Next", remove upcoming songs, or clear the queue.
- **Fluid Pointer Reordering** — Reorder tracks with a custom Pointer Events capture system designed for reliable desktop interaction.
- **Two-State Shuffle System**:
  * **Shuffle OFF** — Restores your upcoming queue to alphabetical library order while keeping the currently playing track active.
  * **Shuffle ON** — Generates a fresh, mathematically guaranteed Fisher-Yates random sequence with zero duplicate plays within a cycle.
- **Repeat Modes** — Cycle through Repeat Off, Repeat One (loop current track), and Repeat All (loop queue).

### 🎨 Themes & Design System
- **Curated Appearance Modes** — Switch between **Dark**, **Light**, and **System** themes.
- **Dynamic Artwork Palette** — Automatically extracts dominant colors from album artwork to apply subtle, harmonious color accents across the interface.
- **High Contrast Mode** — Built-in accessibility theme featuring solid borders, high contrast ratios, and clear focus indicators.
- **Native Startup Screen** *(new in v0.2.0)* — A branded loading screen covers app initialization, so no blank window ever appears before Endurance is ready.

### ⌨️ Accessibility & Keyboard Navigation *(expanded in v0.2.0)*
- **Platform-Appropriate Shortcuts** — Uses `Ctrl` on Windows and `⌘` on macOS.
- **Visible Focus Indicators** — Clear, high-contrast focus rings across the entire interface.
- **Managed Focus for Overlays** — Dialogs, drawers, and the lyrics editor correctly trap and restore keyboard focus.
- **Full Keyboard Control** — Playback, seeking, queue, shuffle, repeat, volume, and mute are all reachable without a mouse.

### 📊 Local History & Favorites
- **Playback History** — Automatically logs completed listening sessions to SQLite after 15 seconds or 30% playback duration (recorded once per session).
- **One-Click Favorites** — Mark favorite tracks instantly with indexed database querying for rapid filtering.

---

## Offline & Privacy Architecture

Endurance is built from the ground up as an **offline-first local desktop application**:

- **Local Storage** — Your music library, playback history, favorites, lyrics, and preferences are stored exclusively on your machine in a local SQLite database (`endurance.db`) plus local lyric files.
- **Isolated User Data** — Database files and artwork caches are placed in your standard OS application data directory (e.g. `%APPDATA%\com.endurance.player\` on Windows), ensuring application updates never overwrite your listening data.
- **No Network Dependency** — The core application requires no internet connection to scan, index, organize, edit lyrics for, or play your music library.

---

## Technology Stack

| Component              | Technology                                                                        | Purpose                                                         |
| ---------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Desktop Shell**      | [Tauri v2](https://tauri.app/)                                                    | Secure, lightweight native window and system bridge, now with multi-window (Main + Mini Player) support |
| **Native Core**        | [Rust](https://www.rust-lang.org/)                                                | Multi-threaded file scanner, IPC handlers, tag processing, and LRC read/write |
| **Local Database**     | [SQLite](https://sqlite.org/) via [`rusqlite`](https://crates.io/crates/rusqlite) | Local relational storage with WAL mode and versioned migrations |
| **Audio Metadata**     | [`lofty`](https://crates.io/crates/lofty)                                         | Fast, pure Rust audio container and tag parser                  |
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)    | Type-safe UI components and reactive state management           |
| **Build Tooling**      | [Vite 6](https://vitejs.dev/)                                                     | Development server and production frontend bundler              |
| **Icons & UI**         | [Lucide React](https://lucide.dev/)                                               | Clean, consistent interface iconography                         |

---

## Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                        REACT 19 FRONTEND                          │
│  Pages • PlaybackContext • ThemeContext • WaveSlider              │
│  Mini Player UI • Lyrics Editor UI • Startup Screen                │
└──────────────────────────────┬────────────────────────────────────┘
                               │
                       Tauri IPC Bridge (Main + Mini Player windows)
                               │
┌──────────────────────────────┴────────────────────────────────────┐
│                       RUST TAURI BACKEND                           │
│  commands.rs • LibraryScanner • LoftyMetadataReader                │
│  Mini Player window lifecycle • LRC parser/serializer • Lyrics I/O │
└──────────────────────────────┬────────────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────────┐
│    LOCAL SQLITE DB    │             │     LOCAL FILESYSTEM       │
│  tracks • folders     │             │  Music Directory            │
│  history • prefs      │             │  Artwork Cache (.bin)       │
│                       │             │  Editable .lrc Lyric Files  │
└───────────────────────┘             └───────────────────────────┘
```

---

## Installation & Getting Started

### For End Users (Windows)
1. Open the [**Latest Release**](https://github.com/Endurance3000/Endurance/releases/latest) page.
2. Download `Endurance_0.2.0_x64-setup.exe` (or the `.msi` package).
3. Run the installer and launch **Endurance**.
4. Click **Add Music Folder** (or navigate to **Settings → Library**) to select your local music folder.

### For End Users (macOS) *(early support)*
1. Open the [**Latest Release**](https://github.com/Endurance3000/Endurance/releases/latest) page.
2. Download the `.dmg` matching your Mac's architecture (Apple Silicon / ARM64 or Intel x64).
3. Open the `.dmg` and drag **Endurance** into Applications.
4. Launch Endurance and add your local music folder from **Settings → Library**.

> macOS support is new in v0.2.0 and has not yet been fully validated on physical hardware — please [report issues](#issue-reporting--support) you encounter.

---

## System Requirements

- **Supported Operating Systems**: Windows 10 / Windows 11 (64-bit); macOS (Apple Silicon or Intel) — *early support, hardware validation in progress*.
- **Web Runtime**: [Microsoft Edge WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) on Windows (included by default on modern Windows).
- **Disk Space**: ~30 MB for application installation.

---

## Building from Source

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (MSVC toolchain on Windows) or Xcode Command Line Tools (macOS)

### 1. Clone the Repository
```
git clone https://github.com/Endurance3000/Endurance.git
cd Endurance
```

### 2. Install Dependencies
```
npm install
```

### 3. Run Development Build
```
npm run tauri dev
```

### 4. Run Test Suites
```
# Run frontend unit tests (Node.js test runner)
npm test

# Run Rust unit tests
cd src-tauri
cargo test
cd ..
```

### 5. Build Production Binaries
```
npm run tauri build
```

The output artifacts will be placed in:
- `src-tauri/target/release/bundle/nsis/` (`.exe` installer, Windows)
- `src-tauri/target/release/bundle/msi/` (`.msi` installer, Windows)
- `src-tauri/target/release/bundle/dmg/` (`.dmg` package, macOS)
- `src-tauri/target/release/endurance` / `endurance.exe` (standalone executable)

---

## Project Structure

```
Endurance/
├── .github/workflows/         # CI: cross-platform build & packaging pipelines
├── branding/                  # Logo master assets and brand guidelines
├── public/                    # Static web assets (favicon, app logo)
├── src/                       # React frontend application
│   ├── animations/            # Keyframe transitions and motion definitions
│   ├── components/            # UI components (Common, Library, Player, Queue, Sidebar, Mini Player, Lyrics Editor)
│   ├── pages/                 # Main application views (Home, Songs, Favorites, Settings)
│   ├── services/               # AudioEngine, historyService, preferencesService
│   ├── state/                 # PlaybackContext, ThemeContext
│   ├── themes/                # CSS tokens, color palettes, high-contrast styles
│   └── types/                 # Core TypeScript definitions
├── src-tauri/                  # Rust native desktop layer
│   ├── src/
│   │   ├── artwork/            # Artwork caching and SHA-256 storage
│   │   ├── db/                 # SQLite connection, queries, and migrations
│   │   ├── lyrics/             # LRC discovery, parsing, editing, serialization, and BOM decoding
│   │   ├── metadata/           # Audio container tag extraction via Lofty
│   │   ├── models/             # Shared Rust data models
│   │   ├── scanner/            # Recursive file traversal and indexing
│   │   ├── window/              # Main + Mini Player window lifecycle management
│   │   ├── commands.rs          # Tauri IPC command definitions
│   │   └── lib.rs               # Application builder and setup
│   ├── icons/                  # Multi-resolution application icons
│   └── tauri.conf.json         # Tauri window and bundle configuration
├── package.json                # Frontend scripts and dependencies
└── tsconfig.json                # TypeScript compiler configuration
```

---

## Supported Formats

| Format  | Extension | Tagging Standard           | Supported Features                                              |
| ------- | --------- | -------------------------- | --------------------------------------------------------------- |
| **MP3** | `.mp3`    | ID3v1, ID3v2.3, ID3v2.4    | Playback, Tag extraction, Embedded artwork, LRC sync & editing   |
| **M4A** | `.m4a`    | MP4 iTunes Metadata (ILST) | AAC / ALAC playback, Tag extraction, Embedded artwork, LRC sync & editing |

---

## Roadmap

### v0.1.0 — Released
- [x] Local music library scanning and indexing
- [x] MP3 and M4A playback
- [x] Playback queue and queue management
- [x] Shuffle and repeat modes
- [x] Synchronized offline LRC lyrics
- [x] Playback history and favorites
- [x] Dynamic artwork-based theming
- [x] Light, Dark, System, and High Contrast themes
- [x] Material 3-inspired interface
- [x] Expressive waveform seek bar
- [x] Windows installer and application branding
- [x] GitHub Release with Windows installers
- [x] README documentation and application previews

### v0.2.0 — Released
Endurance v0.2.0 shipped with a focus on accessibility, offline lyrics editing, the Mini Player, a native startup experience, and cross-platform support.

**Playback & Controls**
- [x] Fixed and improved keyboard shortcuts across the entire application
- [x] Improved volume slider accuracy and audio-volume mapping
- [x] Improved keyboard accessibility and focus behavior
- [x] Regression-tested playback controls, seeking, queue, shuffle, repeat, volume, and mute

**Mini Player**
- [x] Compact floating Mini Player
- [x] Always-on-top window behavior
- [x] Album artwork, song title, and artist display
- [x] Essential playback controls and progress
- [x] Shared playback state with the main Endurance window
- [x] Cross-platform Mini Player support

**User-Created Offline Lyrics**
- [x] Lyrics editor for writing or pasting custom lyrics
- [x] Automatic detection of timestamped lyrics
- [x] Automatic synchronization of timestamped lyrics with playback
- [x] Support for both plain and synchronized user-created lyrics
- [x] Editing and replacing existing lyrics
- [x] Adjustable lyric timestamps for synchronization
- [x] Local storage of user-created lyrics alongside the user's music
- [x] Preserved the existing offline lyrics experience

**UI & Experience**
- [x] Improved song-list hover states so titles and artists highlight as one cohesive row
- [x] Preserved clear visual hierarchy between song titles and artist names
- [x] Refined Material 3-inspired interactions and animations
- [x] Improved overall accessibility and keyboard navigation

**Startup Experience**
- [x] Branded startup/loading screen during initialization
- [x] Eliminated blank/uninitialized UI on startup
- [x] Smooth transition from startup into the main application
- [x] Lightweight startup with no added launch delay

**Cross-Platform & macOS**
- [x] Cross-platform compatibility improvements
- [x] macOS-native window and title-bar behavior
- [x] Platform-appropriate keyboard shortcuts (`Ctrl` on Windows, `⌘` on macOS)
- [x] macOS application packaging (Apple Silicon and Intel `.dmg`)
- [ ] Runtime testing and validation on physical macOS hardware
- [ ] macOS distribution signing/notarization
- [x] Shared playback, library, lyrics, themes, and database functionality across platforms

### v0.3.0 — Planned

**Online Lyrics**
- [ ] Introduce optional online lyrics functionality
- [ ] Research and integrate a reliable lyrics provider/API
- [ ] Search for lyrics using song metadata
- [ ] Fetch synchronized lyrics when available
- [ ] Fall back to plain lyrics when synchronized lyrics are unavailable
- [ ] Keep locally stored/user-created lyrics available offline
- [ ] Prioritize local lyrics before attempting an online lookup
- [ ] Handle unavailable lyrics and network failures gracefully
- [ ] Consider local caching of successfully retrieved lyrics
- [ ] Clearly separate online functionality from the core offline player

**Online & Offline Architecture**
- [ ] Keep Endurance fully usable without an internet connection
- [ ] Make online services optional rather than required
- [ ] Avoid making playback dependent on online services
- [ ] Design a clean provider abstraction for future online features

**macOS Completion**
- [ ] Complete physical hardware validation
- [ ] Finalize signing and notarization for public distribution

### Future

**Library & Organization**
- [ ] Playlists and playlist management
- [ ] Improved album browsing
- [ ] Improved artist browsing
- [ ] Advanced library management
- [ ] Better sorting and filtering options

**Playback**
- [ ] Sleep timer
- [ ] Additional playback customization
- [ ] Further audio and player improvements

**Lyrics**
- [ ] Advanced lyrics synchronization tools
- [ ] Improved lyrics editing experience
- [ ] Additional lyrics providers

**Platform Support**
- [ ] Continued macOS improvements
- [ ] Evaluate additional desktop platforms
- [ ] Platform-specific polish and native integrations

---

## Contributing

Contributions from the open-source community are welcome.

### Contribution Workflow
1. **Fork** the repository on GitHub.
2. **Create a Feature Branch**:
```
git checkout -b feature/your-feature-name
```
3. **Commit your changes**:
```
git commit -m "feat: describe your change"
```
4. **Run Verification**:
```
npm test
npx tsc --noEmit
cd src-tauri && cargo test && cd ..
```
5. **Open a Pull Request** explaining the intent and testing approach.

### Guidelines
- Keep pull requests focused on a single feature or bug fix.
- Maintain the existing offline-first design and avoid introducing unnecessary external dependencies.
- Ensure both frontend and Rust tests pass before opening a PR.

---

## Issue Reporting & Support

If you encounter a bug or have a suggestion:

- Open an issue on the [**GitHub Issues**](https://github.com/Endurance3000/Endurance/issues) tracker.
- In bug reports, please include:
  * Endurance version (e.g., `v0.2.0`)
  * Operating system and version (e.g., Windows 11 23H2, macOS Sonoma)
  * Audio file format (e.g., MP3 / M4A)
  * Steps to reproduce the issue and observed vs. expected behavior

---

## Releases

- [**Latest Release (v0.2.0)**](https://github.com/Endurance3000/Endurance/releases/latest)
- [**All Releases**](https://github.com/Endurance3000/Endurance/releases)
- The next version (v0.3.0) is under active development, focused on optional online lyrics and completing macOS distribution.
- Feel free to suggest features to be added in upcoming versions via [Issues](https://github.com/Endurance3000/Endurance/issues).

---

## License

Endurance is currently being prepared as an open-source project. A formal open-source license will be established in the repository root before accepting external contributions under a defined license.

---

Made with care for people who still own their music.
**Endurance — Local music, beautifully played.**