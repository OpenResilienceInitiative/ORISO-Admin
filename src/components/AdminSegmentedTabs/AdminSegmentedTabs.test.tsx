import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import i18n from '../../i18n';
import { AdminSegmentedTabs, fitTabs, type AdminSegmentedTabItem } from './AdminSegmentedTabs';

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

describe('fitTabs', () => {
    const base = { widths: [120, 120, 120, 120], moreWidth: 90, gap: 4, activeIndex: 0 };

    it('keeps every tab when they fit, and when the bar has no width yet', () => {
        expect(fitTabs({ ...base, available: 492 })).toEqual([]);
        expect(fitTabs({ ...base, available: 0 })).toEqual([]);
    });

    it('moves the tail behind „Mehr“, leaving room for the button', () => {
        // 120 + 4 + 120 + 4 + 90 = 338 fits, a third tab would not.
        expect(fitTabs({ ...base, available: 400 })).toEqual([2, 3]);
    });

    it('swaps a selected tab from the tail into the bar, keeping the order', () => {
        expect(fitTabs({ ...base, available: 400, activeIndex: 3 })).toEqual([1, 2]);
    });

    it('shows the selected tab even when nothing else fits', () => {
        expect(fitTabs({ ...base, available: 150, activeIndex: 2 })).toEqual([0, 1, 3]);
    });
});

