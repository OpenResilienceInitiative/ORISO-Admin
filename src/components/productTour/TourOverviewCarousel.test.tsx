import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TourOverviewCarousel } from './TourOverviewCarousel';
import type { TourDefinition } from './types';

const translations: Record<string, string> = {
    'productTour.adminTour.title': 'Admin-Rundgang',
    'productTour.adminTour.summary': 'Die wichtigsten Bereiche der Verwaltung.',
    'productTour.overview.empty': 'Aktuell sind keine Rundgänge verfügbar.',
    'productTour.overview.status.not_started': 'Nicht gestartet',
    'productTour.overview.status.in_progress': 'In Bearbeitung',
    'productTour.overview.status.completed': 'Abgeschlossen',
    'productTour.overview.status.skipped': 'Übersprungen',
    'productTour.overview.action.start': 'Starten',
    'productTour.overview.action.continue': 'Fortsetzen',
    'productTour.overview.action.restart': 'Neu starten',
};

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => translations[key] ?? key,
        i18n: { language: 'de', resolvedLanguage: 'de' },
    }),
}));

const adminTour: TourDefinition = {
    id: 'admin-demo-tour',
    version: 1,
    surface: 'admin',
    audiences: ['tenant_admin', 'platform_admin'],
    titleKey: 'productTour.adminTour.title',
    summaryKey: 'productTour.adminTour.summary',
    steps: [
        { id: 'welcome', target: '', titleKey: 't', contentKey: 'c' },
        { id: 'navigation', target: 'admin-navigation', titleKey: 't', contentKey: 'c' },
    ],
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('TourOverviewCarousel (admin)', () => {
    it('lists audience-matching tours with their versioned status', async () => {
        render(
            <TourOverviewCarousel
                tours={[adminTour]}
                audience="tenant_admin"
                loadProgress={() =>
                    Promise.resolve([
                        {
                            tourId: 'admin-demo-tour',
                            tourVersion: 1,
                            status: 'completed',
                        },
                    ])
                }
                onStartTour={() => {}}
            />,
        );

        await waitFor(() => expect(screen.getByText('Abgeschlossen')).toBeTruthy());
        expect(screen.getByText('Admin-Rundgang')).toBeTruthy();
        expect(screen.getByText('Neu starten')).toBeTruthy();
    });

    it('starts a fresh tour through the action callback', async () => {
        const onStartTour = vi.fn();
        render(
            <TourOverviewCarousel
                tours={[adminTour]}
                audience="platform_admin"
                loadProgress={() => Promise.resolve([])}
                onStartTour={onStartTour}
            />,
        );

        await waitFor(() => expect(screen.getByText('Starten')).toBeTruthy());
        fireEvent.click(screen.getByText('Starten'));
        expect(onStartTour).toHaveBeenCalledWith(adminTour, 'start');
    });

    it('shows the empty state when no production tour is enabled', async () => {
        render(
            <TourOverviewCarousel
                tours={[]}
                audience="tenant_admin"
                loadProgress={() => Promise.resolve([])}
                onStartTour={() => {}}
            />,
        );

        await waitFor(() => expect(screen.getByText('Aktuell sind keine Rundgänge verfügbar.')).toBeTruthy());
    });

    it('filters out tours for other audiences', async () => {
        render(
            <TourOverviewCarousel
                tours={[{ ...adminTour, audiences: ['agency_admin'] }]}
                audience="tenant_admin"
                loadProgress={() => Promise.resolve([])}
                onStartTour={() => {}}
            />,
        );

        await waitFor(() => expect(screen.getByText('Aktuell sind keine Rundgänge verfügbar.')).toBeTruthy());
    });
});
