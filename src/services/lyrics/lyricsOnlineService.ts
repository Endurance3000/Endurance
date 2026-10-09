import { Track } from '../../types';
import {
  LyricsOnlineProvider,
  LyricsSearchResult,
} from './providers';
import { LrclibLyricsProvider } from './providers/lrclibProvider';

export type MatchConfidence = 'high' | 'medium' | 'low';

export interface ScoredLyricsResult {
  candidate: LyricsSearchResult;
  matchScore: number; // 0 to 100
  confidence: MatchConfidence;
  durationDelta: number; // absolute difference in seconds
  durationDeltaFormatted: string; // e.g. "Exact (3:45)" or "+2s" or "-18s"
  isDurationMatched: boolean; // |delta| <= 3s
  isDurationWarning: boolean; // |delta| > 15s
  versionMismatchWarning?: string | null;
  matchReasons: string[];
}

export interface SearchLyricsOptions {
  customQuery?: string;
  signal?: AbortSignal;
  provider?: LyricsOnlineProvider;
}

const VERSION_KEYWORDS = [
  'live',
  'remaster',
  'remastered',
  'acoustic',
  'remix',
  'instrumental',
  'deluxe',
  'radio edit',
  'extended',
  'demo',
  'bonus',
  'unplugged',
  'mono',
  'stereo',
];

/**
 * Normalizes text for comparison without mutating original display metadata.
 * Strips accents, punctuation, and extra whitespace, converting to lowercase.
 */
export function normalizeStringForComparison(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // replace punctuation with space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts recognized version/edition keywords from a string.
 */
export function extractVersionKeywords(text: string): Set<string> {
  const normalized = normalizeStringForComparison(text);
  const found = new Set<string>();

  for (const kw of VERSION_KEYWORDS) {
    const kwNorm = normalizeStringForComparison(kw);
    // Check as whole word or boundary
    const regex = new RegExp(`\\b${kwNorm}\\b`, 'i');
    if (regex.test(normalized)) {
      found.add(kw);
    }
  }

  return found;
}

/**
 * Calculates string similarity using Sørensen–Dice coefficient on character bigrams.
 * Returns a score between 0.0 and 1.0.
 */
export function computeStringSimilarity(a: string, b: string): number {
  const normA = normalizeStringForComparison(a);
  const normB = normalizeStringForComparison(b);

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;
  if (normA.includes(normB) || normB.includes(normA)) {
    const minLen = Math.min(normA.length, normB.length);
    const maxLen = Math.max(normA.length, normB.length);
    return Math.max(0.75, minLen / maxLen);
  }

  const getBigrams = (str: string): Set<string> => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const bigramsA = getBigrams(normA);
  const bigramsB = getBigrams(normB);

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) {
      intersection++;
    }
  }

  const total = bigramsA.size + bigramsB.size;
  return total > 0 ? (2.0 * intersection) / total : 0.0;
}

/**
 * Formats duration delta for user-friendly display.
 */
export function formatDurationDelta(deltaSeconds: number, candidateDuration: number): string {
  const roundDelta = Math.round(deltaSeconds);
  if (roundDelta === 0) {
    const mins = Math.floor(candidateDuration / 60);
    const secs = Math.floor(candidateDuration % 60);
    return `Exact match (${mins}:${secs.toString().padStart(2, '0')})`;
  }

  const prefix = deltaSeconds > 0 ? `+${roundDelta}s` : `-${Math.abs(roundDelta)}s`;
  return `${prefix} (${Math.floor(candidateDuration / 60)}:${Math.floor(candidateDuration % 60).toString().padStart(2, '0')})`;
}

/**
 * Scores and evaluates a candidate lyric result against a local track.
 */
