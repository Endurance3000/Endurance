import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  handlePlaybackShortcut,
  isMacPlatform,
  isPrimaryModifierActive,
  getPrimaryModifierLabel,
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

  describe('Platform Modifier Abstraction Helpers', () => {
    it('isPrimaryModifierActive returns true only for Ctrl on Windows (isMac = false)', () => {
      assert.strictEqual(isPrimaryModifierActive({ ctrlKey: true, metaKey: false }, false), true);
      assert.strictEqual(isPrimaryModifierActive({ ctrlKey: false, metaKey: true }, false), false);
      assert.strictEqual(isPrimaryModifierActive({ ctrlKey: true, metaKey: true }, false), false);
      assert.strictEqual(isPrimaryModifierActive({ ctrlKey: false, metaKey: false }, false), false);
    });

    it('isPrimaryModifierActive returns true only for Meta/Cmd on macOS (isMac = true)', () => {
      assert.strictEqual(isPrimaryModifierActive({ metaKey: true, ctrlKey: false }, true), true);
      assert.strictEqual(isPrimaryModifierActive({ metaKey: false, ctrlKey: true }, true), false);
      assert.strictEqual(isPrimaryModifierActive({ metaKey: true, ctrlKey: true }, true), false);
      assert.strictEqual(isPrimaryModifierActive({ metaKey: false, ctrlKey: false }, true), false);
    });

    it('getPrimaryModifierLabel returns correct label per platform', () => {
      assert.strictEqual(getPrimaryModifierLabel(false), 'Ctrl');
      assert.strictEqual(getPrimaryModifierLabel(true), '⌘');
    });

    it('isMacPlatform executes without error in test environment', () => {
      const isMac = isMacPlatform();
      assert.strictEqual(typeof isMac, 'boolean');
    });
  });

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
      const { actions } = createMockActions();
      const event: KeyboardShortcutEvent = {
        code: 'Space',
        altKey: true,
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, false);
    });

    it('Does not hijack Space on a focused button', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = {
        code: 'Space',
        target: { tagName: 'BUTTON' },
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

  describe('Track Navigation (Ctrl on Windows / Cmd on macOS)', () => {
    it('Windows: Ctrl + ArrowLeft triggers previous track', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'ArrowLeft',
        ctrlKey: true,
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState, false);

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().prevTrackCount, 1);
      assert.strictEqual(getCounts().seekValues.length, 0);
    });

    it('Windows: Meta + ArrowLeft does NOT trigger previous track', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = {
        code: 'ArrowLeft',
        metaKey: true,
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState, false);

      assert.strictEqual(handled, false);
      assert.strictEqual(getCounts().prevTrackCount, 0);
    });

    it('macOS: Meta/Cmd + ArrowLeft triggers previous track', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'ArrowLeft',
        metaKey: true,
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState, true);

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().prevTrackCount, 1);
      assert.strictEqual(getCounts().seekValues.length, 0);
    });

    it('macOS: Ctrl + ArrowLeft does NOT trigger previous track', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = {
        code: 'ArrowLeft',
        ctrlKey: true,
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState, true);

      assert.strictEqual(handled, false);
      assert.strictEqual(getCounts().prevTrackCount, 0);
    });

    it('Windows: Ctrl + ArrowRight triggers next track', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'ArrowRight',
        ctrlKey: true,
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState, false);

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().nextTrackCount, 1);
      assert.strictEqual(getCounts().seekValues.length, 0);
    });

    it('Windows: Meta + ArrowRight does NOT trigger next track', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = {
        code: 'ArrowRight',
        metaKey: true,
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState, false);

      assert.strictEqual(handled, false);
      assert.strictEqual(getCounts().nextTrackCount, 0);
    });

    it('macOS: Meta/Cmd + ArrowRight triggers next track', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'ArrowRight',
        metaKey: true,
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState, true);

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().nextTrackCount, 1);
      assert.strictEqual(getCounts().seekValues.length, 0);
    });

    it('macOS: Ctrl + ArrowRight does NOT trigger next track', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = {
        code: 'ArrowRight',
        ctrlKey: true,
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState, true);

      assert.strictEqual(handled, false);
      assert.strictEqual(getCounts().nextTrackCount, 0);
    });
  });

  describe('Volume Controls (ArrowUp & ArrowDown)', () => {
    it('Normal Arrow Up increases volume by 5%', () => {
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

    it('Arrow Up from 95% stops at 100%', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'ArrowUp',
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, { ...defaultState, volume: 0.95 });

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().volumeValues.length, 1);
      assert.ok(Math.abs(getCounts().volumeValues[0] - 1.0) < 0.0001);
    });

    it('Arrow Up from 100% remains at 100% and does not wrap', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'ArrowUp',
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, { ...defaultState, volume: 1.0 });

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().volumeValues.length, 1);
      assert.strictEqual(getCounts().volumeValues[0], 1.0);
    });

    it('Normal Arrow Down decreases volume by 5%', () => {
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

    it('Arrow Down from 5% stops at 0%', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'ArrowDown',
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, { ...defaultState, volume: 0.05 });

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().volumeValues.length, 1);
      assert.ok(Math.abs(getCounts().volumeValues[0] - 0.0) < 0.0001);
    });

    it('Arrow Down from 0% remains at 0%', () => {
      const { actions, getCounts } = createMockActions();
      let prevented = false;
      const event: KeyboardShortcutEvent = {
        code: 'ArrowDown',
        preventDefault: () => {
          prevented = true;
        },
      };

      const handled = handlePlaybackShortcut(event, actions, { ...defaultState, volume: 0.0 });

      assert.strictEqual(handled, true);
      assert.strictEqual(prevented, true);
      assert.strictEqual(getCounts().volumeValues.length, 1);
      assert.strictEqual(getCounts().volumeValues[0], 0.0);
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

  describe('Event Default Prevention Guard', () => {
    it('Ignores shortcuts when the event is already defaultPrevented', () => {
      const { actions, getCounts } = createMockActions();
      const event: KeyboardShortcutEvent = {
        code: 'Space',
        defaultPrevented: true,
      };

      const handled = handlePlaybackShortcut(event, actions, defaultState);

      assert.strictEqual(handled, false);
      assert.strictEqual(getCounts().playToggleCount, 0);
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
