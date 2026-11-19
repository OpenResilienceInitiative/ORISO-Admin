import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { TourOverviewSection } from './TourOverviewSection';
import { tourLaunchStore } from './tourLaunchStore';
import { readTourLauncherVisible, resetTourLauncherPreference } from './tourLauncherPreference';
import { versionedTourProgressRepository } from './versionedTourProgressRepository';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de', resolvedLanguage: 'de' } }),
}));
vi.mock('../Card', () => ({ Card: ({ children }: any) => <section>{children}</section> }));
vi.mock('../TileFill', () => ({ TilePicture: () => null }));
vi.mock('../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({ hasRole: () => false, isSuperAdmin: false }),
}));
vi.mock('./tourDefinitions', () => ({
    adminTours: [
        {
            id: 'section-tour',
            version: 1,
            surface: 'admin',
            audiences: ['agency_admin'],
            titleKey: 'section.title',
            summaryKey: 'section.summary',
            steps: [],
        },
    ],
}));
vi.mock('./versionedTourProgressRepository', () => ({
    versionedTourProgressRepository: { saveProgress: vi.fn(), getProgress: vi.fn(() => Promise.resolve([])) },
}));

beforeEach(() => {
    vi.mocked(versionedTourProgressRepository.getProgress).mockClear();
});

afterEach(() => {
    cleanup();
    tourLaunchStore.reset();
    window.localStorage.clear();
    resetTourLauncherPreference();
});

describe('TourOverviewSection', () => {
    it('only requests the launch; the global host runs the tour', async () => {
        render(<TourOverviewSection />);

        fireEvent.click(await screen.findByRole('button', { name: 'productTour.overview.action.start' }));

        expect(tourLaunchStore.getSnapshot().request?.tourId).toBe('section-tour');
        expect(document.querySelector('.react-joyride__overlay')).toBeNull();
    });

    it('reloads the progress after a tour finished', async () => {
        render(<TourOverviewSection />);
        await screen.findByRole('button', { name: 'productTour.overview.action.start' });
        expect(versionedTourProgressRepository.getProgress).toHaveBeenCalledTimes(1);

        act(() => tourLaunchStore.finish());

        await waitFor(() => expect(versionedTourProgressRepository.getProgress).toHaveBeenCalledTimes(2));
    });

    it('switches the "?" tour launcher off and on for this user', async () => {
        render(<TourOverviewSection />);
        const toggle = screen.getByRole('switch', { name: 'productTour.launcher.switch' });
        expect(toggle).toHaveAttribute('aria-checked', 'true');

        fireEvent.click(toggle);

        expect(toggle).toHaveAttribute('aria-checked', 'false');
        expect(readTourLauncherVisible(undefined)).toBe(false);
    });
});