export function scoreCandidate(
  track: Track,
  candidate: LyricsSearchResult,
): ScoredLyricsResult {
  let score = 0;
  const reasons: string[] = [];

  // 1. Title Similarity (up to 40 points)
  const normTrackTitle = normalizeStringForComparison(track.title);
  const normCandTitle = normalizeStringForComparison(candidate.trackName);
  const titleSim = computeStringSimilarity(track.title, candidate.trackName);

  if (normTrackTitle === normCandTitle) {
    score += 40;
    reasons.push('Exact title match');
  } else if (titleSim >= 0.8) {
    score += Math.round(titleSim * 38);
    reasons.push('High title similarity');
  } else if (titleSim >= 0.5) {
    score += Math.round(titleSim * 30);
    reasons.push('Partial title match');
  } else {
    score += Math.round(titleSim * 15);
  }

  // 2. Artist Similarity (up to 30 points)
  const normTrackArtist = normalizeStringForComparison(track.artist);
  const normCandArtist = normalizeStringForComparison(candidate.artistName);
  const artistSim = computeStringSimilarity(track.artist, candidate.artistName);

  if (normTrackArtist && normCandArtist) {
    if (normTrackArtist === normCandArtist) {
      score += 30;
      reasons.push('Exact artist match');
    } else if (artistSim >= 0.8) {
      score += Math.round(artistSim * 28);
      reasons.push('High artist similarity');
    } else if (artistSim >= 0.5) {
      score += Math.round(artistSim * 20);
      reasons.push('Partial artist match');
    }
  }

  // 3. Duration Comparison (up to 30 points)
  const trackDuration = Math.max(0, track.duration || 0);
  const candidateDuration = Math.max(0, candidate.duration || 0);
  const diff = candidateDuration - trackDuration;
  const absDelta = Math.abs(diff);

  const isDurationMatched = absDelta <= 3;
  const isDurationWarning = absDelta > 15;
  const durationDeltaFormatted = formatDurationDelta(diff, candidateDuration);

  if (trackDuration > 0 && candidateDuration > 0) {
    if (absDelta <= 1) {
      score += 30;
      reasons.push('Exact duration match');
    } else if (absDelta <= 3) {
      score += 25;
      reasons.push('Duration within ±3s');
    } else if (absDelta <= 7) {
      score += 15;
      reasons.push('Duration within ±7s');
    } else if (absDelta <= 15) {
      score += 5;
    } else {
      reasons.push(`Duration difference > 15s (${durationDeltaFormatted})`);
    }
  }

  // 4. Version Keyword Verification (Penalty for mismatches)
  const trackKeywords = extractVersionKeywords(track.title);
  const candKeywords = extractVersionKeywords(candidate.trackName);
  let versionMismatchWarning: string | null = null;

  for (const kw of trackKeywords) {
    if (!candKeywords.has(kw)) {
      score = Math.max(0, score - 20);
      versionMismatchWarning = `Track mentions "${kw}", but candidate does not`;
      reasons.push(versionMismatchWarning);
      break;
    }
  }

  if (!versionMismatchWarning) {
    for (const kw of candKeywords) {
      if (!trackKeywords.has(kw)) {
        score = Math.max(0, score - 15);
        versionMismatchWarning = `Candidate mentions "${kw}", but track does not`;
        reasons.push(versionMismatchWarning);
        break;
      }
    }
  }

  // 5. Synced Lyrics Bonus
  if (candidate.hasSyncedLyrics) {
    score = Math.min(100, score + 5);
    reasons.push('Synchronized LRC lyrics available');
  } else if (candidate.hasPlainLyrics) {
    reasons.push('Plain-text lyrics available');
  } else if (candidate.instrumental) {
    score = Math.max(0, score - 30);
    reasons.push('Marked as instrumental');
  } else {
    score = Math.max(0, score - 40);
    reasons.push('No lyrics content');
  }

  const finalScore = Math.max(0, Math.min(100, score));

  let confidence: MatchConfidence;
  if (finalScore >= 80 && !isDurationWarning) {
    confidence = 'high';
  } else if (finalScore >= 50) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    candidate,
    matchScore: finalScore,
    confidence,
    durationDelta: absDelta,
    durationDeltaFormatted,
    isDurationMatched,
    isDurationWarning,
    versionMismatchWarning,
    matchReasons: reasons,
  };
}

/**
 * Ranks a list of candidate results against the local track in descending order of match quality.
 */
export function rankCandidates(
  track: Track,
  candidates: LyricsSearchResult[],
): ScoredLyricsResult[] {
  const scored = candidates.map((cand) => scoreCandidate(track, cand));

  scored.sort((a, b) => {
    // 1. Higher score first
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    // 2. Synced lyrics preferred over plain
    if (a.candidate.hasSyncedLyrics !== b.candidate.hasSyncedLyrics) {
      return a.candidate.hasSyncedLyrics ? -1 : 1;
    }
    // 3. Smaller duration delta first
    if (a.durationDelta !== b.durationDelta) {
      return a.durationDelta - b.durationDelta;
    }
    // 4. Deterministic tie breaker by ID
    return a.candidate.id.localeCompare(b.candidate.id);
  });

  return scored;
}

export class LyricsOnlineService {
  private defaultProvider: LyricsOnlineProvider;

  constructor(defaultProvider?: LyricsOnlineProvider) {
    this.defaultProvider = defaultProvider ?? new LrclibLyricsProvider();
  }

  /**
   * Searches for candidate lyrics for a track, supporting custom search overrides.
   */
  async searchLyrics(
    track: Track,
    options: SearchLyricsOptions = {},
  ): Promise<ScoredLyricsResult[]> {
    const provider = options.provider ?? this.defaultProvider;
    const customQuery = options.customQuery?.trim();

    const title = track.title?.trim() || '';
    const artist = track.artist?.trim() || '';
    const album = track.album?.trim() || '';

    // If both customQuery and track title are empty, cannot perform a valid search
    if (!customQuery && !title) {
      return [];
    }

    let candidates: LyricsSearchResult[];
    if (customQuery) {
      candidates = await provider.search(
        { query: customQuery, duration: track.duration },
        options.signal,
      );
    } else {
      candidates = await provider.search(
        {
          trackName: title,
          artistName: artist || undefined,
          albumName: album || undefined,
          duration: track.duration,
        },
        options.signal,
      );
    }

    return rankCandidates(track, candidates);
  }
}

export const lyricsOnlineService = new LyricsOnlineService();
