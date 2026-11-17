import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { AddonApp, AdminAddon } from '../../addons/addonTypes';
import { AddonInfo } from './AddonInfo';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { resolvedLanguage: 'de@informal', language: 'de@informal' },
    }),
}));

const mutate = vi.hoisted(() => vi.fn());
vi.mock('./useAddons', () => ({
    useSetGlobalEnabled: () => ({ mutate, isPending: false }),
    useAddonReadme: () => ({ data: '# Digisucht\n\nTools für die Beratung.' }),
}));

const SCREENSHOT = 'https://raw.githubusercontent.com/a/b/session.png';

const addon = (enabled: boolean, hasReadme = false, apps?: AddonApp[]): AdminAddon => ({
    manifest: {
        name: 'digisucht-tools',
        version: '0.1.0',
        contract: 'oriso-addon/v1',
        apps: apps ?? [{ id: 'goals', title: { de: 'Ziele' }, slots: ['asker.navigation'] }],
    },
    global: { enabled },
    discoveredAt: '2026-11-12T10:00:00Z',
    hasReadme,
    tenantId: 0,
    enabled: false,
    agencyOverrides: [],
});

beforeEach(() => mutate.mockReset());

describe('AddonInfo', () => {
    it('shows the add-on, its apps and the global switch', () => {
        render(<AddonInfo addon={addon(false)} />);
        expect(screen.getByText('digisucht-tools')).toBeInTheDocument();
        expect(screen.getByText('Ziele')).toBeInTheDocument();
        expect(screen.getByRole('switch', { name: 'addons.global.switchLabel' })).not.toBeChecked();
        expect(screen.getByText('addons.discoveredAt')).toBeInTheDocument();
    });

    it('renders the readme only when the add-on has one', () => {
        const { unmount } = render(<AddonInfo addon={addon(true, true)} />);
        expect(screen.getByRole('heading', { name: 'Digisucht' })).toBeInTheDocument();
        unmount();
        render(<AddonInfo addon={addon(true, false)} />);
        expect(screen.queryByRole('heading', { name: 'Digisucht' })).not.toBeInTheDocument();
    });

    it('switches the add-on on globally right away', () => {
        render(<AddonInfo addon={addon(false)} />);
        fireEvent.click(screen.getByRole('switch', { name: 'addons.global.switchLabel' }));
        expect(mutate).toHaveBeenCalledWith(true, expect.anything());
    });

    it('asks before switching the add-on off globally', async () => {
        render(<AddonInfo addon={addon(true)} />);
        fireEvent.click(screen.getByRole('switch', { name: 'addons.global.switchLabel' }));
        expect(mutate).not.toHaveBeenCalled();
        fireEvent.click(await screen.findByText('addons.global.confirmOffOk'));
        await waitFor(() => expect(mutate).toHaveBeenCalledWith(false, expect.anything()));
    });

    it('names the places an app appears in and keeps the slot id as a hint', () => {
        render(
            <AddonInfo
                addon={addon(false, false, [
                    { id: 'goals', title: { de: 'Ziele' }, slots: ['consultant.session', 'host.unknown'] },
                ])}
            />,
        );
        expect(screen.getByText('addons.features')).toBeInTheDocument();
        expect(screen.getByText('addons.slot.consultantSession')).toHaveAttribute('title', 'consultant.session');
        expect(screen.getByText('host.unknown')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows https screenshots per slot as lazy thumbnails that open a larger view', async () => {
        render(
            <AddonInfo
                addon={addon(false, false, [
                    {
                        id: 'goals',
                        title: { de: 'Ziele' },
                        slots: ['asker.navigation', 'consultant.session'],
                        screenshots: [
                            { slot: 'consultant.session', url: SCREENSHOT },
                            { slot: 'asker.navigation', url: SCREENSHOT, caption: { de: 'Ziele im Menü', en: 'Menu' } },
                            { slot: 'asker.navigation', url: 'http://raw.githubusercontent.com/a/b/insecure.png' },
                        ],
                    },
                ])}
            />,
        );
        const captioned = screen.getByRole('img', { name: 'Ziele im Menü' });
        expect(captioned).toHaveAttribute('loading', 'lazy');
        expect(screen.getByRole('img', { name: 'Ziele, addons.slot.consultantSession' })).toHaveAttribute(
            'src',
            SCREENSHOT,
        );
        expect(screen.getAllByRole('button')).toHaveLength(2);

        fireEvent.click(screen.getByRole('button', { name: 'Ziele im Menü' }));
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });
});
