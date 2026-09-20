<div align="center">

<img src="https://github.com/Endurance3000/Endurance/raw/main/branding/endurance-logo-master.png" alt="Endurance Logo" width="140">

# Endurance

### A premium, open-source, offline-first music player.

**Beautiful local music playback. No streaming. No cloud lock-in. No accounts.**

<br>

[![Latest Release](https://img.shields.io/github/v/release/Endurance3000/Endurance?style=for-the-badge&color=c48b71&label=Release)](https://github.com/Endurance3000/Endurance/releases/latest)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-607274?style=for-the-badge)](https://github.com/Endurance3000/Endurance/releases/latest)
[![License](https://img.shields.io/badge/License-Pending-8a6552?style=for-the-badge)](#license)
[![Stars](https://img.shields.io/github/stars/Endurance3000/Endurance?style=for-the-badge&color=789461)](https://github.com/Endurance3000/Endurance/stargazers)

<br>

<a href="https://github.com/Endurance3000/Endurance/releases/latest"><img src="https://img.shields.io/badge/⬇%20Download%20Latest%20Release-c48b71?style=for-the-badge&logoColor=white" alt="Download"></a>
<a href="#preview"><img src="https://img.shields.io/badge/👀%20See%20Screenshots-607274?style=for-the-badge&logoColor=white" alt="Preview"></a>
<a href="https://github.com/Endurance3000/Endurance/issues/new/choose"><img src="https://img.shields.io/badge/🐛%20Report%20a%20Bug-8a6552?style=for-the-badge&logoColor=white" alt="Report a Bug"></a>
<a href="https://github.com/Endurance3000/Endurance/issues/new/choose"><img src="https://img.shields.io/badge/💡%20Request%20a%20Feature-789461?style=for-the-badge&logoColor=white" alt="Request a Feature"></a>

</div>

<br>

<p align="center">
  <a href="#download"><b>Download</b></a> ·
  <a href="#why-endurance"><b>Why Endurance?</b></a> ·
  <a href="#preview"><b>Preview</b></a> ·
  <a href="#features"><b>Features</b></a> ·
  <a href="#technology-stack"><b>Tech Stack</b></a> ·
  <a href="#architecture"><b>Architecture</b></a> ·
  <a href="#building-from-source"><b>Build from Source</b></a> ·
  <a href="#roadmap"><b>Roadmap</b></a> ·
  <a href="#contributing"><b>Contributing</b></a> ·
  <a href="#issue-reporting--support"><b>Support</b></a>
</p>

---

## Overview

**Endurance** is a fast, elegant, and private desktop music player designed for people who want their music collection to live and play directly on their computer.

Built with **Tauri v2**, **Rust**, **React 19**, and **SQLite**, Endurance pairs high-performance local directory scanning with a warm, Material 3-inspired interface, an editable offline LRC lyrics experience, a floating Mini Player, and two-state shuffle queue management — now with cross-platform support for **Windows and macOS**.

---

## Download

<div align="center">

### 🚀 Latest Release — v0.2.0

Endurance v0.2.0 is a major feature release focused on accessibility, an offline Lyrics Editor, a Mini Player, a native startup screen, and cross-platform desktop support.

<a href="https://github.com/Endurance3000/Endurance/releases/latest"><img src="https://img.shields.io/badge/Download%20for%20Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Download for Windows"></a>
<a href="https://github.com/Endurance3000/Endurance/releases/latest"><img src="https://img.shields.io/badge/Download%20for%20macOS-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Download for macOS"></a>

</div>

#### Available Package Formats — [Releases Page →](https://github.com/Endurance3000/Endurance/releases/latest)

| Platform | Package | Notes |
| --- | --- | --- |
| 🪟 Windows | `Endurance_0.2.0_x64-setup.exe` | Standard NSIS installer — recommended for most users |
| 🪟 Windows | `Endurance_0.2.0_x64_en-US.msi` | MSI package — ideal for enterprise/managed environments |
| 🍎 macOS (Apple Silicon) | `.dmg` (ARM64) | For M-series Macs *(new in v0.2.0)* |
| 🍎 macOS (Intel) | `.dmg` (x64) | For Intel-based Macs *(new in v0.2.0)* |

> ⚠️ **Note:** macOS packages build and install successfully on both architectures, but runtime validation on physical macOS hardware is still in progress and slated for **v0.3.0**. Windows remains the fully verified, primary platform.

---

## Why Endurance?

| | |
| --- | --- |
| 🔒 **Your Music Stays Yours** | Plays audio directly from your local filesystem without moving, altering, or re-encoding your files. |
| 📡 **Offline-First by Design** | No cloud accounts, remote servers, streaming lock-in, or telemetry. Every installation is self-contained. |
| 🎨 **Warm, Expressive Interface** | Material 3-inspired design with dynamic color extraction from album art and an organic sine-wave scrubber. |
| ⚡ **Lightweight & Fast** | A multi-threaded Rust backend with a local SQLite database that starts quickly and uses minimal resources. |
| ⌨️ **Accessible by Default** | Full keyboard navigation, visible focus indicators, and platform-appropriate shortcuts (`Ctrl` / `⌘`). |
| 🌱 **Open & Transparent** | Modern open-source technologies with a clear codebase, open to community contributions. |

---

## Preview

<div align="center">

### Homepage
*Recent tracks, listening statistics, and quick navigation across your collection.*

<img src="https://github.com/Endurance3000/Endurance/raw/main/branding/Screenshot-Homepage.png" alt="Endurance Homepage" width="800">

<br><br>

### Library View
*Fast local collection browsing with instant search, multi-field sorting, and album artwork.*

<img src="https://github.com/Endurance3000/Endurance/raw/main/branding/Screenshot-Library.png" alt="Endurance Library" width="800">

<br><br>

### Player — Light & Dark
*Full player view with synchronized LRC lyrics, ambient album-art tonal colors, and the expressive sine-wave scrubber.*

<img src="https://github.com/Endurance3000/Endurance/raw/main/branding/Screenshot-Player (Light).png" alt="Endurance Player - Light Theme" width="390">
<img src="https://github.com/Endurance3000/Endurance/raw/main/branding/Screenshot-Player (Dark).png" alt="Endurance Player - Dark Theme" width="390">

</div>

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

| Component | Technology | Purpose |
| --- | --- | --- |
| **Desktop Shell** | [Tauri v2](https://tauri.app/) | Secure, lightweight native window and system bridge, with multi-window (Main + Mini Player) support |
| **Native Core** | [Rust](https://www.rust-lang.org/) | Multi-threaded file scanner, IPC handlers, tag processing, and LRC read/write |
| **Local Database** | [SQLite](https://sqlite.org/) via [`rusqlite`](https://crates.io/crates/rusqlite) | Local relational storage with WAL mode and versioned migrations |
| **Audio Metadata** | [`lofty`](https://crates.io/crates/lofty) | Fast, pure Rust audio container and tag parser |
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) | Type-safe UI components and reactive state management |
| **Build Tooling** | [Vite 6](https://vitejs.dev/) | Development server and production frontend bundler |
| **Icons & UI** | [Lucide React](https://lucide.dev/) | Clean, consistent interface iconography |

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

### 🪟 For End Users (Windows)
1. Open the [**Latest Release**](https://github.com/Endurance3000/Endurance/releases/latest) page.
2. Download `Endurance_0.2.0_x64-setup.exe` (or the `.msi` package).
3. Run the installer and launch **Endurance**.
4. Click **Add Music Folder** (or navigate to **Settings → Library**) to select your local music folder.

### 🍎 For End Users (macOS) *(early support)*
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
```bash
git clone https://github.com/Endurance3000/Endurance.git
cd Endurance
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Build
```bash
npm run tauri dev
```

### 4. Run Test Suites
```bash
# Run frontend unit tests (Node.js test runner)
npm test

# Run Rust unit tests
cd src-tauri
cargo test
cd ..
```

### 5. Build Production Binaries
```bash
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

| Format | Extension | Tagging Standard | Supported Features |
| --- | --- | --- | --- |
| **MP3** | `.mp3` | ID3v1, ID3v2.3, ID3v2.4 | Playback, Tag extraction, Embedded artwork, LRC sync & editing |
| **M4A** | `.m4a` | MP4 iTunes Metadata (ILST) | AAC / ALAC playback, Tag extraction, Embedded artwork, LRC sync & editing |

---

## Roadmap

<p>
  <a href="https://github.com/Endurance3000/Endurance/milestones"><img src="https://img.shields.io/badge/View%20Milestones%20on%20GitHub-24292F?style=flat-square&logo=github&logoColor=white" alt="View Milestones"></a>
  <a href="https://github.com/Endurance3000/Endurance/issues"><img src="https://img.shields.io/badge/Suggest%20a%20Roadmap%20Item-24292F?style=flat-square&logo=github&logoColor=white" alt="Suggest a Roadmap Item"></a>
</p>

### v0.1.0 — ✅ Released
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

<details open>
<summary><h3>v0.2.0 — ✅ Released</h3></summary>

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
- [x] Shared playback, library, lyrics, themes, and database functionality across platforms
- [ ] Runtime testing and validation on physical macOS hardware *(→ moved to v0.3.0)*
- [ ] macOS distribution signing/notarization *(→ moved to v0.3.0)*

</details>

<details open>
<summary><h3>v0.3.0 — 🚧 In Planning</h3></summary>

With v0.2.0 officially released, v0.3.0 is scoped around **four pillars**: core usability, the Home experience, lyrics/music features, and platform robustness — rather than a loose backlog dump. Priority is split into **Core**, **Polish**, and **Distribution / Maintenance** tiers.

#### 🏠 Home / Library Experience — *Core*
One of the headline features of v0.3.0.
- [ ] Completely redesign the Home / empty-library screen
- [ ] Remove technical/developer information from the Home screen (SQLite, supported formats, implementation details, "local-first" explanations, Material 3/Pixel references)
- [ ] Create a proper music-player empty state
- [ ] Add a clear **Add Music / Select Music Folder** action
- [ ] Surface useful content once music exists — **Recently Played**, **Recently Added**, a simple listening section
- [ ] Make the Home screen feel like part of the player, not documentation
- [ ] Preserve Endurance's existing warm/premium visual language *(kept intentionally scoped — not a full Spotify-style homepage yet)*

#### File Opening / Windows Integration — *Core*

- [ ] Register Endurance as a handler for supported audio file types
- [ ] Open supported audio file types from Windows File Explorer
- [ ] Automatically select and play the opened track
- [ ] Handle file paths containing spaces and special characters
- [ ] Handle missing, invalid, or unsupported files gracefully
- [ ] Handle multiple files opened together where supported
- [ ] Forward files to an existing Endurance instance instead of unnecessarily creating duplicate instances
- [ ] Add equivalent file-opening support for macOS Finder

#### Common Audio Format Support — *Core*

- [ ] Add FLAC (`.flac`) library scanning and indexing
- [ ] Add WAV (`.wav`) library scanning and playback
- [ ] Add OGG Vorbis (`.ogg`) library scanning and playback
- [ ] Add Opus (`.opus`) library scanning and playback
- [ ] Add AAC (`.aac`) library scanning and playback
- [ ] Add AIFF (`.aiff`, `.aif`) library scanning and playback
- [ ] Verify metadata extraction for each supported format
- [ ] Verify embedded artwork handling for each supported format
- [ ] Verify seeking, queue, shuffle, repeat, volume, and playback history
- [ ] Integrate supported formats with lyrics, Lyrics Editor, favorites, Mini Player, and dynamic artwork
- [ ] Add automated format-specific regression tests
- [ ] Verify supported formats on Windows and macOS

#### 🖍️ Text-Selection Behavior — *Core*
- [ ] Disable browser-like text selection throughout the application
- [ ] Prevent unintended text selection when dragging across the UI
- [ ] Preserve selection/editing where it's actually useful — inputs, textareas, Lyrics Editor fields
- [ ] Verify behavior across Main Player, song lists, sidebar, Settings, Mini Player, and Lyrics Editor

#### 🎤 Online Lyrics & Local/Online Integration — *Core, Major Feature*
Builds on the v0.2.0 Lyrics Editor rather than reworking it.
- [ ] Design the online lyrics architecture and provider abstraction
- [ ] Search/fetch lyrics for a track from a reliable provider/API
- [ ] Let the user pick the correct result when multiple matches exist
- [ ] Import fetched lyrics into the local Lyrics Editor and save as a local `.lrc`
- [ ] Keep saved lyrics fully usable offline afterward
- [ ] Handle no-result, error, and network-failure cases cleanly
- [ ] Never make online lyrics mandatory for playback

> **Architecture principle:** the local `.lrc` remains the persistent source of truth. Flow: **Local LRC → use immediately**, or when none exists, **online search → user picks a result → save locally → future playback uses the local file.** This keeps the online feature strictly optional and true to Endurance's offline-first design.

#### ✍️ Lyrics Editor Improvements — *Polish*
- [ ] Refine the editing workflow based on real usage
- [ ] Improve timestamp editing and line adding/removal
- [ ] Improve metadata editing
- [ ] Explore a better timestamp creation workflow, potentially playback-assisted *(advanced karaoke/timing tools not committed to yet)*

#### 🎧 Playback & Library Polish — *Polish*
Investigation-first items, not all guaranteed as shipped features:
- [ ] Improve queue management
- [ ] Improve recently played / history experience
- [ ] Improve library sorting, filtering, and search
- [ ] Improve playback state persistence
- [ ] Improve track metadata presentation and artwork cache handling
- [ ] Review gapless / track-transition behavior and MP3/M4A playback edge cases

#### 🍎 macOS Physical Validation — *Core*
Deliberately deferred from v0.2.0, now scheduled for v0.3.0.
- [ ] Test the ARM64 build on real Apple Silicon hardware
- [ ] Test the Intel build where hardware is available
- [ ] Verify native title bar and traffic-light controls
- [ ] Verify audio playback, Mini Player, lyrics, and Lyrics Editor
- [ ] Verify keyboard shortcuts and splash screen
- [ ] Verify file/folder operations and file-opening behavior
- [ ] Fix any platform-specific issues discovered during testing

#### 📦 macOS Distribution — *Distribution, later*
- [ ] Decide macOS distribution format
- [ ] Configure Apple application signing and notarization
- [ ] Test a signed/notarized build
- [ ] Update GitHub Actions accordingly
- [ ] Document the macOS installation/distribution process

#### 🛠️ CI / Build Maintenance — *Maintenance*
- [ ] Update GitHub Actions dependencies causing Node.js 20 warnings
- [ ] Re-run Windows/macOS packaging and verify all artifacts still build

#### 🌤️ Startup Polish — *Polish*
- [ ] Investigate a brief white window/flash before the splash screen appears, so the flow is a clean **Launch → Splash → Main UI** with no artificial delay

#### 🧭 Desktop-Native Polish — *Polish*
A pass to move Endurance from "working desktop project" toward "polished desktop application":
- [ ] Review focus behavior and keyboard navigation throughout
- [ ] Review hover / pressed / focus states, context menus, dialogs, and overlays
- [ ] Review window resizing and Mini Player behavior
- [ ] Review accessibility labels
- [ ] Review accidental text selection/dragging
- [ ] Review empty states and error states

#### 🚫 Explicitly Out of Scope for v0.3.0
To keep the milestone realistic, the following are intentionally deferred:
Android/iOS support · cloud synchronization · streaming music · user accounts · social features · an online database · automatic AI-generated lyrics · a full playlist system · music discovery/recommendation engine · a major database redesign · a completely new visual design system.

</details>

### Future
**Library & Organization**
- [ ] Playlists and playlist management
- [ ] Improved album and artist browsing
- [ ] Advanced library management, sorting, and filtering

**Playback**
- [ ] Sleep timer
- [ ] Additional playback customization

**Lyrics**
- [ ] Advanced lyrics synchronization tools
- [ ] Additional lyrics providers

**Platform Support**
- [ ] Continued macOS improvements
- [ ] Evaluate additional desktop platforms

---

## Contributing

<p>
  <a href="https://github.com/Endurance3000/Endurance/fork"><img src="https://img.shields.io/badge/🍴%20Fork%20the%20Repo-24292F?style=flat-square&logo=github&logoColor=white" alt="Fork the Repo"></a>
  <a href="https://github.com/Endurance3000/Endurance/pulls"><img src="https://img.shields.io/badge/🔀%20Open%20a%20Pull%20Request-24292F?style=flat-square&logo=github&logoColor=white" alt="Open a Pull Request"></a>
</p>

Contributions from the open-source community are welcome.

### Contribution Workflow
1. **Fork** the repository on GitHub.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit your changes**:
   ```bash
   git commit -m "feat: describe your change"
   ```
4. **Run Verification**:
   ```bash
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

<p>
  <a href="https://github.com/Endurance3000/Endurance/issues/new/choose"><img src="https://img.shields.io/badge/🐛%20Open%20a%20Bug%20Report-c62828?style=flat-square" alt="Open a Bug Report"></a>
  <a href="https://github.com/Endurance3000/Endurance/issues/new/choose"><img src="https://img.shields.io/badge/💡%20Request%20a%20Feature-2e7d32?style=flat-square" alt="Request a Feature"></a>
  <a href="https://github.com/Endurance3000/Endurance/issues"><img src="https://img.shields.io/badge/📋%20Browse%20All%20Issues-455a64?style=flat-square" alt="Browse All Issues"></a>
</p>

In bug reports, please include:
- Endurance version (e.g., `v0.2.0`)
- Operating system and version (e.g., Windows 11 23H2, macOS Sonoma)
- Audio file format (e.g., MP3 / M4A)
- Steps to reproduce the issue and observed vs. expected behavior

---

## Releases

<p>
  <a href="https://github.com/Endurance3000/Endurance/releases/latest"><img src="https://img.shields.io/badge/Latest%20Release%20—%20v0.2.0-c48b71?style=flat-square" alt="Latest Release"></a>
  <a href="https://github.com/Endurance3000/Endurance/releases"><img src="https://img.shields.io/badge/All%20Releases-607274?style=flat-square" alt="All Releases"></a>
</p>

v0.3.0 is under active development, centered on the Home/Library redesign, Windows File Explorer integration, optional online lyrics, and completing macOS hardware validation and distribution. Feature suggestions are always welcome via [Issues](https://github.com/Endurance3000/Endurance/issues).

---

## License

Endurance is currently being prepared as an open-source project. A formal open-source license will be established in the repository root before accepting external contributions under a defined license.

---

<div align="center">

Made with care for people who still own their music.

**Endurance — Local music, beautifully played.**

<a href="https://github.com/Endurance3000/Endurance"><img src="https://img.shields.io/badge/⭐%20Star%20this%20repo-c48b71?style=for-the-badge" alt="Star this repo"></a>

</div>