import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import routePathNames from '../../appConfig';
import { TourLauncher } from './TourLauncher';
import { tourLaunchStore } from './tourLaunchStore';
import { resetTourLauncherPreference, writeTourLauncherVisible } from './tourLauncherPreference';
import { versionedTourProgressRepository } from './versionedTourProgressRepository';
import type { TourDefinition } from './types';

const appSettings = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const roles = vi.hoisted(() => ({ isSuperAdmin: false, isStatisticsReader: false }));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de', resolvedLanguage: 'de' } }),
}));
vi.mock('../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: appSettings.current }),
}));
vi.mock('../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({ hasRole: () => false, ...roles }),
}));
vi.mock('./versionedTourProgressRepository', () => ({
    versionedTourProgressRepository: { saveProgress: vi.fn(), getProgress: vi.fn() },
}));

const tour = (id: string, audiences: TourDefinition['audiences']): TourDefinition => ({
    id,
    version: 1,
    surface: 'admin',
    audiences,
    titleKey: `${id}.title`,
    summaryKey: `${id}.summary`,
    steps: [],
});

const tours = [tour('intro-tour', ['agency_admin', 'platform_admin']), tour('platform-tour', ['platform_admin'])];

const renderLauncher = () =>
    render(
        <MemoryRouter initialEntries={['/admin/home']}>
            <TourLauncher tours={tours} />
        </MemoryRouter>,
    );

const fab = () => screen.queryByRole('button', { name: 'productTour.launcher.open' });

beforeEach(() => {
    appSettings.current = {};
    roles.isSuperAdmin = false;
    roles.isStatisticsReader = false;
    vi.mocked(versionedTourProgressRepository.getProgress).mockClear();
    vi.mocked(versionedTourProgressRepository.getProgress).mockResolvedValue([
        { surface: 'admin', tourId: 'intro-tour', tourVersion: 1, status: 'completed' } as any,
    ]);
});

afterEach(() => {
    cleanup();
    tourLaunchStore.reset();
    window.localStorage.clear();
    resetTourLauncherPreference();
});

describe('TourLauncher', () => {
    it('lists the tours of the audience with their status and a manage link', async () => {
        renderLauncher();

        await userEvent.click(fab()!);

        const menu = screen.getByRole('list');
        const intro = await within(menu).findByRole('button', { name: 'intro-tour.title' });
        expect(intro).toHaveAccessibleDescription('productTour.overview.status.completed');
        expect(within(menu).queryByRole('button', { name: 'platform-tour.title' })).toBeNull();
        expect(within(menu).getByRole('link', { name: 'productTour.launcher.manage' })).toHaveAttribute(
            'href',
            routePathNames.userProfile,
        );
    });

    it('loads the progress only when the card opens, not on every page', async () => {
        renderLauncher();
        expect(fab()).not.toBeNull();
        expect(versionedTourProgressRepository.getProgress).not.toHaveBeenCalled();

        await userEvent.click(fab()!);

        expect(versionedTourProgressRepository.getProgress).toHaveBeenCalledTimes(1);
    });

    it('requests the selected tour from the global host', async () => {
        renderLauncher();

        await userEvent.click(fab()!);
        await userEvent.click(await screen.findByRole('button', { name: 'intro-tour.title' }));

        expect(tourLaunchStore.getSnapshot().request?.tourId).toBe('intro-tour');
    });

    it('hides itself while a tour runs and comes back afterwards', () => {
        renderLauncher();
        expect(fab()).not.toBeNull();

        act(() => tourLaunchStore.requestLaunch('intro-tour'));
        expect(fab()).toBeNull();

        act(() => tourLaunchStore.finish());
        expect(fab()).not.toBeNull();
    });

    it('disappears completely when the per-user switch is off', () => {
        renderLauncher();

        act(() => writeTourLauncherVisible(undefined, false));

        expect(fab()).toBeNull();
        expect(document.querySelector('[data-admin-tour-launcher]')).toBeNull();
    });

    it('respects the central tours setting', () => {
        appSettings.current = { enableWalkthrough: false };
        renderLauncher();
        expect(fab()).toBeNull();
    });

    it('offers nothing to a statistics reader', () => {
        roles.isStatisticsReader = true;
        renderLauncher();
        expect(fab()).toBeNull();
    });

    it('sits in a fixed corner wrapper, outside the page flow', () => {
        renderLauncher();
        expect(fab()!.closest('[data-admin-tour-launcher]')).not.toBeNull();
    });
});
