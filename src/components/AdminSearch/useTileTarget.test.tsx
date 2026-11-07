import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { useTileTarget } from './useTileTarget';

const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/admin/page#tile=a.b']}>{children}</MemoryRouter>
);

describe('useTileTarget', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div data-search-tile="a.b"></div>';
        Element.prototype.scrollIntoView = vi.fn();
    });

    it('reveals the tile named in the URL when the page opens', () => {
        renderHook(() => useTileTarget(), { wrapper });

        expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
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
