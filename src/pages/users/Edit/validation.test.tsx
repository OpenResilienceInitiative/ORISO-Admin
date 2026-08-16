import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserEditOrAdd } from './index';

const mocks = vi.hoisted(() => ({
    mutate: vi.fn(),
    navigate: vi.fn(),
    agenciesResponse: { data: [] },
    consultantsResponse: { data: [] },
    topics: [],
}));

const translations: Record<string, string> = {
    firstname: 'First name',
    lastname: 'Last name',
    email: 'Email',
    'counselor.username': 'Username',
    'counselor.password': 'Password',
    'counselor.passwordConfirmation': 'Confirm password',
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
        useParams: () => ({ id: 'add', typeOfUsers: 'consultants' }),
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
vi.mock('../../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => false }) }));
// `hasRole` as well as `isSuperAdmin`: the form gates its admin-remarks field on
// `hasRole([TenantAdmin, SingleTenantAdmin])`. False keeps this test on the same
// minimal-permission user as the `can: () => false` mock above — the fields under
// test here are username and e-mail, not the privileged extras.
vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({ isSuperAdmin: false, hasRole: () => false }),
}));
vi.mock('../../../utils/parseUserAuthInfo', () => ({ parseUserAuthInfo: () => ({ tenantId: 84 }) }));
vi.mock('../../../api/tenant/getSingleTenantData', () => ({
    getSingleTenantData: () => Promise.resolve({ id: 84, name: 'Test tenant' }),
}));

describe('consultant form validation (#717)', () => {
    beforeEach(() => {
        mocks.mutate.mockReset();
        mocks.navigate.mockReset();
    });

    it('keeps entered values and focuses username after the real Save action rejects its format', async () => {
        const user = userEvent.setup();
        render(<UserEditOrAdd />);

        await waitFor(() => expect(screen.getByLabelText('tenantAdmins.form.tenantAssignment')).toHaveValue('84'));
        await user.type(screen.getByLabelText('First name'), 'Lisa');
        await user.type(screen.getByLabelText('Last name'), 'Simpson');
        await user.type(screen.getByLabelText('Email'), 'lisa@example.org');
        await user.type(screen.getByLabelText('Username'), 'lisa.simpson');
        await user.type(screen.getByLabelText('Password'), 'Strong!Pass1');
        await user.type(screen.getByLabelText('Confirm password'), 'Strong!Pass1');
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(await screen.findByText('Username contains invalid characters')).toBeVisible();
        expect(mocks.mutate).not.toHaveBeenCalled();
        expect(screen.getByLabelText('First name')).toHaveValue('Lisa');
        expect(screen.getByLabelText('Username')).toHaveValue('lisa.simpson');
        expect(screen.getByLabelText('Username')).toHaveFocus();
    });
});
