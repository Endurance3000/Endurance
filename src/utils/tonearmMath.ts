/**
 * Tonearm Angle and Dynamics Math
 * According to The Record Room specification:
 * - When stopped/parked (or duration === 0): -34deg
 * - Progress 0.00: -24deg (outer groove)
 * - Progress 0.50: -10deg (mid-disc)
 * - Progress 1.00: +4deg (near label)
 */
export function calculateTonearmAngle(
  currentTime: number = 0,
  duration: number = 0,
  isPlaying: boolean = false
): number {
  if (!isPlaying || !duration || duration <= 0 || currentTime < 0) {
    return -34;
  }
  const progress = Math.min(Math.max(currentTime / duration, 0), 1);
  return -24 + progress * 28;
}
