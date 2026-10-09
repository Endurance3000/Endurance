import { Track, HistoryItem } from '../types';

/**
 * Safely parse date_added string which can be a Unix timestamp in seconds or an ISO date string.
 */
export const parseDateAdded = (dateStr?: string | null): number => {
  if (!dateStr) return 0;
  const num = Number(dateStr);
  if (!isNaN(num) && num > 0) {
    // If timestamp is in seconds (< 100 billion), normalize to milliseconds
    return num < 100_000_000_000 ? num * 1000 : num;
  }
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Deduplicate playback history items by track id, preserving the most recent playback order.
 */
export const getUniqueHistoryTracks = (historyItems: HistoryItem[], limit = 6): Track[] => {
  const result: Track[] = [];
  const seenIds = new Set<string>();

  for (const item of historyItems) {
    if (item?.track && !seenIds.has(item.track.id)) {
      seenIds.add(item.track.id);
      result.push(item.track);
      if (result.length >= limit) break;
    }
  }
  return result;
};

/**
 * Sort library tracks by date_added (newest first), with tie-breakers on modified_time and title.
 */
export const getRecentlyAddedTracks = (tracks: Track[], limit = 6): Track[] => {
  return [...tracks]
    .sort((a, b) => {
      const dateA = parseDateAdded(a.date_added);
      const dateB = parseDateAdded(b.date_added);
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      const mtimeA = a.modified_time || 0;
      const mtimeB = b.modified_time || 0;
      if (mtimeB !== mtimeA) {
        return mtimeB - mtimeA;
      }
      return a.title.localeCompare(b.title);
    })
    .slice(0, limit);
};
