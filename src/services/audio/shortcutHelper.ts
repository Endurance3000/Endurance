export interface KeyboardShortcutActions {
  togglePlay: () => void;
  seek: (seconds: number) => void;
  prevTrack: () => void;
  nextTrack: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

export interface KeyboardShortcutState {
  currentTime: number;
  duration: number;
  volume: number;
}

export interface KeyboardShortcutEvent {
  code?: string;
  key?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  target?: EventTarget | { tagName?: string; isContentEditable?: boolean } | null;
  preventDefault?: () => void;
  defaultPrevented?: boolean
}

/**
 * Detects whether the host runtime platform is macOS.
 */
export function isMacPlatform(): boolean {
  if (typeof navigator !== 'undefined') {
    if (navigator.userAgent && /Macintosh|Mac OS X/.test(navigator.userAgent)) {
      return true;
    }
    if (navigator.platform && navigator.platform.startsWith('Mac')) {
      return true;
    }
  }
  return false;
}

/**
 * Returns true if the platform-appropriate primary modifier key is pressed.
 * - macOS: Meta/Command (metaKey) is true, Ctrl (ctrlKey) is false.
 * - Windows/Linux: Ctrl (ctrlKey) is true, Meta (metaKey) is false.
 */
export function isPrimaryModifierActive(
  e: KeyboardShortcutEvent,
  isMac: boolean = isMacPlatform()
): boolean {
  if (isMac) {
    return Boolean(e.metaKey && !e.ctrlKey);
  }
  return Boolean(e.ctrlKey && !e.metaKey);
}

/**
 * Returns the human-readable label for the primary platform modifier key.
 */
export function getPrimaryModifierLabel(isMac: boolean = isMacPlatform()): string {
  return isMac ? '⌘' : 'Ctrl';
}

/**
 * Pure dispatcher for global keyboard shortcuts in Endurance.
 * Returns true if a shortcut was matched and executed, false otherwise.
 */
export function handlePlaybackShortcut(
  e: KeyboardShortcutEvent,
  actions: KeyboardShortcutActions,
  state: KeyboardShortcutState,
  isMac: boolean = isMacPlatform()
): boolean {
  if (e.defaultPrevented === true) {
    return false;
  }
  // Ignore if user is currently interacting with an input field or editable area
  const target = e.target as (HTMLElement & { isContentEditable?: boolean }) | { tagName?: string; isContentEditable?: boolean } | null;
  if (
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable)
  ) {
    return false;
  }

  const isPrimaryModifier = isPrimaryModifierActive(e, isMac);
  const isPlain = !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;

  switch (e.code) {
    case 'Space':
      if (!e.altKey) {
        const target = e.target as
          | { tagName?: string; isContentEditable?: boolean }
          | null;

        if (target?.tagName === 'BUTTON') {
          return false;
        }

        e.preventDefault?.();
        actions.togglePlay();
        return true;
      }
      break;
    case 'ArrowLeft':
      if (!e.altKey) {
        e.preventDefault?.();
        if (isPrimaryModifier) {
          actions.prevTrack();
          return true;
        } else if (isPlain) {
          actions.seek(Math.max(0, state.currentTime - 5));
          return true;
        }
      }
      break;
    case 'ArrowRight':
      if (!e.altKey) {
        e.preventDefault?.();
        if (isPrimaryModifier) {
          actions.nextTrack();
          return true;
        } else if (isPlain) {
          actions.seek(Math.min(state.duration, state.currentTime + 5));
          return true;
        }
      }
      break;
    case 'ArrowUp':
      if (isPlain) {
        e.preventDefault?.();
        actions.setVolume(Math.min(1, state.volume + 0.05));
        return true;
      }
      break;
    case 'ArrowDown':
      if (isPlain) {
        e.preventDefault?.();
        actions.setVolume(Math.max(0, state.volume - 0.05));
        return true;
      }
      break;
    case 'KeyM':
      if (isPlain) {
        e.preventDefault?.();
        actions.toggleMute();
        return true;
      }
      break;
    default:
      // Fallback for layouts where e.code might vary but e.key is 'm' / 'M'
      if ((e.key === 'm' || e.key === 'M') && isPlain) {
        e.preventDefault?.();
        actions.toggleMute();
        return true;
      }
      break;
  }

  return false;
}
