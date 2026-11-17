import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { StatisticsReaderEditOrAdd } from './index';

const mocks = vi.hoisted(() => ({
    navigate: vi.fn(),
    can: vi.fn(),
    isSuperAdmin: true,
    params: { id: 'add' } as { id: string },
    mutate: vi.fn(),
    record: undefined as Record<string, string> | undefined,
    mutationOptions: undefined as { onSuccess?: () => void } | undefined,
}));

const t = (key: string) => key;
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t, i18n: { language: 'de' } }) }));
vi.mock('react-router-dom', async () => ({
    ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
    useNavigate: () => mocks.navigate,
    useParams: () => mocks.params,
}));
vi.mock('../../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: mocks.can }) }));
vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({ isSuperAdmin: mocks.isSuperAdmin }),
}));
vi.mock('../../../hooks/useStatisticsReaders', () => ({
    useStatisticsReaderData: ({ enabled }: { enabled: boolean }) => ({
        data: enabled ? mocks.record : undefined,
        isLoading: false,
        isError: false,
    }),
    useAddOrUpdateStatisticsReader: (options: { onSuccess?: () => void }) => {
        mocks.mutationOptions = options;
        return { mutate: mocks.mutate, isPending: false };
    },
}));
vi.mock('../../ErrorPages/AccessDenied', () => ({ AccessDenied: () => <div role="alert">access-denied</div> }));
vi.mock('../../../components/Page', () => {
    const Page = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
    Page.BackWithActions = ({ children, title }: { children: React.ReactNode; title?: React.ReactNode }) => (
        <div>
            <h1>{title}</h1>
            {children}
        </div>
    );
    return { Page };
});
vi.mock('../../../components/Card', () => ({
    Card: ({ children, titleKey }: { children: React.ReactNode; titleKey: string }) => (
        <section>
            <h2>{titleKey}</h2>
            {children}
        </section>
    ),
}));
vi.mock('../../../components/mui/MuiFormField', async () => {
    const { Form } = await import('antd');
    const Field = ({ name, disabled }: { name: string; disabled?: boolean }) => (
        <Form.Item name={name}>
            <input aria-label={name} disabled={disabled} />
        </Form.Item>
    );
    return { MuiFormField: Field };
});

const type = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } });

describe('StatisticsReaderEditOrAdd (ORISO-UserService#1666)', () => {
    beforeEach(() => {
        mocks.navigate.mockReset();
        mocks.mutate.mockReset();
        mocks.can.mockReset();
        mocks.can.mockImplementation(
            (_: PermissionAction, resource: Resource) => resource === Resource.StatisticsReaderUser,
        );
        mocks.isSuperAdmin = true;
        mocks.params = { id: 'add' };
        mocks.record = undefined;
    });

    it('creates a reader from first name, last name, username and e-mail', async () => {
        render(<StatisticsReaderEditOrAdd />);

        type('firstname', 'Sam');
        type('lastname', 'Reader');
        type('username', 'sam.reader');
        type('email', 'sam@example.test');
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        await waitFor(() =>
            expect(mocks.mutate).toHaveBeenCalledWith(
                expect.objectContaining({
                    firstname: 'Sam',
                    lastname: 'Reader',
                    username: 'sam.reader',
                    email: 'sam@example.test',
                }),
            ),
        );
        mocks.mutationOptions?.onSuccess?.();
        expect(mocks.navigate).toHaveBeenCalledWith('/admin/users/statistics-readers');
    });

    it('explains the password e-mail and the 2FA setup', () => {
        render(<StatisticsReaderEditOrAdd />);

        expect(screen.getByText('statisticsReaders.hint.onboarding')).toBeInTheDocument();
    });

    it('shows an existing reader read-only until "edit", with the username fixed', () => {
        mocks.params = { id: '44' };
        mocks.record = { id: '44', firstname: 'Sam', lastname: 'Reader', username: 'sam', email: 'sam@example.test' };
        render(<StatisticsReaderEditOrAdd />);

        expect(screen.getByLabelText('firstname')).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        expect(screen.getByLabelText('firstname')).not.toBeDisabled();
        expect(screen.getByLabelText('username')).toBeDisabled();
    });

    it('denies everyone but a platform admin', () => {
        mocks.isSuperAdmin = false;
        render(<StatisticsReaderEditOrAdd />);

        expect(screen.getByRole('alert')).toHaveTextContent('access-denied');
    });

    it('denies a platform admin without the permission', () => {
        mocks.can.mockReturnValue(false);
        render(<StatisticsReaderEditOrAdd />);

        expect(screen.getByRole('alert')).toHaveTextContent('access-denied');
    });
});
