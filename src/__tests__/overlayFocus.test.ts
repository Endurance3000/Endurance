import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (relativePath: string): string => {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
};

describe('Overlay Keyboard Focus Management', () => {
  describe('SongActionMenu', () => {
    const source = readSource(
      'src/components/Common/SongActionMenu.tsx'
    );

    it('moves focus to the first menu item when opened', () => {
      assert.match(source, /firstMenuItemRef/);
      assert.match(source, /firstMenuItemRef\.current\?\.focus\(\)/);
    });

    it('restores focus to the trigger when closed', () => {
      assert.match(source, /triggerRef\?:/);
      assert.match(source, /triggerRef\?\.current\?\.focus\(\)/);
    });

    it('traps Tab and Shift+Tab inside the menu', () => {
      assert.match(source, /e\.key !== 'Tab'/);
      assert.match(source, /e\.shiftKey/);
      assert.match(source, /lastItem\.focus\(\)/);
      assert.match(source, /firstItem\.focus\(\)/);
      assert.match(source, /e\.preventDefault\(\)/);
    });

    it('closes on Escape', () => {
      assert.match(source, /e\.key === 'Escape'/);
      assert.match(source, /onClose\(\)/);
    });
  });

  describe('QueueDrawer', () => {
    const source = readSource(
      'src/components/Queue/QueueDrawer.tsx'
    );

    it('moves focus to the close button when opened', () => {
      assert.match(source, /closeButtonRef/);
      assert.match(source, /closeButtonRef\.current\?\.focus\(\)/);
    });

    it('uses modal dialog semantics', () => {
      assert.match(source, /role="dialog"/);
      assert.match(source, /aria-modal="true"/);
    });

    it('restores focus to the queue trigger when closed', () => {
      assert.match(source, /data-queue-trigger/);
      assert.match(source, /restoreQueueTriggerFocus/);
      assert.match(source, /trigger\?\.focus\(\)/);
    });

    it('traps Tab and Shift+Tab inside the dialog', () => {
      assert.match(source, /e\.key !== 'Tab'/);
      assert.match(source, /e\.shiftKey/);
      assert.match(source, /lastElement\.focus\(\)/);
      assert.match(source, /firstElement\.focus\(\)/);
      assert.match(source, /e\.preventDefault\(\)/);
    });

    it('closes on Escape', () => {
      assert.match(source, /e\.key === 'Escape'/);
      assert.match(source, /setIsQueueOpen\(false\)/);
    });
  });

  describe('MainPlayer', () => {
    const source = readSource(
      'src/components/Player/MainPlayer.tsx'
    );

    it('moves focus to the collapse button when opened', () => {
      assert.match(source, /closeButtonRef/);
      assert.match(source, /closeButtonRef\.current\?\.focus\(\)/);
    });

    it('uses modal dialog semantics', () => {
      assert.match(source, /role="dialog"/);
      assert.match(source, /aria-modal="true"/);
    });

    it('remembers and restores the element that opened the overlay', () => {
      assert.match(source, /openerRef/);
      assert.match(source, /document\.activeElement/);
      assert.match(source, /openerRef\.current\?\.focus\(\)/);
    });

    it('traps Tab and Shift+Tab inside the dialog', () => {
      assert.match(source, /e\.key !== 'Tab'/);
      assert.match(source, /e\.shiftKey/);
      assert.match(source, /lastElement\.focus\(\)/);
      assert.match(source, /firstElement\.focus\(\)/);
      assert.match(source, /e\.preventDefault\(\)/);
    });

    it('closes on Escape', () => {
      assert.match(source, /e\.key === 'Escape'/);
      assert.match(source, /onClose\(\)/);
    });
  });

  describe('SortMenu', () => {
    const source = readSource(
      'src/components/Library/SortMenu.tsx'
    );

    it('moves focus to the first option when opened', () => {
      assert.match(source, /firstOptionRef/);
      assert.match(source, /firstOptionRef\.current\?\.focus\(\)/);
    });

    it('restores focus to the trigger when closed', () => {
      assert.match(source, /triggerRef\.current\?\.focus\(\)/);
      assert.match(source, /wasOpenRef/);
    });

    it('traps Tab and Shift+Tab inside the menu', () => {
      assert.match(source, /e\.key !== 'Tab'/);
      assert.match(source, /e\.shiftKey/);
      assert.match(source, /lastElement\.focus\(\)/);
      assert.match(source, /firstElement\.focus\(\)/);
      assert.match(source, /e\.preventDefault\(\)/);
    });

    it('closes on Escape', () => {
      assert.match(source, /e\.key === 'Escape'/);
      assert.match(source, /setIsOpen\(false\)/);
    });
  });
});
