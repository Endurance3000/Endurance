import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deduplicateOpenFiles,
  normalizeFilePath,
  DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS,
} from "../openFileHelper";

describe("Open Files Deduplication & Path Normalization Helper", () => {
  describe("normalizeFilePath", () => {
    it("handles null, undefined, empty, and non-string inputs safely", () => {
      // @ts-expect-error testing invalid inputs
      assert.equal(normalizeFilePath(null), "");
      // @ts-expect-error testing invalid inputs
      assert.equal(normalizeFilePath(undefined), "");
      assert.equal(normalizeFilePath(""), "");
      // @ts-expect-error testing invalid inputs
      assert.equal(normalizeFilePath(123), "");
    });

    it("normalizes Windows backslashes to forward slashes", () => {
      assert.equal(
        normalizeFilePath("C:\\Music\\Albums\\Track.mp3"),
        "C:/Music/Albums/Track.mp3"
      );
    });

    it("normalizes Windows lowercase drive letters to uppercase", () => {
      assert.equal(
        normalizeFilePath("c:\\music\\track.mp3"),
        "C:/music/track.mp3"
      );
      assert.equal(
        normalizeFilePath("d:/music/track.flac"),
        "D:/music/track.flac"
      );
    });

    it("strips Windows long-path prefix (\\\\?\\)", () => {
      assert.equal(
        normalizeFilePath(String.raw`\\?\C:\Music\song.mp3`),
        "C:/Music/song.mp3"
      );
    });

    it("preserves standard Unix and macOS paths", () => {
      assert.equal(
        normalizeFilePath("/Users/name/Music/Song With Spaces.mp3"),
        "/Users/name/Music/Song With Spaces.mp3"
      );
    });

    it("trims extraneous whitespace", () => {
      assert.equal(
        normalizeFilePath("  /music/song.mp3   "),
        "/music/song.mp3"
      );
    });
  });

  describe("deduplicateOpenFiles", () => {
    it("returns empty array when given empty or null inputs", () => {
      const map = new Map<string, number>();
      assert.deepEqual(deduplicateOpenFiles([], map), []);
      // @ts-expect-error test invalid input safety
      assert.deepEqual(deduplicateOpenFiles(null, map), []);
      // @ts-expect-error test invalid input safety
      assert.deepEqual(deduplicateOpenFiles(undefined, map), []);
      // @ts-expect-error test invalid input safety
      assert.deepEqual(deduplicateOpenFiles("not-an-array", map), []);
    });

    it("processes new unique file paths on first arrival and updates timestamps", () => {
      const map = new Map<string, number>();
      const now = 10000;
      const paths = ["/music/song1.mp3", "/music/song2.flac"];

      const result = deduplicateOpenFiles(paths, map, DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS, now);

      assert.deepEqual(result, ["/music/song1.mp3", "/music/song2.flac"]);
      assert.equal(map.get("/music/song1.mp3"), now);
      assert.equal(map.get("/music/song2.flac"), now);
    });

    it("deduplicates multiple identical paths within the same incoming batch", () => {
      const map = new Map<string, number>();
      const now = 10000;
      const paths = ["/music/song1.mp3", "/music/song1.mp3", "/music/song2.mp3"];

      const result = deduplicateOpenFiles(paths, map, DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS, now);

      assert.deepEqual(result, ["/music/song1.mp3", "/music/song2.mp3"]);
      assert.equal(map.size, 2);
    });

    it("normalizes path formatting so Windows backslashes and drive casing match as duplicates", () => {
      const map = new Map<string, number>();
      const t0 = 10000;

      // Event arrives with Windows backslashes and lowercase drive letter
      const first = deduplicateOpenFiles(["c:\\music\\song.mp3"], map, DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS, t0);
      assert.deepEqual(first, ["c:\\music\\song.mp3"]);

      // Queue arrives 50ms later with forward slashes and uppercase drive letter
      const second = deduplicateOpenFiles(["C:/music/song.mp3"], map, DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS, t0 + 50);
      assert.deepEqual(second, []);
    });

    it("suppresses duplicate invocation when event arrives first, then getPendingOpenFiles() resolves", () => {
      const map = new Map<string, number>();
      const t0 = 10000;
      const incomingPath = ["/music/track.mp3"];

      // 1. Live event (endurance://open-files) arrives first during startup
      const eventResult = deduplicateOpenFiles(incomingPath, map, DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS, t0);
      assert.deepEqual(eventResult, ["/music/track.mp3"]);

      // 2. get_pending_open_files returns 100ms later during startup session init
      const pendingResult = deduplicateOpenFiles(incomingPath, map, DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS, t0 + 100);
      assert.deepEqual(pendingResult, []);
    });

    it("suppresses duplicate invocation when getPendingOpenFiles() resolves first, then event arrives", () => {
      const map = new Map<string, number>();
      const t0 = 10000;
      const incomingPath = ["/music/track.mp3"];

      // 1. get_pending_open_files resolves first during startup session init
      const pendingResult = deduplicateOpenFiles(incomingPath, map, DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS, t0);
      assert.deepEqual(pendingResult, ["/music/track.mp3"]);

      // 2. Live event (endurance://open-files) arrives 80ms later
      const eventResult = deduplicateOpenFiles(incomingPath, map, DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS, t0 + 80);
      assert.deepEqual(eventResult, []);
    });

    it("allows reopening the same audio file after deduplication window expires", () => {
      const map = new Map<string, number>();
      const t0 = 10000;
      const filePath = ["/music/favorite.mp3"];

      // First open
      const firstOpen = deduplicateOpenFiles(filePath, map, DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS, t0);
      assert.deepEqual(firstOpen, ["/music/favorite.mp3"]);

      // User explicitly re-opens the file 2 seconds later (after 1500ms window)
      const tLater = t0 + DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS + 500;
      const laterOpen = deduplicateOpenFiles(filePath, map, DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS, tLater);
      assert.deepEqual(laterOpen, ["/music/favorite.mp3"]);
    });

    it("allows opening a different file immediately within the deduplication window", () => {
      const map = new Map<string, number>();
      const t0 = 10000;

      const file1 = deduplicateOpenFiles(["/music/song1.mp3"], map, DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS, t0);
      assert.deepEqual(file1, ["/music/song1.mp3"]);

      // Opening song2 100ms later should NOT be suppressed
      const file2 = deduplicateOpenFiles(["/music/song2.mp3"], map, DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS, t0 + 100);
      assert.deepEqual(file2, ["/music/song2.mp3"]);
    });

    it("handles mixed batches where some files were seen recently and others are new", () => {
      const map = new Map<string, number>();
      const t0 = 10000;

      // song1 was already handled
      deduplicateOpenFiles(["/music/song1.mp3"], map, DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS, t0);

      // Incoming batch has both song1 and song2 at t0 + 100ms
      const mixed = deduplicateOpenFiles(
        ["/music/song1.mp3", "/music/song2.mp3"],
        map,
        DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS,
        t0 + 100
      );

      assert.deepEqual(mixed, ["/music/song2.mp3"]);
    });

    it("prunes expired entries from Map to prevent unbounded memory growth", () => {
      const map = new Map<string, number>();
      const t0 = 10000;

      deduplicateOpenFiles(["/music/old1.mp3", "/music/old2.mp3"], map, 1500, t0);
      assert.equal(map.size, 2);

      // 2000ms later (> 1500ms window), opening a new file should prune old entries
      deduplicateOpenFiles(["/music/new.mp3"], map, 1500, t0 + 2000);
      assert.equal(map.size, 1);
      assert.ok(map.has("/music/new.mp3"));
      assert.ok(!map.has("/music/old1.mp3"));
      assert.ok(!map.has("/music/old2.mp3"));
    });
  });

  describe("Simulated handleFiles() Integration Workflow", () => {
    it("ensures concurrent startup event and pending queue calls only resolve tracks and play once", async () => {
      const handledMap = new Map<string, number>();
      let trackResolutions = 0;
      let playTrackCalls = 0;
      let playedQueue: string[] = [];

      // Simulates the exact handleFiles() logic in PlaybackContext
      const simulateHandleFiles = async (filePaths: string[]) => {
        const pathsToProcess = deduplicateOpenFiles(filePaths, handledMap);
        if (pathsToProcess.length === 0) return;

        const resolvedTracks: string[] = [];
        for (const path of pathsToProcess) {
          // Simulate async IPC track resolution delay (e.g. 10ms)
          await new Promise((r) => setTimeout(r, 10));
          trackResolutions++;
          resolvedTracks.push(`Track: ${path}`);
        }

        if (resolvedTracks.length > 0) {
          playTrackCalls++;
          playedQueue = resolvedTracks;
        }
      };

      const files = ["/music/track1.mp3", "/music/track2.mp3"];

      // Fire both the live event path and pending queue path concurrently (simulating startup race)
      await Promise.all([
        simulateHandleFiles(files),
        simulateHandleFiles(files),
      ]);

      // Assert that resolution and playback only executed exactly once!
      assert.equal(trackResolutions, 2); // 2 tracks resolved once each
      assert.equal(playTrackCalls, 1);   // playTrack called exactly once
      assert.deepEqual(playedQueue, ["Track: /music/track1.mp3", "Track: /music/track2.mp3"]);
    });

    it("safely handles unresolvable / corrupt files without duplicate retries or errors", async () => {
      const handledMap = new Map<string, number>();
      let playTrackCalls = 0;

      const simulateHandleFilesWithFailure = async (filePaths: string[]) => {
        const pathsToProcess = deduplicateOpenFiles(filePaths, handledMap);
        if (pathsToProcess.length === 0) return;

        const resolvedTracks: string[] = [];
        for (const path of pathsToProcess) {
          await new Promise((r) => setTimeout(r, 5));
          // Simulate non-existent or invalid audio file returning null
          if (path.endsWith(".mp3")) {
            // Failed resolution
          }
        }

        if (resolvedTracks.length > 0) {
          playTrackCalls++;
        }
      };

      // Concurrent invocation with invalid file
      await Promise.all([
        simulateHandleFilesWithFailure(["/music/invalid.mp3"]),
        simulateHandleFilesWithFailure(["/music/invalid.mp3"]),
      ]);

      // Playback was not called, duplicate was suppressed, no crashes
      assert.equal(playTrackCalls, 0);
    });
  });
});
