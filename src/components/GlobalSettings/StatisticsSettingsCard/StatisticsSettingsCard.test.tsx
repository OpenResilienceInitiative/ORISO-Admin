import '@ant-design/v5-patch-for-react-19';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { setSessionTokens, clearSessionTokens } from '../../../api/auth/tokenSessionStore';
import type { StatisticsSettings } from '../../../types/StatisticsSettings';
import { StatisticsSettingsCardContainer } from '.';

const thresholds = ['2', '3', '4', '5', '6', '7', '8', '9', '10'];
const initial: StatisticsSettings = {
    revision: 4,
    settings: [
        {
            key: 'agencyMinimumCounsellors',
            value: '5',
            defaultValue: '5',
            options: thresholds,
            effectiveFrom: '2026-10-20T08:00',
            changedBy: null,
        },
        {
            key: 'tenantMinimumCounsellors',
            value: '5',
            defaultValue: '5',
            options: thresholds,
            effectiveFrom: '2026-10-20T08:00',
            changedBy: null,
        },
        {
            key: 'platformMinimumCounsellors',
            value: '3',
            defaultValue: '5',
            options: thresholds,
            effectiveFrom: '2026-10-28T14:00',
            changedBy: 'platform.admin',
        },
        {
            key: 'messageCountTracking',
            value: 'ENABLED',
            defaultValue: 'ENABLED',
            options: ['ENABLED', 'DISABLED'],
            effectiveFrom: null,
            changedBy: null,
        },
    ],
};

const server = setupServer(http.get('*/useradmin/statistics/settings', () => HttpResponse.json(initial)));
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    clearSessionTokens();
    vi.restoreAllMocks();
});

const signIn = (tenantId: number) =>
    setSessionTokens(
        `header.${btoa(
            JSON.stringify({ realm_access: { roles: ['agency-admin', 'tenant-admin'] }, tenantId }),
        )}.signature`,
        null,
    );

beforeEach(async () => {
    signIn(0);
    await i18n.changeLanguage('de');
});

const showCard = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <StatisticsSettingsCardContainer />
        </QueryClientProvider>,
    );

it('lists every setting one after another with its value and since when it applies', async () => {
    showCard();

    expect(await screen.findByLabelText(/^Je Beratungsstelle/)).toHaveValue('5');
    expect(screen.getByLabelText(/^Je Träger/)).toHaveValue('5');
    expect(screen.getByLabelText(/^Gesamte Plattform/)).toHaveValue('3');
    expect(screen.getByLabelText(/^Gesendete Nachrichten/)).toHaveValue('An');
    expect(screen.getAllByText('Gilt seit 20.10.2026')).toHaveLength(2);
    expect(screen.getByText('Gilt seit 28.10.2026')).toBeVisible();
    expect(screen.getByText('Standardwert, noch nie geändert')).toBeVisible();
    expect(screen.getByText(/Beratende sehen ihre eigenen Zahlen immer vollständig/)).toBeVisible();
});

it('labels the dashboard time windows in weeks and months (UserService#1544)', async () => {
    server.use(
        http.get('*/useradmin/statistics/settings', () =>
            HttpResponse.json({
                ...initial,
                settings: [
                    ...initial.settings,
                    {
                        key: 'requestChartWeeks',
                        value: '12',
                        defaultValue: '5',
                        options: ['5', '8', '12', '16', '20', '26'],
                        effectiveFrom: '2026-11-01T10:00',
                        changedBy: 'platform.admin',
                    },
                    {
                        key: 'topicMonths',
                        value: '4',
                        defaultValue: '4',
                        options: ['3', '4', '6', '12'],
                        effectiveFrom: '2026-10-20T08:00',
                        changedBy: null,
                    },
                ],
            }),
        ),
    );
    showCard();

    expect(await screen.findByLabelText(/^Diagramm „Beratungsfälle“/)).toHaveValue('12 Wochen');
    expect(screen.getByLabelText(/^Häufigstes Thema/)).toHaveValue('4 Monate');
    expect(screen.getByText('Gilt seit 01.11.2026')).toBeVisible();
});

const intervalOptions = ['LIVE', 'DAILY', 'WEEKLY'];
const withStandFields: StatisticsSettings = {
    ...initial,
    settings: [
        ...initial.settings,
        {
            key: 'agencySnapshotInterval',
            value: 'DAILY',
            defaultValue: 'DAILY',
            options: intervalOptions,
            effectiveFrom: '2026-10-20T08:00',
            changedBy: null,
        },
        {
            key: 'tenantSnapshotInterval',
            value: 'WEEKLY',
            defaultValue: 'DAILY',
            options: intervalOptions,
            effectiveFrom: '2026-11-02T10:00',
            changedBy: 'platform.admin',
        },
        {
            key: 'platformSnapshotInterval',
            value: 'LIVE',
            defaultValue: 'DAILY',
            options: intervalOptions,
            effectiveFrom: '2026-11-02T10:00',
            changedBy: 'platform.admin',
        },
    ],
};

it('offers one labelled stand field each for centres, Träger and the platform (UserService#1547)', async () => {
    server.use(http.get('*/useradmin/statistics/settings', () => HttpResponse.json(withStandFields)));
    showCard();

    expect(await screen.findByLabelText(/^Beratungsstellen/)).toHaveValue('Täglich um 6 Uhr');
    expect(screen.getByLabelText(/^Träger/)).toHaveValue('Wöchentlich, Mo. 6 Uhr');
    expect(screen.getByLabelText(/^Plattform/)).toHaveValue('Live (bei jedem Laden)');
    expect(screen.getAllByText('Gilt seit 02.11.2026')).toHaveLength(2);
});

