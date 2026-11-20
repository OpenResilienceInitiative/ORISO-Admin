import { afterEach, describe, expect, it, vi } from 'vitest';
import { jumpTo } from './snackbarJump';

describe('jumpTo scroll margin', () => {
    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('restores the original scroll margin after two jumps within one second', () => {
        vi.useFakeTimers();
        const tile = document.createElement('section');
        tile.id = 'tile';
        tile.style.scrollMarginTop = '7px';
        tile.scrollIntoView = vi.fn();
        document.body.append(tile);

        jumpTo({ target: 'tile' });
        vi.advanceTimersByTime(100);
        jumpTo({ target: 'tile' });
        vi.advanceTimersByTime(100);
        expect(tile.style.scrollMarginTop).not.toBe('7px');

        vi.advanceTimersByTime(2000);
        expect(tile.style.scrollMarginTop).toBe('7px');
    });
});
