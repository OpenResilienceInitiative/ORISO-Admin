import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { findTile, HIGHLIGHT_ATTRIBUTE, readTileTarget, revealTile, withTileTarget } from './tileTarget';

describe('tile target in the URL', () => {
    it('round-trips a title key', () => {
        const url = withTileTarget('/admin/theme-settings/legal#old', 'legal.imprint.title');

        expect(url).toBe('/admin/theme-settings/legal#tile=legal.imprint.title');
        expect(readTileTarget('#tile=legal.imprint.title')).toBe('legal.imprint.title');
    });

    it('leaves a route without tile alone and ignores other hashes', () => {
        expect(withTileTarget('/admin/home')).toBe('/admin/home');
        expect(readTileTarget('#section-2')).toBeNull();
    });
});

describe('a link that was edited by hand', () => {
    // Found by the automated security review: a malformed hash threw inside the layout's effect.
    it.each(['#tile=%', '#tile=%E0%A4%A', '#tile=%zz'])('reads %s as "no tile" instead of throwing', (hash) => {
        expect(() => readTileTarget(hash)).not.toThrow();
        expect(readTileTarget(hash)).toBeNull();
    });

    it('finds keys with quotes, backslashes and line breaks without building a selector from them', () => {
        const key = 'a"b\\c\nd';

        document.body.innerHTML = '<div data-search-tile="plain"></div>';
        const odd = document.createElement('div');

        odd.setAttribute('data-search-tile', key);
        document.body.appendChild(odd);

        expect(() => findTile(document, key)).not.toThrow();
        expect(findTile(document, key)).toBe(odd);
        expect(findTile(document, 'missing"]')).toBeNull();
    });
});

describe('revealTile', () => {
    // jsdom has no scrollIntoView; the stub must not leak into other tests of the same worker.
    const originalScrollIntoView = Element.prototype.scrollIntoView;

    beforeEach(() => {
        vi.useFakeTimers();
        document.body.innerHTML = '';
        Element.prototype.scrollIntoView = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();

        if (originalScrollIntoView) {
            Element.prototype.scrollIntoView = originalScrollIntoView;
        } else {
            Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
        }
    });

    it('highlights a tile that is already there and removes the mark again', () => {
        document.body.innerHTML = '<div data-search-tile="a.b"></div>';
        revealTile('a.b');

        const element = findTile(document, 'a.b') as HTMLElement;

        expect(element.getAttribute(HIGHLIGHT_ATTRIBUTE)).toBe('true');
        expect(element.scrollIntoView).toHaveBeenCalled();

        vi.advanceTimersByTime(3000);

        expect(element.hasAttribute(HIGHLIGHT_ATTRIBUTE)).toBe(false);
    });

    it('waits for a tile that renders later', async () => {
        revealTile('late.tile');
        document.body.innerHTML = '<div data-search-tile="late.tile"></div>';
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(0);

        expect((findTile(document, 'late.tile') as HTMLElement).getAttribute(HIGHLIGHT_ATTRIBUTE)).toBe('true');
    });

    // Found in review: nothing covered the cancel of a highlight that is showing (the page was left).
    it('takes the mark off and stops the timer when cancelled while it shows', () => {
        document.body.innerHTML = '<div data-search-tile="a.b"></div>';
        const cancel = revealTile('a.b');
        const element = findTile(document, 'a.b') as HTMLElement;

        expect(element.getAttribute(HIGHLIGHT_ATTRIBUTE)).toBe('true');

        cancel();

        expect(element.hasAttribute(HIGHLIGHT_ATTRIBUTE)).toBe(false);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('does not reveal a tile that renders after it was cancelled', async () => {
        const cancel = revealTile('late.tile');

        cancel();
        document.body.innerHTML = '<div data-search-tile="late.tile"></div>';
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(0);

        expect((findTile(document, 'late.tile') as HTMLElement).hasAttribute(HIGHLIGHT_ATTRIBUTE)).toBe(false);
    });

    it('gives up quietly and can be cancelled', () => {
        const cancel = revealTile('never', { timeoutMs: 100 });

        vi.advanceTimersByTime(200);

        expect(() => cancel()).not.toThrow();
    });
});
