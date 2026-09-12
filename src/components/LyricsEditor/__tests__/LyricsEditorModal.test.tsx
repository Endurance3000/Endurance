import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  formatTimeMs,
  parseTimeInput,
  createDocSnapshot,
  EditorLine,
} from '../lyricsEditorHelpers';
import {
  LyricsDocument,
  createEditableLyricLine,
} from '../../../services/lyrics/lyricsDocument';
import { lyricsService } from '../../../services/lyrics/lyricsService';

const readSource = (relativePath: string): string => {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
};

function createMockDocument(overrides: Partial<LyricsDocument> = {}): LyricsDocument {
  return {
    sourcePath: 'C:/Music/test.lrc',
    format: 'lrc',
    encoding: 'utf-8',
    lineEnding: 'lf',
    sourceFingerprint: { algorithm: 'sha256', value: 'fp-initial-12345' },
    metadata: {
      title: 'Test Song',
      artist: 'Test Artist',
      album: 'Test Album',
      lyricist: 'Test Writer',
      unknown: [{ key: 'custom', value: 'tag' }],
    },
    offsetMilliseconds: 100,
    lines: [
      createEditableLyricLine('First line of lyrics', 12340),
      createEditableLyricLine('Second line of lyrics', 84500),
      createEditableLyricLine('Untimed line', null),
    ],
    ...overrides,
  };
}

