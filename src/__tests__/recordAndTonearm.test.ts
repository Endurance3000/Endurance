import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTonearmAngle } from '../utils/tonearmMath';

describe('Tonearm and Record Dynamics (Phase 1)', () => {
  it('parks the tonearm at -34deg when stopped or duration is 0', () => {
    assert.strictEqual(calculateTonearmAngle(0, 0, false), -34);
    assert.strictEqual(calculateTonearmAngle(50, 100, false), -34);
    assert.strictEqual(calculateTonearmAngle(0, 0, true), -34);
    assert.strictEqual(calculateTonearmAngle(0, -10, true), -34);
  });

  it('positions the tonearm at -24deg at the outer groove (0% progress)', () => {
    const angle = calculateTonearmAngle(0, 200, true);
    assert.strictEqual(angle, -24);
  });

  it('positions the tonearm at -10deg at mid-disc (50% progress)', () => {
    const angle = calculateTonearmAngle(100, 200, true);
    assert.strictEqual(angle, -10);
  });

  it('positions the tonearm at +4deg near the label (100% progress)', () => {
    const angle = calculateTonearmAngle(200, 200, true);
    assert.strictEqual(angle, 4);
  });

  it('clamps progress if currentTime exceeds duration or is negative', () => {
    const over = calculateTonearmAngle(300, 200, true);
    assert.strictEqual(over, 4);

    const under = calculateTonearmAngle(-10, 200, true);
    assert.strictEqual(under, -34);
  });

  it('correctly tracks linear progression across the vinyl surface', () => {
    // 25% progress: -24 + 0.25 * 28 = -17deg
    assert.strictEqual(calculateTonearmAngle(50, 200, true), -17);
    // 75% progress: -24 + 0.75 * 28 = -3deg
    assert.strictEqual(calculateTonearmAngle(150, 200, true), -3);
  });
});
