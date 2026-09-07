import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  handlePlaybackShortcut,
  KeyboardShortcutActions,
  KeyboardShortcutEvent,
  KeyboardShortcutState,
} from '../services/audio/shortcutHelper';

describe('Global Keyboard Shortcuts & Focus Guard Tests', () => {
  const createMockActions = () => {
    let playToggleCount = 0;
    const seekValues: number[] = [];
    let prevTrackCount = 0;
    let nextTrackCount = 0;
    const volumeValues: number[] = [];
    let muteToggleCount = 0;

    const actions: KeyboardShortcutActions = {
      togglePlay: () => {
        playToggleCount++;
      },
      seek: (seconds: number) => {
        seekValues.push(seconds);
      },
      prevTrack: () => {
        prevTrackCount++;
      },
      nextTrack: () => {
        nextTrackCount++;
      },
      setVolume: (volume: number) => {
        volumeValues.push(volume);
      },
      toggleMute: () => {
        muteToggleCount++;
      },
    };

    return {
      actions,
      getCounts: () => ({
        playToggleCount,
        seekValues,
        prevTrackCount,
        nextTrackCount,
        volumeValues,
        muteToggleCount,
      }),
    };
  };

  const defaultState: KeyboardShortcutState = {
    currentTime: 25,
    duration: 180,
    volume: 0.5,
  };

  describe('Playback Control (Spacebar)', () => {
    it('Spacebar toggles play/pause and prevents default page scroll', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'Space',
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().playToggleCount, 1);
    });

    it('Alt + Space does not trigger playback toggle', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = {
        code: 'Space',
        altKey: true,
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, false);
      assert.strictEqual(getCounts().playToggleCount, 0);
    });
  });

  describe('Seeking Controls (ArrowLeft & ArrowRight)', () => {
    it('ArrowLeft without modifiers rewinds by 5 seconds', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'ArrowLeft',
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.deepStrictEqual(getCounts().seekValues, [20]);
    });

    it('ArrowLeft clamps at 0 seconds when near start of track', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = { code: 'ArrowLeft' };

      handlePlaybackShortcut(event, actions, { ...defaultState, currentTime: 2 });

      assert.deepStrictEqual(getCounts().seekValues, [0]);
    });

    it('ArrowRight without modifiers fast-forwards by 5 seconds', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'ArrowRight',
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.deepStrictEqual(getCounts().seekValues, [30]);
    });

    it('ArrowRight clamps at total duration when near end of track', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = { code: 'ArrowRight' };

      handlePlaybackShortcut(event, actions, { ...defaultState, currentTime: 178, duration: 180 });

      assert.deepStrictEqual(getCounts().seekValues, [180]);
    });
  });

  describe('Track Navigation (Ctrl/Cmd + Left/Right)', () => {
    it('Ctrl + ArrowLeft triggers previous track', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'ArrowLeft',
        ctrlKey: true,
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().prevTrackCount, 1);
      assert.strictEqual(getCounts().seekValues.length, 0);
    });

    it('Meta/Cmd + ArrowLeft triggers previous track on macOS', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'ArrowLeft',
        metaKey: true,
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().prevTrackCount, 1);
      assert.strictEqual(getCounts().seekValues.length, 0);
    });

    it('Ctrl + ArrowRight triggers next track', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'ArrowRight',
        ctrlKey: true,
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().nextTrackCount, 1);
      assert.strictEqual(getCounts().seekValues.length, 0);
    });

    it('Meta/Cmd + ArrowRight triggers next track on macOS', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'ArrowRight',
        metaKey: true,
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().nextTrackCount, 1);
      assert.strictEqual(getCounts().seekValues.length, 0);
    });
  });

  describe('Volume Controls (ArrowUp & ArrowDown)', () => {
    it('ArrowUp increases volume by 5%', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'ArrowUp',
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().volumeValues.length, 1);
      assert.ok(Math.abs(getCounts().volumeValues[0] - 0.55) < 0.0001);
    });

    it('ArrowDown decreases volume by 5%', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'ArrowDown',
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().volumeValues.length, 1);
      assert.ok(Math.abs(getCounts().volumeValues[0] - 0.45) < 0.0001);
    });

    it('Ctrl + ArrowUp does not trigger volume adjustment', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = {
        code: 'ArrowUp',
        ctrlKey: true,
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, false);
      assert.strictEqual(getCounts().volumeValues.length, 0);
    });
  });

  describe('Mute Toggle (M / m / KeyM)', () => {
    it('KeyM triggers toggleMute', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'KeyM',
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().muteToggleCount, 1);
    });

    it('Lowercase m key triggers toggleMute (layout fallback)', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        key: 'm',
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().muteToggleCount, 1);
    });

    it('Uppercase M key triggers toggleMute (layout fallback)', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        key: 'M',
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().muteToggleCount, 1);
    });

    it('Ctrl + M does not trigger toggleMute', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = {
        code: 'KeyM',
        ctrlKey: true,
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, false);
      assert.strictEqual(getCounts().muteToggleCount, 0);
    });

    it('Alt + M does not trigger toggleMute', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = {
        code: 'KeyM',
        altKey: true,
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, false);
      assert.strictEqual(getCounts().muteToggleCount, 0);
    });

    it('Meta/Cmd + M does not trigger toggleMute', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = {
        code: 'KeyM',
        metaKey: true,
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, false);
      assert.strictEqual(getCounts().muteToggleCount, 0);
    });
  });

  describe('Focus Protection Guard (Inputs & Editable Elements)', () => {
    it('Ignores Space inside <input> elements', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = {
        code: 'Space',
        target: { tagName: 'INPUT' },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, false);
      assert.strictEqual(getCounts().playToggleCount, 0);
    });

    it('Ignores m key inside <input> elements', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = {
        code: 'KeyM',
        key: 'm',
        target: { tagName: 'INPUT' },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, false);
      assert.strictEqual(getCounts().muteToggleCount, 0);
    });

    it('Ignores Space inside <textarea> elements', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = {
        code: 'Space',
        target: { tagName: 'TEXTAREA' },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, false);
      assert.strictEqual(getCounts().playToggleCount, 0);
    });

    it('Ignores Arrow keys inside <select> elements', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = {
        code: 'ArrowLeft',
        target: { tagName: 'SELECT' },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, false);
      assert.strictEqual(getCounts().seekValues.length, 0);
    });

    it('Ignores shortcuts inside contentEditable elements', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = {
        code: 'KeyM',
        target: { tagName: 'DIV', isContentEditable: true },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, false);
      assert.strictEqual(getCounts().muteToggleCount, 0);
    });
  });

  describe('Unhandled Keys', () => {
    it('Returns false for unhandled keys (e.g. KeyA, Tab)', () => {
      const { actions } = createMockActions();
      const eventA: KeyboardShortcutEvent = { code: 'KeyA' };
      const eventTab: KeyboardShortcutEvent = { code: 'Tab' };

      assert.strictEqual(handlePlaybackShortcut(eventA, actions, defaultState), false);
      assert.strictEqual(handlePlaybackShortcut(eventTab, actions, defaultState), false);
    });
  });
});
