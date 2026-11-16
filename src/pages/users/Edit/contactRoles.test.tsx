import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserEditOrAdd } from './index';

const admin = (adminId: string) => ({ adminId, firstname: adminId, lastname: '', email: `${adminId}@example.org` });
const PAIRS = {
    1: { agencyId: 1, contact: admin('other'), deputy: null },
    2: { agencyId: 2, contact: admin('other'), deputy: null },
};

const mocks = vi.hoisted(() => ({
    mutate: vi.fn(),
    navigate: vi.fn(),
    putAgencyContactPerson: vi.fn(),
    agenciesResponse: { data: [] },
    consultantsResponse: {
        data: [
            {
                id: 'me',
                firstname: 'Edna',
                lastname: 'Krabappel',
                email: 'edna@example.org',
                username: 'edna',
                tenantId: 84,
                agencies: [
                    { id: 1, name: 'Springfield Nord' },
                    { id: 2, name: 'Springfield Süd' },
                ],
            },
        ],
    },
    topics: [],
    contactPairs: { pairs: {} as Record<number, unknown>, failedIds: [] as number[] },
}));

const translations: Record<string, string> = {
    firstname: 'First name',
    lastname: 'Last name',
    email: 'Email',
    'counselor.username': 'Username',
    'counselor.password': 'Password',
    'message.error.username.format': 'Username contains invalid characters',
    'message.error.username.required': 'Username is required',
    'message.error.email.incorrect': 'Enter a valid email',
    'message.error.password.minLength': 'Password is too short',
    'message.error.password.policy': 'Password does not match the policy',
    'profile.passwordChange.error.passwordsNotMatch': 'Passwords do not match',
    'form.errors.required': 'Required',
    save: 'Save',
    'btn.cancel': 'Cancel',
};
const t = (key: string) => translations[key] || key;

vi.mock('react-i18next', () => ({
    useTranslation: () => Object.assign([t], { t, i18n: { language: 'en' } }),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mocks.navigate,
        useParams: () => ({ id: 'me', typeOfUsers: 'agency-admins' }),
    };
});

vi.mock('@tanstack/react-query', async () => {
    const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
    return {
        ...actual,
        useQueryClient: () => ({ invalidateQueries: vi.fn() }),
    };
});

vi.mock('../../../components/Page', () => {
    const Page = ({ children }: { children: React.ReactNode }) => <main>{children}</main>;
    Page.BackWithActions = ({ children }: { children: React.ReactNode }) => <header>{children}</header>;
    return { Page };
});

vi.mock('../../../components/Card', () => ({
    Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));

vi.mock('../../../components/mui/MuiSelectField', async () => {
    const { Form, Input } = await vi.importActual<typeof import('antd')>('antd');
    return {
        MuiSelectField: ({ name, label }: { name: string; label: string }) => (
            <Form.Item name={name}>
                <Input aria-label={label} />
            </Form.Item>
        ),
    };
});

vi.mock('../../../components/mui/MuiSwitchField', () => ({ MuiSwitchField: () => null }));
vi.mock('../../../components/CreateAgencyModal', () => ({ CreateAgencyModal: () => null }));
vi.mock('../../../components/GrantConsultantIdentityModal', () => ({ GrantConsultantIdentityModal: () => null }));
vi.mock('../../../hooks/useAddOrUpdateConsultantOrAgencyAdmin', () => ({
    useAddOrUpdateConsultantOrAdmin: () => ({ mutate: mocks.mutate }),
}));
vi.mock('../../../hooks/useAgencysData', () => ({
    useAgenciesData: () => ({ data: mocks.agenciesResponse, isLoading: false }),
}));
vi.mock('../../../hooks/useConsultantsOrAdminsData', () => ({
    useConsultantsOrAdminsData: () => ({ data: mocks.consultantsResponse, isLoading: false }),
}));
vi.mock('../../../hooks/useTenantTopics', () => ({
    useTenantTopics: () => ({ data: mocks.topics, isLoading: false }),
}));
vi.mock('../../../hooks/useCounselorById', () => ({
    useCounselorById: () => ({ data: undefined, isLoading: false }),
}));
vi.mock('../../../hooks/useContactPerson', () => ({
    useAgencyContactPairs: () => ({ ...mocks.contactPairs, retryFailed: () => undefined, isLoading: false }),
}));
vi.mock('../../../api/contactPerson/contactPersonApi', () => ({
    putAgencyContactPerson: mocks.putAgencyContactPerson,
}));
vi.mock('../../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => true }) }));
// No tenant-admin extras: this test is about the contact roles of an agency admin.
vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({ isSuperAdmin: false, hasRole: () => false }),
}));
vi.mock('../../../utils/parseUserAuthInfo', () => ({ parseUserAuthInfo: () => ({ tenantId: 84 }) }));
vi.mock('../../../api/tenant/getSingleTenantData', () => ({
    getSingleTenantData: () => Promise.resolve({ id: 84, name: 'Test tenant' }),
}));

