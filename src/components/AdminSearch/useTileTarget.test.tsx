import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { HIGHLIGHT_ATTRIBUTE } from './tileTarget';
import { useTileTarget } from './useTileTarget';

const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/admin/page#tile=a.b']}>{children}</MemoryRouter>
);

describe('useTileTarget', () => {
    // jsdom has no scrollIntoView; the stub must not leak into other tests of the same worker.
    const originalScrollIntoView = Element.prototype.scrollIntoView;

    beforeEach(() => {
        document.body.innerHTML = '<div data-search-tile="a.b"></div>';
        Element.prototype.scrollIntoView = vi.fn();
    });

    afterEach(() => {
        if (originalScrollIntoView) {
            Element.prototype.scrollIntoView = originalScrollIntoView;
        } else {
            Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
        }
    });

    it('reveals the tile named in the URL when the page opens', () => {
        renderHook(() => useTileTarget(), { wrapper });

        expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    });

    it('does nothing for a URL without a tile', () => {
        const plain = ({ children }: { children: ReactNode }) => (
            <MemoryRouter initialEntries={['/admin/page#section-2']}>{children}</MemoryRouter>
        );

        renderHook(() => useTileTarget(), { wrapper: plain });

        expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
        expect(document.querySelector(`[${HIGHLIGHT_ATTRIBUTE}]`)).toBeNull();
    });

    it('takes the highlight off when the page is left', () => {
        const { unmount } = renderHook(() => useTileTarget(), { wrapper });

        expect(document.querySelector(`[${HIGHLIGHT_ATTRIBUTE}="true"]`)).not.toBeNull();

        unmount();

        expect(document.querySelector(`[${HIGHLIGHT_ATTRIBUTE}]`)).toBeNull();
    });

    // Found in review: path and hash stayed the same, so the effect never ran again.
    it('reveals the tile again when the same result is chosen a second time', () => {
        const { result } = renderHook(
            () => {
                useTileTarget();

                return useNavigate();
            },
            { wrapper },
        );

        act(() => result.current('/admin/page#tile=a.b'));

        expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2);
    });
});
