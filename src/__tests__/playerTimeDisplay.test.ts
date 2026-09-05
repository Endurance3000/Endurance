import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration } from '../utils/formatters';

describe('PlayerBar Time Display Logic', () => {
  // Helper simulating PlayerBar time display calculations
  function getPlayerBarTimes(currentTime: number, duration: number, isScrubbing: boolean = false, scrubTime: number = 0) {
    const rawDisplayTime = isScrubbing ? scrubTime : currentTime;
    const displayTime = duration > 0 ? Math.min(duration, Math.max(0, rawDisplayTime)) : Math.max(0, rawDisplayTime);
    
    const leftText = formatDuration(displayTime);
    const rightText = duration > 0 ? formatDuration(duration) : '0:00';

    return { leftText, rightText, displayTime };
  }

  it('displays elapsed time on the left and total duration on the right', () => {
    const times = getPlayerBarTimes(135, 237); // 2:15 and 3:57
    assert.strictEqual(times.leftText, '2:15');
    assert.strictEqual(times.rightText, '3:57');
  });

  it('never displays negative remaining time on the right', () => {
    const times = getPlayerBarTimes(135, 237);
    assert.ok(!times.rightText.startsWith('-'));
    assert.strictEqual(times.rightText, '3:57');
  });

  it('safely handles duration = 0 or unavailable as 0:00 fallback', () => {
    const timesZero = getPlayerBarTimes(0, 0);
    assert.strictEqual(timesZero.leftText, '0:00');
    assert.strictEqual(timesZero.rightText, '0:00');

    const timesNaN = getPlayerBarTimes(0, NaN);
    assert.strictEqual(timesNaN.leftText, '0:00');
    assert.strictEqual(timesNaN.rightText, '0:00');
  });

  it('clamps current time so it never visually exceeds total duration', () => {
    const times = getPlayerBarTimes(240, 237); // currentTime exceeded duration
    assert.strictEqual(times.leftText, '3:57');
    assert.strictEqual(times.rightText, '3:57');
    assert.strictEqual(times.displayTime, 237);
  });

  it('handles scrubbing with bounds clamping', () => {
    const timesScrubOver = getPlayerBarTimes(10, 200, true, 250);
    assert.strictEqual(timesScrubOver.leftText, '3:20'); // 200s
    assert.strictEqual(timesScrubOver.rightText, '3:20');

    const timesScrubUnder = getPlayerBarTimes(10, 200, true, -10);
    assert.strictEqual(timesScrubUnder.leftText, '0:00');
    assert.strictEqual(timesScrubUnder.rightText, '3:20');
  });

  it('correctly formats various durations including long tracks', () => {
    assert.strictEqual(formatDuration(0), '0:00');
    assert.strictEqual(formatDuration(9), '0:09');
    assert.strictEqual(formatDuration(65), '1:05');
    assert.strictEqual(formatDuration(599), '9:59');
    assert.strictEqual(formatDuration(3600), '60:00');
  });
});