describe('LyricsEditorModal Tests', () => {
  const modalSource = readSource(
    'src/components/LyricsEditor/LyricsEditorModal.tsx'
  );
  const mainPlayerSource = readSource(
    'src/components/Player/MainPlayer.tsx'
  );
  const songActionMenuSource = readSource(
    'src/components/Common/SongActionMenu.tsx'
  );
  const appSource = readSource('src/App.tsx');

  // =========================================================================
  // 1. Accessibility
  // =========================================================================
  describe('Accessibility Contract', () => {
    it('uses role="dialog" and aria-modal="true"', () => {
      assert.match(modalSource, /role="dialog"/);
      assert.match(modalSource, /aria-modal="true"/);
      assert.match(modalSource, /aria-label=\{`Lyrics Editor:/);
    });

    it('manages initial focus to the close/cancel button on mount', () => {
      assert.match(modalSource, /closeBtnRef\.current\?\.focus\(\)/);
    });

    it('captures opener and restores focus on unmount', () => {
      assert.match(modalSource, /openerRef\.current\s*=/);
      assert.match(modalSource, /openerRef\.current\?\.focus\(\)/);
    });

    it('handles Escape key to close modal with dirty protection', () => {
      assert.match(modalSource, /e\.key === 'Escape'/);
      assert.match(modalSource, /setShowDiscardConfirm/);
    });

    it('traps Tab and Shift+Tab navigation within the dialog', () => {
      assert.match(modalSource, /e\.key !== 'Tab'/);
      assert.match(modalSource, /e\.shiftKey/);
      assert.match(modalSource, /firstEl\.focus\(\)/);
      assert.match(modalSource, /lastEl\.focus\(\)/);
      assert.match(modalSource, /e\.preventDefault\(\)/);
    });

    it('renders a confirmation dialog before discarding unsaved changes', () => {
      assert.match(modalSource, /showDiscardConfirm/);
      assert.match(modalSource, /Discard unsaved changes\?/);
      assert.match(modalSource, /Keep Editing/);
      assert.match(modalSource, /Discard Changes/);
    });
  });

  // =========================================================================
  // 2. Loading & Missing LRC State
  // =========================================================================
  describe('Loading & Missing LRC States', () => {
    it('displays loading state indicator while document is fetching', () => {
      assert.match(modalSource, /isLoading &&/);
      assert.match(modalSource, /Loading lyrics file\.\.\./);
    });

    it('calls lyricsService.getLyricsDocument with track.file_path', () => {
      assert.match(modalSource, /lyricsService\.getLyricsDocument\(track\.file_path\)/);
    });

    it('renders exact read-only missing LRC empty state when no LRC is found', () => {
      assert.match(
        modalSource,
        /No lyrics file found for this track\. An existing LRC file is required to edit lyrics\./
      );
      assert.match(modalSource, /hasNoLrc/);
      // Close button provided in empty state
      assert.match(modalSource, /Close/);
    });
  });

  // =========================================================================
  // 3. Timestamp Validation & Formatting
  // =========================================================================
  describe('Timestamp Validation & Parsing', () => {
    it('converts valid timestamps (mm:ss.xx) to milliseconds correctly', () => {
      const res1 = parseTimeInput('00:12.34');
      assert.equal(res1.isValid, true);
      assert.equal(res1.ms, 12340);

      const res2 = parseTimeInput('01:24.50');
      assert.equal(res2.isValid, true);
      assert.equal(res2.ms, 84500);

      const res3 = parseTimeInput('02:05.1');
      assert.equal(res3.isValid, true);
      assert.equal(res3.ms, 125100);

      const res4 = parseTimeInput('10:00.00');
      assert.equal(res4.isValid, true);
      assert.equal(res4.ms, 600000);
    });

    it('formats milliseconds to mm:ss.xx format', () => {
      assert.equal(formatTimeMs(12340), '00:12.34');
      assert.equal(formatTimeMs(84500), '01:24.50');
      assert.equal(formatTimeMs(0), '00:00.00');
      assert.equal(formatTimeMs(null), '');
      assert.equal(formatTimeMs(undefined as unknown as null), '');
    });

    it('rejects invalid seconds >= 60', () => {
      const res60 = parseTimeInput('00:60.00');
      assert.equal(res60.isValid, false);
      assert.equal(res60.ms, null);

      const res75 = parseTimeInput('01:75.20');
      assert.equal(res75.isValid, false);
    });

    it('rejects malformed timestamp formats', () => {
      assert.equal(parseTimeInput('abc').isValid, false);
      assert.equal(parseTimeInput('1234').isValid, false);
      assert.equal(parseTimeInput('00:12:34').isValid, false);
      assert.equal(parseTimeInput('[00:12.34]').isValid, false);
      assert.equal(parseTimeInput('00:12.3456').isValid, false);
    });

    it('converts empty string or placeholder --:--.-- to untimed line (null ms)', () => {
      const resEmpty = parseTimeInput('');
      assert.equal(resEmpty.isValid, true);
      assert.equal(resEmpty.ms, null);

      const resPlaceholder = parseTimeInput('--:--.--');
      assert.equal(resPlaceholder.isValid, true);
      assert.equal(resPlaceholder.ms, null);

      const resSpaces = parseTimeInput('   ');
      assert.equal(resSpaces.isValid, true);
      assert.equal(resSpaces.ms, null);
    });

    it('prevents saving when any timestamp line is invalid', () => {
      assert.match(modalSource, /hasValidationErrors = lines\.some\(\(l\) => l\.isTimeInvalid\)/);
      assert.match(modalSource, /canSave = isDirty && !hasValidationErrors && !isSaving && !hasNoLrc/);
    });
  });

  // =========================================================================
  // 4. Dirty State Tracking
  // =========================================================================
  describe('Dirty State Tracking', () => {
    it('is clean initially when snapshot matches', () => {
      const initialLines: EditorLine[] = [
        {
          id: '1',
          timeMilliseconds: 12340,
          timeString: '00:12.34',
          isTimeInvalid: false,
          text: 'Line 1',
        },
      ];
      const snap1 = createDocSnapshot('Title', 'Artist', 'Album', 'Lyricist', '0', initialLines);
      const snap2 = createDocSnapshot('Title', 'Artist', 'Album', 'Lyricist', '0', initialLines);
      assert.equal(snap1, snap2);
    });

    it('becomes dirty when lyric text is modified', () => {
      const line: EditorLine = {
        id: '1',
        timeMilliseconds: 12340,
        timeString: '00:12.34',
        isTimeInvalid: false,
        text: 'Line 1',
      };
      const snapInitial = createDocSnapshot('T', 'A', 'Alb', 'L', '0', [line]);
      const snapEdited = createDocSnapshot('T', 'A', 'Alb', 'L', '0', [
        { ...line, text: 'Modified text' },
      ]);
      assert.notEqual(snapInitial, snapEdited);
    });

    it('becomes dirty when timestamp is modified', () => {
      const line: EditorLine = {
        id: '1',
        timeMilliseconds: 12340,
        timeString: '00:12.34',
        isTimeInvalid: false,
        text: 'Line 1',
      };
      const snapInitial = createDocSnapshot('T', 'A', 'Alb', 'L', '0', [line]);
      const snapEdited = createDocSnapshot('T', 'A', 'Alb', 'L', '0', [
        { ...line, timeMilliseconds: 20000 },
      ]);
      assert.notEqual(snapInitial, snapEdited);
    });

    it('becomes dirty when metadata (title, artist, album, lyricist, offset) is modified', () => {
      const lines: EditorLine[] = [];
      const snapBase = createDocSnapshot('T', 'A', 'Alb', 'L', '0', lines);

      assert.notEqual(snapBase, createDocSnapshot('T2', 'A', 'Alb', 'L', '0', lines));
      assert.notEqual(snapBase, createDocSnapshot('T', 'A2', 'Alb', 'L', '0', lines));
      assert.notEqual(snapBase, createDocSnapshot('T', 'A', 'Alb2', 'L', '0', lines));
      assert.notEqual(snapBase, createDocSnapshot('T', 'A', 'Alb', 'L2', '0', lines));
      assert.notEqual(snapBase, createDocSnapshot('T', 'A', 'Alb', 'L', '500', lines));
    });

    it('becomes dirty when adding or deleting lines', () => {
      const line1: EditorLine = {
        id: '1',
        timeMilliseconds: 1000,
        timeString: '00:01.00',
        isTimeInvalid: false,
        text: 'Line 1',
      };
      const line2: EditorLine = {
        id: '2',
        timeMilliseconds: null,
        timeString: '',
        isTimeInvalid: false,
        text: 'Line 2',
      };

      const snapOne = createDocSnapshot('T', 'A', 'Alb', 'L', '0', [line1]);
      const snapTwo = createDocSnapshot('T', 'A', 'Alb', 'L', '0', [line1, line2]);
      const snapEmpty = createDocSnapshot('T', 'A', 'Alb', 'L', '0', []);

      assert.notEqual(snapOne, snapTwo);
      assert.notEqual(snapOne, snapEmpty);
    });

    it('resets dirty state after successful save with new snapshot', () => {
      const lines: EditorLine[] = [
        {
          id: '1',
          timeMilliseconds: 1000,
          timeString: '00:01.00',
          isTimeInvalid: false,
          text: 'Saved text',
        },
      ];
      const newSnapshot = createDocSnapshot('T', 'A', 'Alb', 'L', '0', lines);
      // In modal: setInitialSnapshot(newSnapshot)
      assert.equal(newSnapshot, createDocSnapshot('T', 'A', 'Alb', 'L', '0', lines));
    });
  });

  // =========================================================================
  // 5. Save Lifecycle & Cache Clearing
  // =========================================================================
  describe('Save Lifecycle', () => {
    it('calls lyricsService.saveLyricsDocument with the exact constructed document', async () => {
      const doc = createMockDocument();
      let savedDoc: any = null;
      let clearCacheCalled = false;

      const originalSave = lyricsService.saveLyricsDocument;
      const originalClear = lyricsService.clearCache;

      try {
        const mockNewFp = { algorithm: 'sha256' as const, value: 'fp-new-67890' };
        lyricsService.saveLyricsDocument = async (d: LyricsDocument) => {
          savedDoc = d;
          return mockNewFp;
        };
        lyricsService.clearCache = () => {
          clearCacheCalled = true;
        };

        const resultFp = await lyricsService.saveLyricsDocument(doc);
        lyricsService.clearCache();

        assert.deepEqual(resultFp, mockNewFp);
        assert.notEqual(savedDoc, null);
        const finalDoc = savedDoc as LyricsDocument;
        assert.deepEqual(finalDoc.sourceFingerprint, {
          algorithm: 'sha256',
          value: 'fp-initial-12345',
        });
        assert.equal(finalDoc.sourcePath, 'C:/Music/test.lrc');
        assert.equal(finalDoc.lines.length, 3);
        assert.equal(clearCacheCalled, true);
      } finally {
        lyricsService.saveLyricsDocument = originalSave;
        lyricsService.clearCache = originalClear;
      }
    });

    it('preserves unknown metadata tags during document construction', () => {
      const doc = createMockDocument();
      assert.deepEqual(doc.metadata.unknown, [{ key: 'custom', value: 'tag' }]);

      // In modal: metadata: { ...doc.metadata, title, artist, album, lyricist }
      const updatedMetadata = {
        ...doc.metadata,
        title: 'New Title',
        artist: 'New Artist',
      };
      assert.deepEqual(updatedMetadata.unknown, [{ key: 'custom', value: 'tag' }]);
      assert.equal(updatedMetadata.title, 'New Title');
    });

    it('displays Saved badge and preserves open state after save', () => {
      assert.match(modalSource, /isSaved &&/);
      assert.match(modalSource, /Saved/);
      // Save does NOT call onClose
      const saveFnSource = modalSource.slice(
        modalSource.indexOf('const handleSave'),
        modalSource.indexOf('const handleReloadFromDisk')
      );
      assert.doesNotMatch(saveFnSource, /onClose\(\)/);
    });

    it('dispatches endurance:lyrics-updated event on save', () => {
      assert.match(modalSource, /endurance:lyrics-updated/);
    });
  });

  // =========================================================================
  // 6. Error & Conflict Handling
  // =========================================================================
  describe('Error & Conflict Handling', () => {
    it('detects external modification conflict and displays Reload from Disk', () => {
      assert.match(
        modalSource,
        /Conflict detected: the lyrics file was modified externally\./
      );
      assert.match(modalSource, /Reload from Disk/);
      assert.match(modalSource, /handleReloadFromDisk/);
    });

    it('reloads document from disk, replacing document and resetting dirty state', () => {
      assert.match(
        modalSource,
        /await lyricsService\.getLyricsDocument\(track\.file_path\)/
      );
      assert.match(modalSource, /initializeWithDocument\(loaded\)/);
    });

    it('displays clear inline banner for generic save errors and keeps edits', () => {
      assert.match(modalSource, /lyrics-editor-banner-error/);
      assert.match(modalSource, /errorMessage && !conflictError/);
    });

    it('does not classify missing fingerprint validation errors as an external conflict', () => {
      const conflictLogic = modalSource.slice(
        modalSource.indexOf('const handleSave'),
        modalSource.indexOf('const handleReloadFromDisk')
      );
      assert.doesNotMatch(conflictLogic, /includes\(['"]fingerprint['"]\)/);
      assert.match(conflictLogic, /includes\(['"]modified externally['"]\)/);
    });
  });

  // =========================================================================
  // 7. Integration Entry Points
  // =========================================================================
  describe('Integration Entry Points', () => {
    it('MainPlayer provides Edit Lyrics button in topbar and no-lyrics fallback', () => {
      assert.match(mainPlayerSource, /main-player-edit-lyrics-btn/);
      assert.match(mainPlayerSource, /Edit Lyrics/);
      assert.match(mainPlayerSource, /handleEditLyrics/);
    });

    it('SongActionMenu provides Edit Lyrics menuitem', () => {
      assert.match(songActionMenuSource, /Edit Lyrics/);
      assert.match(songActionMenuSource, /handleEditLyrics/);
      assert.match(songActionMenuSource, /endurance:open-lyrics-editor/);
    });

    it('App manages editingLyricsTrack and listens for open events', () => {
      assert.match(appSource, /editingLyricsTrack/);
      assert.match(appSource, /endurance:open-lyrics-editor/);
      assert.match(appSource, /<LyricsEditorModal/);
    });

    it('MainPlayer automatically refreshes lyrics when endurance:lyrics-updated fires', () => {
      assert.match(mainPlayerSource, /endurance:lyrics-updated/);
      assert.match(mainPlayerSource, /lyricsService\.getLyrics/);
    });
  });

  // =========================================================================
  // 8. Line Editing Operations (Enter key, Add, Delete)
  // =========================================================================
  describe('Line Editing Operations', () => {
    it('supports adding lines and setting focus', () => {
      assert.match(modalSource, /handleAddLineAtBottom/);
      assert.match(modalSource, /Add Line/);
      assert.match(modalSource, /pendingFocusLineIdRef/);
    });

    it('supports deleting lines', () => {
      assert.match(modalSource, /handleDeleteLine/);
      assert.match(modalSource, /Delete line/);
    });

    it('supports Enter key in text input to create untimed line below without form submission', () => {
      assert.match(modalSource, /handleLineKeyDown/);
      assert.match(modalSource, /e\.key === 'Enter'/);
      assert.match(modalSource, /next\.splice\(index \+ 1, 0, newLine\)/);
      assert.match(modalSource, /e\.preventDefault\(\)/);
    });

    it('supports blank lines and untimed lines', () => {
      const blankLine = createEditableLyricLine('', null);
      assert.equal(blankLine.timeMilliseconds, null);
      assert.equal(blankLine.text, '');

      const timedBlank = createEditableLyricLine('', 15000);
      assert.equal(timedBlank.timeMilliseconds, 15000);
      assert.equal(timedBlank.text, '');
    });
  });
});

