/**
 * Format seconds into m:ss format (e.g. 218 -> "3:38")
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format bytes into human readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format epoch timestamp (seconds or millis) into human-centric relative date (e.g. "Today", "Yesterday", "3 days ago", "Oct 14")
 */
export function formatRelativeDate(epochSecsStr: string): string {
  const secs = parseInt(epochSecsStr, 10);
  if (isNaN(secs) || secs <= 0) return '';

  const date = new Date(secs > 10000000000 ? secs : secs * 1000);
  const now = new Date();

  // Strip time for clean calendar-day difference
  const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((nowMidnight.getTime() - dateMidnight.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays >= 2 && diffDays <= 6) return `${diffDays} days ago`;
  if (diffDays >= 7 && diffDays <= 13) return '1 week ago';
  if (diffDays >= 14 && diffDays <= 27) return `${Math.floor(diffDays / 7)} weeks ago`;

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format epoch timestamp (seconds) into localized date string
 */
export function formatDate(epochSecsStr: string): string {
  const secs = parseInt(epochSecsStr, 10);
  if (isNaN(secs) || secs <= 0) return 'Unknown';
  return new Date(secs * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}



