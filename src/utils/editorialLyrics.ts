import { ParsedLyrics } from '../services/lyrics/lrcParser';

/**
 * Checks if a lyric string is a pure vocalisation or short repeated hook.
 */
export function isVocalisationOrHook(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;

  // Pure vocalisation words (la, na, da, ooh, oh, ahh, etc.)
  const vocalisationRegex = /^(\b(la|na|da|ooh|oh|ahh|ah|yeah|uh|ba|doo|dum|whoa|hey|ho)\b[ ,.!?\-]*)+$/i;
  if (vocalisationRegex.test(trimmed)) {
    return true;
  }

  // Repeated 1-3 token hooks (e.g. "ay ay ay", "no no no")
  const tokens = trimmed.toLowerCase().split(/[\s,!?\-.]+/).filter(Boolean);
  if (tokens.length >= 3 && new Set(tokens).size === 1) {
    return true;
  }

  return false;
}

/**
 * Selects one lyric line for the Hero display according to Phase 2.7 rules:
 * 1. The line at the current playback position if playing (and not a vocalisation).
 * 2. Otherwise the first line longer than 18 characters that is not a vocalisation or repeated hook.
 * 3. Otherwise null (render nothing).
 */
export function selectEditorialLyricLine(
  lyrics: ParsedLyrics | null,
  currentTime: number = 0,
  isPlaying: boolean = false
): string | null {
  if (!lyrics || lyrics.type === 'none') return null;

  if (lyrics.type === 'synced' && lyrics.lines && lyrics.lines.length > 0) {
    if (isPlaying) {
      let currentIdx = -1;
      for (let i = 0; i < lyrics.lines.length; i++) {
        if (lyrics.lines[i].time <= currentTime) {
          currentIdx = i;
        } else {
          break;
        }
      }
      if (currentIdx >= 0) {
        const lineText = lyrics.lines[currentIdx].text.trim();
        if (lineText && !isVocalisationOrHook(lineText)) {
          return lineText;
        }
      }
    }

    // Fallback: first line > 18 characters
    for (const line of lyrics.lines) {
      const lineText = line.text.trim();
      if (lineText.length > 18 && !isVocalisationOrHook(lineText)) {
        return lineText;
      }
    }
  } else if (lyrics.type === 'plain' && lyrics.lines && lyrics.lines.length > 0) {
    for (const line of lyrics.lines) {
      const lineText = line.trim();
      if (lineText.length > 18 && !isVocalisationOrHook(lineText)) {
        return lineText;
      }
    }
  }

  return null;
}
