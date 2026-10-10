/**
 * Default deduplication window in milliseconds for handling file-open events.
 * 1500ms safely absorbs the startup IPC race between the cold-start pending queue
 * (get_pending_open_files) and live events (endurance://open-files), while remaining
 * fast enough not to block an intentional user re-open of the same file.
 */
export const DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS = 1500;

/**
 * Normalizes a file path for consistent deduplication comparisons across platforms
 * (Windows backslashes vs Unix slashes, Windows drive letter casing, whitespace).
 */
export function normalizeFilePath(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') {
    return '';
  }

  // 1. Trim surrounding whitespace
  let normalized = filePath.trim();

  // 2. Normalize Windows backslashes to standard forward slashes
  normalized = normalized.replace(/\\/g, '/');

  // 3. Remove Windows long-path prefix (\\?\) if present
  if (normalized.startsWith('//?/') || normalized.startsWith('/?/')) {
    normalized = normalized.replace(/^(\/\/\?\/|\/\?\/)/, '');
  }

  // 4. Normalize Windows drive letter casing (e.g., c:/ -> C:/)
  if (/^[a-zA-Z]:\//.test(normalized)) {
    normalized = normalized[0].toUpperCase() + normalized.slice(1);
  }

  // 5. Remove duplicate consecutive slashes (except leading protocol/network if any)
  normalized = normalized.replace(/([^:])\/{2,}/g, '$1/');

  return normalized;
}

/**
 * Filters out file paths that were already processed within the deduplication window,
 * updates the timestamp map with currently accepted paths, and prunes expired entries
 * to prevent unbounded Map growth over long-running sessions.
 *
 * @param filePaths List of file paths requested to be opened.
 * @param handledMap Map of normalized path -> last handled epoch millisecond timestamp.
 * @param windowMs Time window within which identical paths are considered duplicates.
 * @param now Current timestamp (defaults to Date.now()).
 * @returns Array of unique file paths that should be processed.
 */
export function deduplicateOpenFiles(
  filePaths: string[],
  handledMap: Map<string, number>,
  windowMs = DEFAULT_OPEN_FILES_DEDUPLICATION_WINDOW_MS,
  now = Date.now(),
): string[] {
  if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
    return [];
  }

  // 1. Prune expired entries to prevent unbounded Map growth
  for (const [key, timestamp] of handledMap.entries()) {
    if (now - timestamp >= windowMs) {
      handledMap.delete(key);
    }
  }

  // 2. Deduplicate paths within current batch and across the window
  const result: string[] = [];
  const seenInCurrentBatch = new Set<string>();

  for (const rawPath of filePaths) {
    if (!rawPath || typeof rawPath !== 'string') {
      continue;
    }

    const normalizedKey = normalizeFilePath(rawPath);
    if (!normalizedKey || seenInCurrentBatch.has(normalizedKey)) {
      continue;
    }
    seenInCurrentBatch.add(normalizedKey);

    const lastTimestamp = handledMap.get(normalizedKey);
    if (lastTimestamp !== undefined && now - lastTimestamp < windowMs) {
      continue;
    }

    handledMap.set(normalizedKey, now);
    result.push(rawPath);
  }

  return result;
}