describe('AdminSegmentedTabs „Mehr“ overflow', () => {
    const TAB_WIDTH = 120;
    const MORE_WIDTH = 90;
    let barWidth = 350;
    let onResize: (() => void) | undefined;

    beforeAll(async () => {
        await i18n.changeLanguage('de');
    });

    beforeEach(() => {
        barWidth = 350;
        onResize = undefined;
        // jsdom has no layout: give the bar, the tabs and „Mehr“ fixed widths.
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function rect(this: HTMLElement) {
            let width = 0;
            if (this.hasAttribute('data-admin-subnav')) {
                width = barWidth;
            } else if (this.hasAttribute('data-admin-subnav-more')) {
                width = MORE_WIDTH;
            } else if (this.getAttribute('role') === 'tab') {
                width = TAB_WIDTH;
            }
            return { width, height: 48, top: 0, left: 0, right: width, bottom: 48, x: 0, y: 0 } as DOMRect;
        });
        vi.stubGlobal(
            'ResizeObserver',
            // A constructor stand-in: arrow functions cannot be called with `new`.
            vi.fn(function FakeResizeObserver(callback: () => void) {
                onResize = callback;
                return { observe: vi.fn(), disconnect: vi.fn() };
            }),
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('lists the tabs that do not fit behind a „Mehr (n)“ menu button next to the tablist', () => {
        renderLinks('/logs');

        // 3 × 120 = 360 does not fit 350; 120 + 120 + 90 does.
        expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Supervision', 'Fallübergaben']);
        const more = screen.getByRole('button', { name: 'Mehr (1)' });
        expect(more).toHaveAttribute('aria-haspopup', 'menu');
        expect(more).toHaveAttribute('aria-expanded', 'false');
        // Not a tab, and not inside the tablist.
        expect(screen.getByRole('tablist')).not.toContainElement(more);
    });

    it('opens with ↓, moves with the arrows, closes with Esc and returns focus', async () => {
        const user = userEvent.setup();
        barWidth = 250;
        renderLinks('/logs');
        const more = screen.getByRole('button', { name: 'Mehr (2)' });

        more.focus();
        await user.keyboard('{ArrowDown}');
        const menu = await screen.findByRole('menu', { name: 'Weitere Unterbereiche' });
        expect(more).toHaveAttribute('aria-expanded', 'true');
        await waitFor(() => expect(within(menu).getByRole('menuitem', { name: 'Fallübergaben' })).toHaveFocus());
        await user.keyboard('{ArrowDown}');
        expect(within(menu).getByRole('menuitem', { name: 'Löschprotokoll' })).toHaveFocus();

        await user.keyboard('{Escape}');
        await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
        expect(more).toHaveFocus();
        expect(more).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens with Enter and Space as well', async () => {
        const user = userEvent.setup();
        renderLinks('/logs');
        const more = screen.getByRole('button', { name: 'Mehr (1)' });

        more.focus();
        await user.keyboard('{Enter}');
        expect(await screen.findByRole('menu')).toBeInTheDocument();
        await user.keyboard('{Escape}');
        await waitFor(() => expect(more).toHaveFocus());

        await user.keyboard(' ');
        expect(await screen.findByRole('menu')).toBeInTheDocument();
    });

    it('navigates from the menu and swaps the chosen tab into the bar', async () => {
        const user = userEvent.setup();
        renderLinks('/logs');

        await user.click(screen.getByRole('button', { name: 'Mehr (1)' }));
        await user.click(await screen.findByRole('menuitem', { name: 'Löschprotokoll' }));

        expect(screen.getByTestId('path')).toHaveTextContent('/logs/deletions');
        expect(screen.getByRole('tab', { name: 'Löschprotokoll' })).toHaveAttribute('aria-selected', 'true');
        // The order stays: Fallübergaben made room and is now the one behind „Mehr“.
        expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Supervision', 'Löschprotokoll']);
        await user.click(screen.getByRole('button', { name: 'Mehr (1)' }));
        expect(await screen.findByRole('menuitem', { name: 'Fallübergaben' })).toBeInTheDocument();
    });

    it('starts with the selected tab in the bar, even when it is the last one', () => {
        renderLinks('/logs/deletions');

        expect(screen.getByRole('tab', { name: 'Löschprotokoll' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.queryByRole('tab', { name: 'Fallübergaben' })).not.toBeInTheDocument();
    });

    it('swaps the selected tab back in after browser Back, without a resize', async () => {
        const user = userEvent.setup();
        const Back = () => {
            const navigate = useNavigate();
            return (
                <button type="button" onClick={() => navigate(-1)}>
                    back
                </button>
            );
        };
        render(
            <MemoryRouter initialEntries={['/logs/deletions', '/logs']} initialIndex={1}>
                <AdminSegmentedTabs ariaLabel="Logs" items={LINK_TABS} />
                <Back />
            </MemoryRouter>,
        );
        expect(screen.queryByRole('tab', { name: 'Löschprotokoll' })).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'back' }));

        expect(screen.getByRole('tab', { name: 'Löschprotokoll' })).toHaveAttribute('aria-selected', 'true');
    });

    it('re-splits when only the bar is resized', () => {
        renderLinks('/logs');
        expect(screen.getByRole('button', { name: 'Mehr (1)' })).toBeInTheDocument();

        barWidth = 400;
        act(() => onResize?.());
        expect(screen.getAllByRole('tab')).toHaveLength(3);
        expect(screen.queryByRole('button', { name: /^Mehr/ })).not.toBeInTheDocument();

        barWidth = 250;
        act(() => onResize?.());
        expect(screen.getAllByRole('tab')).toHaveLength(1);
        expect(screen.getByRole('button', { name: 'Mehr (2)' })).toBeInTheDocument();
    });

    it('skips tabs behind „Mehr“ when moving with the arrow keys', async () => {
        const user = userEvent.setup();
        renderLinks('/logs');
        const [first, second] = screen.getAllByRole('tab');

        second.focus();
        await user.keyboard('{ArrowRight}');
        expect(first).toHaveFocus();
    });
});

describe('Löschprotokoll tab icon (#1374)', () => {
    it('follows the tab colour instead of a fixed dark blue', () => {
        const svg = readFileSync(resolve(__dirname, '../../resources/img/svg/delete.svg'), 'utf8');
        expect(svg).toMatch(/fill="currentColor"/);
        expect(svg).not.toMatch(/#273270/i);
    });
});
