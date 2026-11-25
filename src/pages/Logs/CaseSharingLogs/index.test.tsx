import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CaseSharingChangeEntry } from '../../../types/caseSharingLogs';
import { CaseSharingLogsPage } from './index';

const TRANSLATIONS: Record<string, string> = {
    'caseSharingLogs.model.CASE_HANDOVER': 'Fallübergabe',
    'caseSharingLogs.model.TEAM_COUNSELLING': 'Teamberatung',
    'caseSharingLogs.model.NONE': 'Keine',
    'caseSharingLogs.source.AGENCY_SETTINGS': 'Einstellungen',
    'caseSharingLogs.source.AGENCY_TYPE': 'Art der Beratungsstelle',
    'caseSharingLogs.system': 'System',
};
const t = (key: string, options?: { defaultValue?: string }) => TRANSLATIONS[key] ?? (options?.defaultValue || key);

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t, i18n: { language: 'de' } }),
}));

vi.mock('../../../components/Notify', () => ({
    Notify: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
}));

const hook = vi.hoisted(() => ({
    state: {} as {
        data?: { total: number; entries: CaseSharingChangeEntry[] };
        isLoading: boolean;
        isError: boolean;
        error: unknown;
    },
    calls: [] as Array<{ page: number; perPage: number }>,
}));

vi.mock('../../../hooks/useCaseSharingLogsData', () => ({
    useCaseSharingLogsData: (args: { page: number; perPage: number }) => {
        hook.calls.push(args);
        return hook.state;
    },
}));

const ENTRIES: CaseSharingChangeEntry[] = [
    {
        id: 2,
        agencyId: 5,
        agencyName: 'Beratungsstelle Mitte',
        tenantId: 1,
        changedAt: '2026-11-25T09:00:00Z',
        changedBy: 'Anna Admin',
        previousModel: 'CASE_HANDOVER',
        newModel: 'TEAM_COUNSELLING',
        source: 'AGENCY_SETTINGS',
    },
    {
        id: 1,
        agencyId: 7,
        agencyName: 'Beratungsstelle Nord',
        tenantId: 1,
        changedAt: '2026-11-20T08:00:00Z',
        changedBy: null,
        previousModel: null,
        newModel: 'NONE',
        source: 'AGENCY_TYPE',
    },
];

const rowFor = (agencyName: string) => screen.getByText(agencyName).closest('tr') as HTMLElement;

describe('CaseSharingLogsPage', () => {
    beforeEach(() => {
        hook.calls = [];
        hook.state = { data: { total: 2, entries: ENTRIES }, isLoading: false, isError: false, error: null };
    });

    it('explains that a switch only affects new cases', () => {
        render(<CaseSharingLogsPage />);
        expect(screen.getByText('caseSharingLogs.intro')).toBeInTheDocument();
    });

    it('renders one row per change with German model names and source', () => {
        render(<CaseSharingLogsPage />);

        const row = rowFor('Beratungsstelle Mitte');
        expect(within(row).getByText('Anna Admin')).toBeInTheDocument();
        expect(within(row).getByText('Fallübergabe → Teamberatung')).toBeInTheDocument();
        expect(within(row).getByText('Einstellungen')).toBeInTheDocument();
        expect(within(row).getByText('ID 5')).toBeInTheDocument();
    });

    it('shows a missing previous model as a dash and a missing actor as System', () => {
        render(<CaseSharingLogsPage />);

        const row = rowFor('Beratungsstelle Nord');
        expect(within(row).getByText('— → Keine')).toBeInTheDocument();
        expect(within(row).getByText('System')).toBeInTheDocument();
        expect(within(row).getByText('Art der Beratungsstelle')).toBeInTheDocument();
    });

    it('shows the empty state when nothing changed yet', () => {
        hook.state = { data: { total: 0, entries: [] }, isLoading: false, isError: false, error: null };
        render(<CaseSharingLogsPage />);

        expect(screen.getByTestId('admin-empty')).toHaveTextContent('caseSharingLogs.empty');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('reports a load failure', () => {
        hook.state = { data: undefined, isLoading: false, isError: true, error: new Error('API call error: 500') };
        render(<CaseSharingLogsPage />);

        expect(screen.getByRole('alert')).toHaveTextContent('error.loading');
        expect(screen.getByTestId('admin-empty')).toHaveTextContent('notify.tile.notLoaded');
    });

    it('says the admin may not see the log when the backend answers 403', () => {
        hook.state = { data: undefined, isLoading: false, isError: true, error: new Error('FORBIDDEN') };
        render(<CaseSharingLogsPage />);

        expect(screen.getByRole('alert')).toHaveTextContent('caseSharingLogs.error.forbidden');
        expect(screen.getByTestId('admin-empty')).toHaveTextContent('caseSharingLogs.error.forbidden');
    });

    it('pages through the log', async () => {
        hook.state = { data: { total: 45, entries: ENTRIES }, isLoading: false, isError: false, error: null };
        const user = userEvent.setup();
        render(<CaseSharingLogsPage />);

        await user.click(screen.getByRole('button', { name: /nächste|next/i }));
        expect(hook.calls.at(-1)).toEqual({ page: 2, perPage: 20 });
    });
});
