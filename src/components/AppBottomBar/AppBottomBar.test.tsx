import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { GlobalSearchBar } from '../GlobalSearch';
import { M3NavigationBar, type M3NavigationBarItem } from '../M3NavigationBar';
import { AppBottomBar } from './AppBottomBar';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

const destinations: M3NavigationBarItem[] = [
    { key: 'settings', label: 'Einstellungen', icon: <svg /> },
    { key: 'tenants', label: 'Träger', icon: <svg /> },
];

/** Mirrors how the layout wrapper will wire the two components together. */
const Harness = () => {
    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <MemoryRouter>
            <AppBottomBar
                searchExpanded={expanded}
                search={<GlobalSearchBar variant="pill" searchPlaceholder="Suchen" onExpandedChange={setExpanded} />}
            >
                <M3NavigationBar
                    ariaLabel="Hauptnavigation"
                    items={destinations}
                    activeKey="settings"
                    collapsed={expanded}
                    more={{
                        label: 'Mehr',
                        icon: <svg />,
                        expanded: menuOpen,
                        onClick: () => setMenuOpen((open) => !open),
                    }}
                />
            </AppBottomBar>
        </MemoryRouter>
    );
};

const expandSearch = async () => userEvent.click(screen.getByRole('button', { name: 'Suche ausklappen' }));

describe('AppBottomBar + M3NavigationBar', () => {
    it('keeps the overflow button reachable while the search is expanded', async () => {
        render(<Harness />);

        await expandSearch();

        expect(screen.getByRole('textbox', { name: 'Suchen' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mehr' })).toBeInTheDocument();
    });

    it('drops the other destinations from the bar while the search is expanded', async () => {
        render(<Harness />);

        expect(screen.getByText('Träger')).toBeInTheDocument();

        await expandSearch();

        expect(screen.queryByText('Träger')).not.toBeInTheDocument();
    });

    it('does not close the search when the overflow menu is opened', async () => {
        render(<Harness />);

        await expandSearch();
        await userEvent.click(screen.getByRole('button', { name: 'Mehr' }));

        expect(screen.getByRole('button', { name: 'Mehr' })).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('textbox', { name: 'Suchen' })).toBeInTheDocument();
    });

    it('never sets a fixed pixel width on the expanded pill', async () => {
        const { container } = render(<Harness />);

        await expandSearch();

        // A pixel width would be exactly how the search could outgrow the bar
        // and push the overflow button off the edge on a narrower phone.
        const pill = container.querySelector('[class*="pillSearch"]') as HTMLElement;

        expect(pill.style.width).toBe('');
    });
});
