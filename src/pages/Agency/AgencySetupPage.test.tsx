import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgencySetupPage } from './AgencySetupPage';
import { FETCH_ERRORS } from '../../api/fetchData';

const mocks = vi.hoisted(() => ({ fetchData: vi.fn(), roles: ['restricted-agency-admin'] }));
vi.mock('../../api/fetchData', async () => ({
    ...(await vi.importActual<typeof import('../../api/fetchData')>('../../api/fetchData')),
    fetchData: mocks.fetchData,
}));
vi.mock('../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        hasRole: (role: string | string[]) =>
            (Array.isArray(role) ? role : [role]).some((candidate) => mocks.roles.includes(candidate)),
        isTechnicalAccount: false,
        tokenUnreadable: false,
    }),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const original = {
    id: '5',
    name: 'Beratung Nord',
    postcode: '10115',
    city: 'Berlin',
    consultingType: '0',
    topics: [{ id: 12, name: 'Familie' }],
    content: { impressum: { de: 'Legal wording' } },
    offline: true,
    teamAgency: false,
};
const agencyReads = () =>
    mocks.fetchData.mock.calls.filter(
        ([request]) => request.method === 'GET' && request.url.includes('/agencyadmin/agencies/'),
    );
const writes = () => mocks.fetchData.mock.calls.filter(([request]) => request.method === 'PUT');

const renderPage = (id = '5') =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <MemoryRouter initialEntries={[`/admin/agency/${id}/setup`]}>
                <Routes>
                    <Route path="/admin/agency/:id/setup" element={<AgencySetupPage />} />
                    <Route path="/admin/agency/5/general" element={<h1>Agency settings</h1>} />
                    <Route path="/admin/agency" element={<h1>My agencies</h1>} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );

beforeEach(() => {
    mocks.roles = ['restricted-agency-admin'];
    mocks.fetchData.mockReset();
    mocks.fetchData.mockImplementation(async ({ url, method }) => {
        if (url.endsWith('/service/users/data')) return { agencies: [{ id: 5 }] };
        if (method === 'GET') return { _embedded: original };
        return { _embedded: original };
    });
});

describe('the authenticated first-centre setup', () => {
    it('opens the shared full form editable and updates the assigned centre without creating a second one', async () => {
        renderPage();
        const user = userEvent.setup();
        const city = await screen.findByLabelText('agency.edit.general.address.city');
        await user.clear(city);
        await user.type(city, 'Potsdam');
        await user.click(screen.getByRole('button', { name: 'agency.setup.finish' }));
        expect(await screen.findByRole('heading', { name: 'Agency settings' })).toBeInTheDocument();
        expect(writes()).toHaveLength(1);
        const request = writes()[0][0];
        expect(request.url).toMatch(/\/agencies\/5$/);
        expect(JSON.parse(request.bodyData)).toMatchObject({
            city: 'Potsdam',
            name: 'Beratung Nord',
            topicIds: ['12'],
            content: original.content,
        });
        expect(mocks.fetchData.mock.calls.some(([call]) => call.method === 'POST')).toBe(false);
    });

    it('refuses same-tenant but unassigned IDs before requesting or displaying their details', async () => {
        renderPage('6');
        expect(await screen.findByRole('alert')).toHaveTextContent('agency.setup.unavailable');
        expect(agencyReads()).toHaveLength(0);
        expect(screen.queryByDisplayValue('Beratung Nord')).not.toBeInTheDocument();
    });

    it.each(['add', '0', '1e2'])('refuses an invalid centre ID %s without agency reads', async (id) => {
        renderPage(id);
        expect(await screen.findByRole('alert')).toHaveTextContent('agency.setup.unavailable');
        expect(agencyReads()).toHaveLength(0);
    });

    it('does not treat ordinary user-admin as counselling-centre authority', async () => {
        mocks.roles = ['user-admin'];
        renderPage();
        expect(await screen.findByRole('alert')).toHaveTextContent('agency.setup.unavailable');
        expect(agencyReads()).toHaveLength(0);
    });

    it('keeps edited fields when the save is refused and succeeds on retry', async () => {
        let fail = true;
        mocks.fetchData.mockImplementation(async ({ url, method }) => {
            if (url.endsWith('/service/users/data')) return { agencies: [{ id: 5 }] };
            if (method === 'PUT' && fail) throw new Error(FETCH_ERRORS.NOT_ALLOWED);
            return { _embedded: original };
        });
        renderPage();
        const user = userEvent.setup();
        const phone = await screen.findByLabelText('agency.edit.general.address.phone');
        await user.type(phone, '03012345');
        await user.click(screen.getByRole('button', { name: 'agency.setup.finish' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('agency.setup.saveError');
        expect(phone).toHaveValue('03012345');
        expect(screen.queryByRole('heading', { name: 'Agency settings' })).not.toBeInTheDocument();
        fail = false;
        await user.click(screen.getByRole('button', { name: 'agency.setup.finish' }));
        await screen.findByRole('heading', { name: 'Agency settings' });
        expect(writes()).toHaveLength(2);
    });

    it('keeps entered details if the failed save recovery GET also fails', async () => {
        let saving = false;
        mocks.fetchData.mockImplementation(async ({ url, method }) => {
            if (url.endsWith('/service/users/data')) return { agencies: [{ id: 5 }] };
            if (method === 'PUT') {
                saving = true;
                throw new Error('offline');
            }
            if (saving) throw new Error('offline');
            return { _embedded: original };
        });
        renderPage();
        const user = userEvent.setup();
        const phone = await screen.findByLabelText('agency.edit.general.address.phone');
        await user.type(phone, '03012345');
        await user.click(screen.getByRole('button', { name: 'agency.setup.finish' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('agency.setup.saveError');
        expect(screen.getByLabelText('agency.edit.general.address.phone')).toHaveValue('03012345');
    });

    it('offers retry for unavailable assignment instead of creating a centre', async () => {
        mocks.fetchData.mockRejectedValueOnce(new Error('offline'));
        renderPage();
        expect(await screen.findByRole('alert')).toHaveTextContent('agency.setup.unavailable');
        expect(agencyReads()).toHaveLength(0);
        await userEvent.click(screen.getByRole('button', { name: 'agency.setup.retry' }));
        await screen.findByDisplayValue('Beratung Nord');
        await waitFor(() => expect(agencyReads()).toHaveLength(1));
    });
});