const Editor = ({ client }: { client: QueryClient }) => (
    <QueryClientProvider client={client}>
        <UserEditOrAdd />
    </QueryClientProvider>
);

/** ORISO-Admin#1534: a role the admin changed must survive its centre failing to reload. */
describe('admin edit: "Ansprechperson für" after a failed reload', () => {
    beforeEach(() => {
        mocks.mutate.mockReset();
        mocks.navigate.mockReset();
        mocks.putAgencyContactPerson.mockReset().mockResolvedValue(undefined);
        mocks.contactPairs = { pairs: { ...PAIRS }, failedIds: [] };
    });

    it('does not save the admin when the changed centre dropped out of the form', async () => {
        const user = userEvent.setup();
        const client = new QueryClient();
        const { rerender } = render(<Editor client={client} />);

        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        const sued = await screen.findByRole('group', { name: 'Springfield Süd' });
        const role = within(sued).getByLabelText('admin.contactPersonFor.role');
        await user.clear(role);
        await user.type(role, 'DEPUTY');

        // The reload of Süd fails: its row unmounts, Nord stays.
        mocks.contactPairs = { pairs: { 1: PAIRS[1] }, failedIds: [2] };
        rerender(<Editor client={client} />);
        await waitFor(() => expect(screen.queryByRole('group', { name: 'Springfield Süd' })).toBeNull());

        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(screen.getByText(/admin\.contactPersonFor\.saveFailedFor/)).toBeInTheDocument());
        expect(mocks.putAgencyContactPerson).not.toHaveBeenCalled();
        expect(mocks.mutate).not.toHaveBeenCalled();
        expect(mocks.navigate).not.toHaveBeenCalled();
    });

    it('sends the changed role once the centre is back', async () => {
        const user = userEvent.setup();
        const client = new QueryClient();
        const { rerender } = render(<Editor client={client} />);

        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        const role = within(await screen.findByRole('group', { name: 'Springfield Süd' })).getByLabelText(
            'admin.contactPersonFor.role',
        );
        await user.clear(role);
        await user.type(role, 'DEPUTY');

        mocks.contactPairs = { pairs: { 1: PAIRS[1] }, failedIds: [2] };
        rerender(<Editor client={client} />);
        await waitFor(() => expect(screen.queryByRole('group', { name: 'Springfield Süd' })).toBeNull());
        mocks.contactPairs = { pairs: { ...PAIRS }, failedIds: [] };
        rerender(<Editor client={client} />);
        await screen.findByRole('group', { name: 'Springfield Süd' });

        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() =>
            expect(mocks.putAgencyContactPerson).toHaveBeenCalledWith(2, {
                contactAdminId: 'other',
                deputyAdminId: 'me',
            }),
        );
        expect(mocks.putAgencyContactPerson).toHaveBeenCalledTimes(1);
    });
});
