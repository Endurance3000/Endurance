import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rgbToHsl, clampArtworkHsl, createAmbientDescriptor } from '../services/artwork/ambientClampedColor';
import { getFormatStamp } from '../utils/formatStamp';
import { isVocalisationOrHook, selectEditorialLyricLine } from '../utils/editorialLyrics';
import { Track } from '../types';

describe('Hero Artwork Clamping & Lighting (Phase 2.5)', () => {
  it('converts rgb to hsl accurately', () => {
    const [h, s, l] = rgbToHsl(255, 0, 0); // Pure Red
    assert.strictEqual(h, 0);
    assert.strictEqual(s, 100);
    assert.strictEqual(l, 50);
  });

  it('strictly clamps saturation into [18%, 42%] and lightness into [30%, 45%]', () => {
    // Hyper-saturated vibrant neon red (0, 100%, 50%) -> (0, 42%, 45%)
    const [h1, s1, l1] = clampArtworkHsl(0, 100, 50);
    assert.strictEqual(h1, 0);
    assert.strictEqual(s1, 42);
    assert.strictEqual(l1, 45);

    // Washed out near-white (200, 5%, 95%) -> (200, 18%, 45%)
    const [h2, s2, l2] = clampArtworkHsl(200, 5, 95);
    assert.strictEqual(h2, 200);
    assert.strictEqual(s2, 18);
    assert.strictEqual(l2, 45);

    // Deep near-black (40, 60%, 10%) -> (40, 42%, 30%)
    const [h3, s3, l3] = clampArtworkHsl(40, 60, 10);
    assert.strictEqual(h3, 40);
    assert.strictEqual(s3, 42);
    assert.strictEqual(l3, 30);
  });

  it('generates dual-layer lighting gradients without hard edges', () => {
    const ambient = createAmbientDescriptor(35, 30, 38);
    assert.strictEqual(ambient.hslColor, 'hsl(35, 30%, 38%)');
    assert.ok(String(ambient.wideGlowStyle.background).includes('radial-gradient'));
    assert.ok(String(ambient.floorGlowStyle.background).includes('radial-gradient'));
  });
});

describe('Hero Format Stamp (Phase 2.9)', () => {
  it('derives container and bitrate stamp from track metadata', () => {
    const track: Track = {
      id: '1',
      file_path: '/music/album/song.flac',
      file_name: 'song.flac',
      file_size: 44093250, // ~44MB
      modified_time: 123456,
      title: 'Track Title',
      artist: 'Artist',
      album: 'Album',
      duration: 250, // 250s -> 44MB * 8 / 250 / 1000 = ~1411 kbps
      is_favorite: false,
      is_available: true,
      date_added: '123',
      last_scanned: '123',
    };

    const stamp = getFormatStamp(track);
    assert.strictEqual(stamp, 'FLAC · 1411 kbps');
  });

  it('derives MP3 container and 320 kbps bitrate', () => {
    const track: Track = {
      id: '2',
      file_path: '/music/song.mp3',
      file_name: 'song.mp3',
      file_size: 8000000,
      modified_time: 123456,
      title: 'Track Title',
      artist: 'Artist',
      album: 'Album',
      duration: 200, // 8MB * 8 / 200 / 1000 = 320 kbps
      is_favorite: false,
      is_available: true,
      date_added: '123',
      last_scanned: '123',
    };

    const stamp = getFormatStamp(track);
    assert.strictEqual(stamp, 'MP3 · 320 kbps');
  });

  it('returns format only if duration or file_size is missing', () => {
    const track: Track = {
      id: '3',
      file_path: '/music/song.wav',
      file_name: 'song.wav',
      file_size: 0,
      modified_time: 123456,
      title: 'Track Title',
      artist: 'Artist',
      album: 'Album',
      duration: 0,
      is_favorite: false,
      is_available: true,
      date_added: '123',
      last_scanned: '123',
    };

    const stamp = getFormatStamp(track);
    assert.strictEqual(stamp, 'WAV');
  });
});

describe('Hero Editorial Lyric Line Selection (Phase 2.7)', () => {
  it('detects pure vocalisations and repeated hooks', () => {
    assert.strictEqual(isVocalisationOrHook('la la la la'), true);
    assert.strictEqual(isVocalisationOrHook('ooh ooh ahh ahh'), true);
    assert.strictEqual(isVocalisationOrHook('yeah yeah yeah'), true);
    assert.strictEqual(isVocalisationOrHook('no no no'), true);
    assert.strictEqual(isVocalisationOrHook(''), true);
    assert.strictEqual(isVocalisationOrHook('I remember the sound of your voice in the rain'), false);
  });

  it('selects active synced line when playing', () => {
    const lyrics = {
      type: 'synced' as const,
      lines: [
        { time: 0, text: 'First short intro line' },
        { time: 10, text: 'And I never thought we would go back here again' },
        { time: 25, text: 'la la la la' },
        { time: 40, text: 'Standing beneath the amber streetlight glowing' },
      ],
    };

    const activeLine = selectEditorialLyricLine(lyrics, 15, true);
    assert.strictEqual(activeLine, 'And I never thought we would go back here again');
  });

  it('falls back to first meaningful line > 18 chars when stopped', () => {
    const lyrics = {
      type: 'synced' as const,
      lines: [
        { time: 0, text: 'Hey' },
        { time: 5, text: 'la la' },
        { time: 10, text: 'All the memories we gathered through the long winter' },
      ],
    };

    const line = selectEditorialLyricLine(lyrics, 0, false);
    assert.strictEqual(line, 'All the memories we gathered through the long winter');
  });

  it('returns null when no lyrics are available', () => {
    assert.strictEqual(selectEditorialLyricLine({ type: 'none' }, 0, false), null);
    assert.strictEqual(selectEditorialLyricLine(null, 0, false), null);
  });
});
