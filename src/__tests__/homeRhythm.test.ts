import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatRelativeDate } from '../utils/formatters';

describe('Home Rhythm Relative Dates (Phase 3.6)', () => {
  it('formats epoch timestamp from today as "Today"', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    assert.strictEqual(formatRelativeDate(String(nowSecs)), 'Today');
  });

  it('formats epoch timestamp from yesterday as "Yesterday"', () => {
    const yesterdaySecs = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    assert.strictEqual(formatRelativeDate(String(yesterdaySecs)), 'Yesterday');
  });

  it('formats timestamps from 3 days ago as "3 days ago"', () => {
    const threeDaysAgo = Math.floor((Date.now() - 3 * 24 * 60 * 60 * 1000) / 1000);
    assert.strictEqual(formatRelativeDate(String(threeDaysAgo)), '3 days ago');
  });

  it('formats timestamps from 2 weeks ago as "2 weeks ago"', () => {
    const twoWeeksAgo = Math.floor((Date.now() - 14 * 24 * 60 * 60 * 1000) / 1000);
    assert.strictEqual(formatRelativeDate(String(twoWeeksAgo)), '2 weeks ago');
  });

  it('gracefully handles invalid or 0 timestamps with empty string', () => {
    assert.strictEqual(formatRelativeDate('0'), '');
    assert.strictEqual(formatRelativeDate(''), '');
    assert.strictEqual(formatRelativeDate('invalid'), '');
  });
});
