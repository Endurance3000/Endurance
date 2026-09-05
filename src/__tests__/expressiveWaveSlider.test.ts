import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration } from '../utils/formatters';

describe('Expressive Sine-Wave Progress Slider Math & Logic Tests', () => {
  // Wave path generation simulator matching ExpressiveWaveSlider
  function calculateWaveCoordinates(
    width: number,
    ratio: number,
    phase: number,
    active: boolean
  ) {
    const height = 24;
    const centerY = height / 2;
    const progressX = Math.min(width, Math.max(0, width * ratio));

    if (progressX <= 0) {
      return {
        playedPoints: [{ x: 0, y: centerY }],
        unplayedStart: 0,
        unplayedEnd: width,
        thumbX: 0,
        thumbY: centerY,
      };
    }

    const wavelength = 30;
    const amplitude = active ? 4.0 : 3.0;
    const points: Array<{ x: number; y: number }> = [{ x: 0, y: centerY }];

    const step = 2;
    for (let x = step; x <= progressX; x += step) {
      const taperStart = Math.min(1, x / 16);
      const taperEnd = Math.min(1, (progressX - x) / 16);
      const taper = Math.max(0, Math.min(taperStart, taperEnd));
      const y = centerY + amplitude * taper * Math.sin((x / wavelength) * Math.PI * 2 - phase);
      points.push({ x, y: parseFloat(y.toFixed(2)) });
    }
    points.push({ x: progressX, y: centerY });

    return {
      playedPoints: points,
      unplayedStart: progressX,
      unplayedEnd: width,
      thumbX: progressX,
      thumbY: centerY,
    };
  }

  it('connects played wave seamlessly from x=0 on baseline to progressX on baseline', () => {
    const coords = calculateWaveCoordinates(500, 0.5, 0, true);
    assert.strictEqual(coords.playedPoints[0].x, 0);
    assert.strictEqual(coords.playedPoints[0].y, 12); // Baseline center

    const lastPoint = coords.playedPoints[coords.playedPoints.length - 1];
    assert.strictEqual(lastPoint.x, 250);
    assert.strictEqual(lastPoint.y, 12); // Reconnects smoothly to baseline at progressX
  });

  it('unplayed track starts exactly where played wave ends', () => {
    const coords = calculateWaveCoordinates(600, 0.35, 1.2, true);
    assert.strictEqual(coords.unplayedStart, 210);
    assert.strictEqual(coords.unplayedEnd, 600);
    assert.strictEqual(coords.thumbX, 210);
    assert.strictEqual(coords.thumbY, 12);
  });

  it('handles 0% progress cleanly with no wave distortion', () => {
    const coords = calculateWaveCoordinates(500, 0, 0, true);
    assert.strictEqual(coords.thumbX, 0);
    assert.strictEqual(coords.unplayedStart, 0);
    assert.strictEqual(coords.unplayedEnd, 500);
  });

  it('handles 100% progress without overflow', () => {
    const coords = calculateWaveCoordinates(500, 1.0, 2.5, true);
    assert.strictEqual(coords.thumbX, 500);
    assert.strictEqual(coords.unplayedStart, 500);
    assert.strictEqual(coords.unplayedEnd, 500);
  });

  it('amplitude stays within bounded limits for subtle, elegant organic movement', () => {
    const coordsActive = calculateWaveCoordinates(500, 0.8, 0.5, true);
    for (const pt of coordsActive.playedPoints) {
      assert.ok(pt.y >= 8 && pt.y <= 16, `Point y=${pt.y} is outside [8, 16] safe bounds`);
    }

    const coordsCalm = calculateWaveCoordinates(500, 0.8, 0.5, false);
    for (const pt of coordsCalm.playedPoints) {
      assert.ok(pt.y >= 9 && pt.y <= 15, `Calm point y=${pt.y} is outside [9, 15] bounds`);
    }
  });

  it('preserves left elapsed time and right total duration formatting', () => {
    assert.strictEqual(formatDuration(135), '2:15');
    assert.strictEqual(formatDuration(237), '3:57');
    assert.strictEqual(formatDuration(0), '0:00');
    assert.strictEqual(formatDuration(-5), '0:00');
  });
});