it('groups the fields under clear headings', async () => {
    server.use(http.get('*/useradmin/statistics/settings', () => HttpResponse.json(withStandFields)));
    showCard();

    const stand = await screen.findByRole('group', { name: /^Stand der Zahlen/ });
    expect(within(stand).getByLabelText(/^Beratungsstellen/)).toBeVisible();
    expect(within(stand).getByLabelText(/^Träger/)).toBeVisible();
    expect(within(stand).getByLabelText(/^Plattform/)).toBeVisible();
    expect(
        within(screen.getByRole('group', { name: /^Mindestzahl Beratende/ })).getByLabelText(/^Je Träger/),
    ).toBeVisible();
});

it('explains the stand once, in plain words, and does not overpromise', async () => {
    server.use(http.get('*/useradmin/statistics/settings', () => HttpResponse.json(withStandFields)));
    showCard();

    const help = await screen.findAllByRole('button', { name: 'Warum ein fester Stand?' });
    expect(help).toHaveLength(1);

    await userEvent.hover(help[0]);

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('von 23 auf 24, weiß man: Gerade hat jemand Hilfe gesucht');
    expect(tooltip).toHaveTextContent('nur einmal am Tag oder einmal pro Woche');
    expect(tooltip).toHaveTextContent('Bei „Live“ gilt dieser Schutz nicht');
    expect(tooltip).toHaveTextContent('Beratende sehen ihre eigenen Zahlen immer sofort');
});

it('says what the change log holds and how to read a bold value', async () => {
    showCard();

    expect(await screen.findByRole('button', { name: 'Protokoll herunterladen (CSV)' })).toBeVisible();
    expect(screen.getByText(/Enthält jede Änderung: Einstellung, alter und neuer Wert/)).toBeVisible();
    expect(screen.getByText('Fett in der Liste: der Standardwert.')).toBeVisible();
});

it('saves a chosen stand', async () => {
    let received: { values?: Record<string, string> } | undefined;
    server.use(
        http.get('*/useradmin/statistics/settings', () => HttpResponse.json(withStandFields)),
        http.put('*/useradmin/statistics/settings', async ({ request }) => {
            received = (await request.json()) as { values?: Record<string, string> };
            return HttpResponse.json({
                ...withStandFields,
                revision: withStandFields.revision + 1,
                settings: withStandFields.settings.map((setting) =>
                    setting.key === 'agencySnapshotInterval'
                        ? { ...setting, value: 'WEEKLY', effectiveFrom: '2026-11-03T09:00' }
                        : setting,
                ),
            });
        }),
    );
    showCard();

    await userEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }));
    await userEvent.click(screen.getByLabelText(/^Beratungsstellen/));
    await userEvent.click(
        within(await screen.findByRole('listbox')).getByRole('option', { name: 'Wöchentlich, Mo. 6 Uhr' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() => expect(received?.values?.agencySnapshotInterval).toBe('WEEKLY'));
    expect(await screen.findByText('Gilt seit 03.11.2026')).toBeVisible();
    expect(screen.getByLabelText(/^Beratungsstellen/)).toHaveValue('Wöchentlich, Mo. 6 Uhr');
});

it('saves the chosen values with the revision it read', async () => {
    let received: unknown;
    server.use(
        http.put('*/useradmin/statistics/settings', async ({ request }) => {
            received = await request.json();
            return HttpResponse.json({
                ...initial,
                revision: 5,
                settings: initial.settings.map((setting) =>
                    setting.key === 'agencyMinimumCounsellors'
                        ? { ...setting, value: '2', effectiveFrom: '2026-11-01T09:30', changedBy: 'platform.admin' }
                        : setting,
                ),
            });
        }),
    );
    showCard();

    await userEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }));
    await userEvent.click(screen.getByLabelText(/^Je Beratungsstelle/));
    await userEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: '2' }));
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() =>
        expect(received).toEqual({
            values: {
                agencyMinimumCounsellors: '2',
                tenantMinimumCounsellors: '5',
                platformMinimumCounsellors: '3',
                messageCountTracking: 'ENABLED',
            },
            revision: 4,
        }),
    );
    expect(await screen.findByText('Gilt seit 01.11.2026')).toBeVisible();
});

it('downloads the change protocol as CSV', async () => {
    server.use(
        http.get('*/useradmin/statistics/settings/history', () =>
            HttpResponse.json([
                {
                    key: 'platformMinimumCounsellors',
                    oldValue: '5',
                    newValue: '3',
                    changedById: 'id',
                    changedByName: 'platform.admin',
                    effectiveFrom: '2026-10-28T14:00',
                },
            ]),
        ),
    );
    const blobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
        blobs.push(blob);
        return 'blob:protocol';
    });
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    showCard();

    await userEvent.click(await screen.findByRole('button', { name: 'Protokoll herunterladen (CSV)' }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    const csv = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsText(blobs[0]);
    });
    expect(csv).toContain('Mindestzahl Beratende für die gesamte Plattform;5;3;platform.admin;2026-10-28T14:00');
});

it('shows nothing and asks for nothing when the admin is not a platform admin', () => {
    signIn(7);
    const { container } = showCard();

    expect(container).toBeEmptyDOMElement();
});
