import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TutorialStatisticsSection } from './TutorialStatisticsSection';
import { FETCH_ERRORS } from '../../api/fetchData';
import type { TutorialStatisticsResponse } from '../../api/statistic/getTutorialStatistics';

const translations: Record<string, string> = {
    'statistic.tutorials.title': 'Tutorial-Abschlüsse',
    'statistic.tutorials.subtitle': 'Aggregierte Nutzung der geführten Rundgänge — ohne Einzelverläufe.',
    'statistic.tutorials.loading': 'Tutorial-Statistik wird geladen …',
    'statistic.tutorials.loadError': 'Tutorial-Statistik konnte nicht geladen werden.',
    'statistic.tutorials.forbidden': 'Für die Tutorial-Statistik fehlt Ihnen die Berechtigung.',
    'statistic.tutorials.empty': 'Noch keine Tutorial-Nutzung erfasst.',
    'statistic.tutorials.table.tenant': 'Träger',
    'statistic.tutorials.table.tour': 'Rundgang',
    'statistic.tutorials.table.version': 'Version',
    'statistic.tutorials.table.surface': 'Anwendung',
    'statistic.tutorials.table.audiences': 'Zielgruppe',
    'statistic.tutorials.table.notStarted': 'Nicht gestartet',
    'statistic.tutorials.table.inProgress': 'In Bearbeitung',
    'statistic.tutorials.table.completed': 'Abgeschlossen',
    'statistic.tutorials.table.skipped': 'Übersprungen',
    'statistic.tutorials.table.completionRate': 'Abschlussquote',
    'statistic.tutorials.surface.frontend': 'Beratung',
    'statistic.tutorials.surface.admin': 'Verwaltung',
    'statistic.tutorials.audience.consultant': 'Beratende',
    'statistic.tutorials.tour.consultant-walkthrough': 'Beraterrundgang',
};

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string | string[], options?: { defaultValue?: string }) => {
            const keys = Array.isArray(key) ? key : [key];
            const match = keys.find((candidate) => translations[candidate]);
            return match ? translations[match] : options?.defaultValue ?? keys[keys.length - 1];
        },
        i18n: { language: 'de', resolvedLanguage: 'de' },
    }),
}));

const tenantResponse: TutorialStatisticsResponse = {
    generatedAt: '2026-07-19T10:00:00Z',
    scope: 'TENANT',
    tenants: [
        {
            tenantId: 2,
            counts: [
                {
                    surface: 'frontend',
                    tourId: 'consultant-walkthrough',
                    tourVersion: 1,
                    status: 'completed',
                    total: 6,
                },
                {
                    surface: 'frontend',
                    tourId: 'consultant-walkthrough',
                    tourVersion: 1,
                    status: 'in_progress',
                    total: 4,
                },
            ],
        },
    ],
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('TutorialStatisticsSection', () => {
    it('renders the aggregate counts of a tenant-scoped response', async () => {
        render(<TutorialStatisticsSection loadStatistics={() => Promise.resolve(tenantResponse)} />);

        await waitFor(() => expect(screen.getByText('Beraterrundgang')).toBeTruthy());
        expect(screen.getByText('Tutorial-Abschlüsse')).toBeTruthy();
        expect(screen.getByText('6')).toBeTruthy();
        expect(screen.getByText('4')).toBeTruthy();
        expect(screen.getByText('60%')).toBeTruthy();
        // Tenant column only appears for platform scope.
        expect(screen.queryByText('Träger')).toBeNull();
    });

    it('shows the tenant column for a platform-scoped response', async () => {
        render(
            <TutorialStatisticsSection
                loadStatistics={() => Promise.resolve({ ...tenantResponse, scope: 'PLATFORM' })}
            />,
        );

        await waitFor(() => expect(screen.getByText('Beraterrundgang')).toBeTruthy());
        // antd renders the header cell twice for scrollable tables.
        expect(screen.getAllByText('Träger').length).toBeGreaterThan(0);
    });

    it('shows a dedicated notice when access is forbidden instead of an empty success state', async () => {
        render(<TutorialStatisticsSection loadStatistics={() => Promise.reject(new Error(FETCH_ERRORS.FORBIDDEN))} />);

        await waitFor(() =>
            expect(screen.getByText('Für die Tutorial-Statistik fehlt Ihnen die Berechtigung.')).toBeTruthy(),
        );
        expect(screen.queryByText('Noch keine Tutorial-Nutzung erfasst.')).toBeNull();
    });

    it('shows an error state for any other failure', async () => {
        render(<TutorialStatisticsSection loadStatistics={() => Promise.reject(new Error('API call error: 500'))} />);

        await waitFor(() => expect(screen.getByText('Tutorial-Statistik konnte nicht geladen werden.')).toBeTruthy());
        expect(screen.getByRole('alert')).toBeTruthy();
    });

    it('shows the empty state when no counts exist yet', async () => {
        render(
            <TutorialStatisticsSection
                loadStatistics={() =>
                    Promise.resolve({ generatedAt: '2026-07-19T10:00:00Z', scope: 'TENANT', tenants: [] })
                }
            />,
        );

        await waitFor(() => expect(screen.getByText('Noch keine Tutorial-Nutzung erfasst.')).toBeTruthy());
    });

    it('never renders per-user information', async () => {
        const { container } = render(
            <TutorialStatisticsSection loadStatistics={() => Promise.resolve(tenantResponse)} />,
        );

        await waitFor(() => expect(screen.getByText('Beraterrundgang')).toBeTruthy());
        expect(container.textContent).not.toMatch(/user|nutzerkennung/i);
    });
});
