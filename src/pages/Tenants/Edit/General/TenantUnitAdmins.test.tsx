import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const mocks = vi.hoisted(() => ({
    getTenantAdmins: vi.fn(),
    deleteAdmin: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../api/admins/getTenantAdmins', () => ({
    getTenantAdmins: mocks.getTenantAdmins,
}));
vi.mock('../../../../hooks/useDeleteTenantAdmin', () => ({
    useDeleteTenantAdmin: () => ({ mutate: mocks.deleteAdmin }),
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
        mocks.deleteAdmin.mockReset();
        mocks.getTenantAdmins.mockResolvedValue(admins);
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

    it('removes one admin and leaves the other on the list', async () => {
        const user = userEvent.setup();
        renderList();
        await screen.findByText('Ada One');

        const removeButtons = screen.getAllByRole('button', { name: 'tenants.edit.admins.remove' });
        await user.click(removeButtons[1]);
        await user.click(screen.getByRole('button', { name: 'delete' }));

        expect(mocks.deleteAdmin).toHaveBeenCalledWith('b');
        expect(screen.getByText('Ada One')).toBeInTheDocument();
        expect(screen.getByText('Bea Two')).toBeInTheDocument();
    });
});
