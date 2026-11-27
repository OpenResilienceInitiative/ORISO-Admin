import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const mocks = vi.hoisted(() => ({
    getTenantAdmins: vi.fn(),
    fetchData: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../api/admins/getTenantAdmins', () => ({
    getTenantAdmins: mocks.getTenantAdmins,
}));
// The real delete hook runs; only its transport is replaced.
vi.mock('../../../../api/fetchData', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../api/fetchData')>()),
    fetchData: mocks.fetchData,
}));

import { TenantUnitAdmins } from './TenantUnitAdmins';

const admins = [
    { id: 'a', firstname: 'Ada', lastname: 'One', email: 'ada@example.org' },
    { id: 'b', firstname: 'Bea', lastname: 'Two', email: 'bea@example.org' },
];

const renderList = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter>
                <TenantUnitAdmins tenantId="7" />
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

describe('TenantUnitAdmins', () => {
    beforeEach(() => {
        mocks.getTenantAdmins.mockReset();
        mocks.fetchData.mockReset();
        mocks.getTenantAdmins.mockResolvedValue(admins);
        mocks.fetchData.mockResolvedValue(undefined);
    });

    it('lists every admin of the unit and adds another for this tenant', async () => {
        renderList();

        expect(await screen.findByText('Ada One')).toBeInTheDocument();
        expect(screen.getByText('Bea Two')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'tenants.edit.admins.add' })).toHaveAttribute(
            'href',
            '/admin/users/tenant-admins/add?tenantId=7',
        );
    });

    it('removes one admin and refreshes the list without them', async () => {
        const user = userEvent.setup();
        mocks.getTenantAdmins.mockResolvedValueOnce(admins).mockResolvedValue([admins[0]]);
        renderList();
        await screen.findByText('Ada One');

        const removeButtons = screen.getAllByRole('button', { name: 'tenants.edit.admins.remove' });
        await user.click(removeButtons[1]);
        await user.click(screen.getByRole('button', { name: 'delete' }));

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({ url: expect.stringMatching(/\/b$/), method: 'DELETE' }),
        );
        await waitFor(() => expect(screen.queryByText('Bea Two')).not.toBeInTheDocument());
        expect(screen.getByText('Ada One')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'delete' })).not.toBeInTheDocument();
    });

    it('shows a load error with retry instead of claiming there is no admin', async () => {
        const user = userEvent.setup();
        mocks.getTenantAdmins.mockRejectedValueOnce(new Error('503')).mockResolvedValue(admins);
        renderList();

        expect(await screen.findByRole('alert')).toHaveTextContent('tenants.edit.admins.loadError');
        expect(screen.queryByText('tenants.edit.adminEmailsCardEmpty')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'tenants.edit.admins.retry' }));
        expect(await screen.findByText('Ada One')).toBeInTheDocument();
    });
});
