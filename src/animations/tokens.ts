/**
 * Material 3 Motion System Tokens
 * Reference: https://m3.material.io/styles/motion/overview/how-it-works
 *
 * Motion is purposeful:
 * 1. Communicates hierarchy and spatial relationships
 * 2. Provides continuity between states
 * 3. Expresses state transitions without jarring jumps
 */

export const M3_EASING = {
  // Emphasized: used for expressive, eye-catching elements (e.g., hero transforms, dialogs, dynamic artwork changes)
  emphasized: 'cubic-bezier(0.2, 0.0, 0.0, 1.0)',
  emphasizedDecelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1.0)',
  emphasizedAccelerate: 'cubic-bezier(0.3, 0.0, 0.8, 0.15)',

  // Standard: used for subtle, routine UI elements (e.g., buttons, list items, badges)
  standard: 'cubic-bezier(0.2, 0.0, 0.0, 1.0)',
  standardDecelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
  standardAccelerate: 'cubic-bezier(0.4, 0.0, 1.0, 1.0)',
} as const;

export const M3_DURATION = {
  // Short: quick feedback, micro-interactions (press, ripple, hover)
  short1: '50ms',
  short2: '100ms',
  short3: '150ms',
  short4: '200ms',

  // Medium: small component transitions, expansion, menu state
  medium1: '250ms',
  medium2: '300ms',
  medium3: '350ms',
  medium4: '400ms',

  // Long: large surface container transforms, page transitions, track changes
  long1: '450ms',
  long2: '500ms',
  long3: '550ms',
  long4: '600ms',
} as const;

/**
 * Role-based motion configurations communicating specific spatial & UI intent
 */
export const MOTION_ROLES = {
  // Button press, quick tactile response
  tactilePress: {
    duration: M3_DURATION.short2,
    easing: M3_EASING.standardDecelerate,
  },
  // Navigation active indicator pill movement
  navigationIndicator: {
    duration: M3_DURATION.medium2,
    easing: M3_EASING.emphasizedDecelerate,
  },
  // Fade through for page/tab content changes
  fadeThrough: {
    duration: M3_DURATION.medium3,
    easing: M3_EASING.standard,
  },
  // Coordinated song/album transition
  songTransition: {
    duration: M3_DURATION.long2,
    easing: M3_EASING.emphasized,
  },
  // Synchronized lyric line slide and emphasize
  lyricLineAdvance: {
    duration: M3_DURATION.medium4,
    easing: M3_EASING.emphasizedDecelerate,
  },
} as const;
