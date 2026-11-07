import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vite-plus/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AdminSegmentedTabs, type AdminSegmentedTabItem } from './AdminSegmentedTabs';

const LINK_TABS: AdminSegmentedTabItem[] = [
    { id: 'supervisors', label: 'Supervision', to: '/logs', end: true },
    { id: 'handover', label: 'Fallübergaben', to: '/logs/handover' },
    { id: 'deletions', label: 'Löschprotokoll', to: '/logs/deletions' },
];

const Where = () => <output data-testid="path">{useLocation().pathname}</output>;

const renderLinks = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <AdminSegmentedTabs ariaLabel="Logs" items={LINK_TABS} />
            <Routes>
                <Route path="*" element={<Where />} />
            </Routes>
        </MemoryRouter>,
    );

describe('AdminSegmentedTabs', () => {
    it('exposes the route-matched link tab as the selected tab', () => {
        renderLinks('/logs/handover');

        expect(screen.getByRole('tablist', { name: 'Logs' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Fallübergaben' })).toHaveAttribute('aria-selected', 'true');
        // `end` keeps the prefix route from staying selected on its siblings.
        expect(screen.getByRole('tab', { name: 'Supervision' })).toHaveAttribute('aria-selected', 'false');
    });

    it('moves focus with the arrow keys, Home and End, wrapping at the ends', async () => {
        const user = userEvent.setup();
        renderLinks('/logs');
        const [first, second, last] = screen.getAllByRole('tab');

        first.focus();
        await user.keyboard('{ArrowRight}');
        expect(second).toHaveFocus();
        await user.keyboard('{End}');
        expect(last).toHaveFocus();
        await user.keyboard('{ArrowRight}');
        expect(first).toHaveFocus();
        await user.keyboard('{ArrowLeft}');
        expect(last).toHaveFocus();
        await user.keyboard('{Home}');
        expect(first).toHaveFocus();
    });

    it('activates a link tab with Space', async () => {
        const user = userEvent.setup();
        renderLinks('/logs');

        screen.getByRole('tab', { name: 'Löschprotokoll' }).focus();
        await user.keyboard(' ');

        expect(screen.getByTestId('path')).toHaveTextContent('/logs/deletions');
    });

    it('reports button tabs through onChange and skips disabled ones', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <AdminSegmentedTabs
                ariaLabel="Statistik-Ebene"
                activeId="platform"
                onChange={onChange}
                items={[
                    { id: 'platform', label: 'Plattformweit' },
                    { id: 'tenant', label: 'Auf Trägerebene', disabled: true },
                    { id: 'agency', label: 'Auf Beratungsstellenebene' },
                ]}
            />,
        );

        expect(screen.getByRole('tab', { name: 'Plattformweit' })).toHaveAttribute('aria-selected', 'true');
        screen.getByRole('tab', { name: 'Plattformweit' }).focus();
        await user.keyboard('{ArrowRight}');
        expect(screen.getByRole('tab', { name: 'Auf Beratungsstellenebene' })).toHaveFocus();
        await user.keyboard('{Enter}');
        expect(onChange).toHaveBeenCalledWith('agency');
    });
});

describe('AdminSegmentedTabs overflow', () => {
    it('scrolls the active tab back into view when only the bar is resized', () => {
        let onResize: (() => void) | undefined;
        vi.stubGlobal(
            'ResizeObserver',
            // A constructor stand-in: arrow functions cannot be called with `new`.
            vi.fn(function FakeResizeObserver(callback: () => void) {
                onResize = callback;
                return { observe: vi.fn(), disconnect: vi.fn() };
            }),
        );
        renderLinks('/logs/deletions');
        const scroller = screen.getByRole('tablist').closest('div') as HTMLDivElement;
        const active = screen.getByRole('tab', { name: 'Löschprotokoll' });
        // The window got narrower: the bar overflows and the active tab sits past its right edge.
        Object.defineProperty(scroller, 'scrollWidth', { configurable: true, value: 600 });
        Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 200 });
        scroller.getBoundingClientRect = () => ({ left: 0 } as DOMRect);
        active.getBoundingClientRect = () => ({ left: 450, width: 150 } as DOMRect);
        scroller.scrollLeft = 0;

        onResize?.();

        expect(scroller.scrollLeft).toBe(400);
        vi.unstubAllGlobals();
    });
});

describe('Löschprotokoll tab icon (#1374)', () => {
    it('follows the tab colour instead of a fixed dark blue', () => {
        const svg = readFileSync(resolve(__dirname, '../../resources/img/svg/delete.svg'), 'utf8');
        expect(svg).toMatch(/fill="currentColor"/);
        expect(svg).not.toMatch(/#273270/i);
    });
});
