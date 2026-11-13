import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vite-plus/test';
import type { UserScopeFiltersProps } from '../management/UserScopeFilters';
import { deleteAdviceSeekers, getAdviceSeekers } from '../../../api/adviceSeeker/adviceSeekers';
import { AdviceSeekersTable } from './AdviceSeekersTable';

const state = vi.hoisted(() => ({ canDelete: true, isSuperAdmin: false }));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown> | string) =>
            typeof options === 'object' && 'username' in options ? `${key}:${options.username}` : key,
    }),
}));
vi.mock('../../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => ({ isSuperAdmin: state.isSuperAdmin }) }));
vi.mock('../../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => state.canDelete }) }));
vi.mock('../../../hooks/useAgencysData', () => ({
    useAgenciesData: () => ({ data: { data: [{ id: 3, name: 'Schuldnerberatung Mitte' }] } }),
}));
vi.mock('../../../hooks/useTenantsData', () => ({ useTenantsData: () => ({ data: { data: [] } }) }));
vi.mock('../management/UserScopeFilters', () => ({
    UserScopeFilters: ({ actions }: UserScopeFiltersProps) => <div>{actions}</div>,
    useScopeFilterAvailability: () => ({ tenant: false, agency: true, canListAgencies: true }),
}));
vi.mock('../../../api/adviceSeeker/adviceSeekers', () => ({
    getAdviceSeekers: vi.fn(),
    deleteAdviceSeekers: vi.fn(),
}));

const anna = {
    id: 'a-1',
    username: 'anna',
    agencyIds: [3],
    deletionState: 'ACTIVE',
    createDate: '2026-11-01T08:30:00',
};
const bert = { id: 'a-2', username: 'bert', agencyIds: [], deletionState: 'ACTIVE' };
const carl = {
    id: 'a-3',
    username: 'carl',
    agencyIds: [3],
    deletionState: 'READ_ONLY_SAFEGUARD',
    deleteDate: '2026-11-12T22:00:00',
};

const show = (path = '/admin/users/advice-seekers') =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <AdviceSeekersTable />
            </QueryClientProvider>
        </MemoryRouter>,
    );

const rowOf = (username: string) => screen.getByText(username).closest('tr') as HTMLElement;

describe('AdviceSeekersTable', () => {
    const mockedGet = getAdviceSeekers as unknown as Mock;
    const mockedDelete = deleteAdviceSeekers as unknown as Mock;

    beforeEach(() => {
        state.canDelete = true;
        state.isSuperAdmin = false;
        mockedGet.mockReset().mockResolvedValue({ total: 3, data: [anna, bert, carl] });
        mockedDelete.mockReset();
    });

    afterEach(cleanup);

    it('shows each advice seeker with centre names and an "in deletion" state', async () => {
        show();

        expect(await screen.findByText('anna')).toBeTruthy();
        expect(within(rowOf('anna')).getByText('Schuldnerberatung Mitte')).toBeTruthy();
        expect(within(rowOf('anna')).getByText('adviceSeekers.status.active')).toBeTruthy();
        expect(within(rowOf('bert')).getByText('adviceSeekers.noAgency')).toBeTruthy();
        expect(within(rowOf('carl')).getByText('adviceSeekers.status.inDeletion')).toBeTruthy();
        // Already marked: neither selectable nor deletable again.
        expect(
            (within(rowOf('carl')).getByRole('button', { name: 'adviceSeekers.delete.one:carl' }) as HTMLButtonElement)
                .disabled,
        ).toBe(true);
        expect((within(rowOf('carl')).getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
    });

    it('lists the username searched in the admin search and can show everybody again', async () => {
        show('/admin/users/advice-seekers?q=anna');
        await screen.findByText('anna');

        expect(mockedGet).toHaveBeenCalledWith({ page: 1, perPage: 20, username: 'anna', filters: {} });
        fireEvent.click(within(screen.getByTestId('list-search-bar')).getByRole('button'));

        await waitFor(() =>
            expect(mockedGet).toHaveBeenLastCalledWith({ page: 1, perPage: 20, username: '', filters: {} }),
        );
        expect(screen.queryByTestId('list-search-bar')).toBeNull();
    });

    it('deletes the selected advice seekers after confirmation and lists who failed', async () => {
        mockedDelete.mockResolvedValue([
            { id: 'a-1', result: 'marked' },
            { id: 'a-2', result: 'failed', reason: 'KEYCLOAK_UNAVAILABLE', status: 503 },
        ]);
        show();
        await screen.findByText('anna');

        fireEvent.click(within(rowOf('anna')).getByRole('checkbox'));
        fireEvent.click(within(rowOf('bert')).getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /adviceSeekers.delete.selected/ }));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('adviceSeekers.delete.effectNow')).toBeTruthy();
        expect(within(dialog).getByText('anna')).toBeTruthy();
        expect(within(dialog).getByText('bert')).toBeTruthy();
        expect(mockedDelete).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'delete' }));

        await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith(['a-1', 'a-2']));
        const failures = await screen.findByTestId('advice-seeker-delete-failures');
        expect(within(failures).getByText('bert')).toBeTruthy();
        expect(within(failures).getByText(/adviceSeekers.delete.failure.failed/)).toBeTruthy();

        const callsBefore = mockedGet.mock.calls.length;
        fireEvent.click(screen.getByRole('button', { name: 'adviceSeekers.delete.close' }));
        await waitFor(() => expect(mockedGet.mock.calls.length).toBeGreaterThan(callsBefore));
    });

    it('shows why the nightly run kept an entry and keeps technical accounts of a live Träger', async () => {
        mockedGet.mockResolvedValue({
            total: 2,
            data: [
                {
                    id: 'a-5',
                    username: 'eve',
                    agencyIds: [],
                    deletionState: 'HARD_DELETE_PARTIAL_FAILURE',
                    deleteDate: '2026-11-10T21:30:00',
                    deletionFailureReason:
                        'DATABASE: Unable to delete user: still referenced by session (session_ibfk_1)',
                    deletionFailedAt: '2026-11-13T03:00:12',
                },
                {
                    id: 'group-chat-system-3',
                    username: 'group-chat-system-3',
                    agencyIds: [],
                    deletionState: 'ACTIVE',
                    technical: true,
                    deletable: false,
                },
            ],
        });
        show();
        await screen.findByText('eve');

        expect(within(rowOf('eve')).getByText('adviceSeekers.status.deletionFailed')).toBeTruthy();
        expect(within(rowOf('eve')).getByTestId('advice-seeker-failure-reason').textContent).toContain(
            'still referenced by session (session_ibfk_1)',
        );
        const technical = rowOf('group-chat-system-3');
        expect(within(technical).getByText('adviceSeekers.technical')).toBeTruthy();
        expect(
            (
                within(technical).getByRole('button', {
                    name: 'adviceSeekers.delete.one:group-chat-system-3',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
        expect((within(technical).getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
    });

    it('offers no deletion without the permission', async () => {
        state.canDelete = false;
        show();
        await screen.findByText('anna');

        expect(screen.queryByRole('checkbox')).toBeNull();
        expect(screen.queryByRole('button', { name: /adviceSeekers.delete/ })).toBeNull();
    });
});
