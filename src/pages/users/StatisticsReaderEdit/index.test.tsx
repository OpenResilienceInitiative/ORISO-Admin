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
    loadError: null as Error | null,
    refetch: vi.fn(),
    isFetching: false,
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
        data: enabled && !mocks.loadError ? mocks.record : undefined,
        isLoading: false,
        isFetching: enabled && mocks.isFetching,
        isError: enabled && mocks.loadError !== null,
        error: enabled ? mocks.loadError : null,
        refetch: mocks.refetch,
    }),
    useAddOrUpdateStatisticsReader: (options: { onSuccess?: () => void }) => {
        mocks.mutationOptions = options;
        return { mutate: mocks.mutate, isPending: false };
    },
}));
vi.mock('../../../components/Notify', () => ({
    Notify: ({
        title,
        children,
        actions,
    }: {
        title: React.ReactNode;
        children: React.ReactNode;
        actions?: { label: string; onClick: () => void }[];
    }) => (
        <div role="status">
            <strong>{title}</strong>
            {children}
            {actions?.map((action) => (
                <button key={action.label} type="button" onClick={action.onClick}>
                    {action.label}
                </button>
            ))}
        </div>
    ),
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
    // Forwards `rules` so the required and e-mail validation of the real field still runs.
    const Field = ({ name, disabled, rules }: { name: string; disabled?: boolean; rules?: unknown[] }) => (
        <Form.Item name={name} rules={rules as never}>
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
        mocks.isFetching = false;
        mocks.loadError = null;
        mocks.refetch.mockReset();
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

    it('does not save with required fields left empty', async () => {
        render(<StatisticsReaderEditOrAdd />);

        type('firstname', 'Sam');
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        expect(await screen.findAllByText('form.errors.required')).toHaveLength(3);
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('does not save with an invalid e-mail address', async () => {
        render(<StatisticsReaderEditOrAdd />);

        type('firstname', 'Sam');
        type('lastname', 'Reader');
        type('username', 'sam.reader');
        type('email', 'not-an-address');
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        expect(await screen.findByText('message.error.email.incorrect')).toBeInTheDocument();
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it.each(['FORBIDDEN', 'NO_MATCH'])('shows access denied when the server answers %s for the record', (message) => {
        mocks.params = { id: '44' };
        mocks.loadError = new Error(message);
        render(<StatisticsReaderEditOrAdd />);

        expect(screen.getByRole('alert')).toHaveTextContent('access-denied');
        expect(screen.queryByLabelText('firstname')).not.toBeInTheDocument();
    });

    it.each([new Error('API call error: 500 Internal Server Error'), new TypeError('Failed to fetch')])(
        'offers to load again instead of access denied after a failed request: %s',
        (error) => {
            mocks.params = { id: '44' };
            mocks.loadError = error;
            render(<StatisticsReaderEditOrAdd />);

            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
            expect(screen.getByRole('status')).toHaveTextContent('statisticsReaders.loadError.title');
            expect(screen.queryByLabelText('firstname')).not.toBeInTheDocument();
            fireEvent.click(screen.getByRole('button', { name: 'statisticsReaders.loadError.retry' }));
            expect(mocks.refetch).toHaveBeenCalledTimes(1);
        },
    );

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

    it('saves an edited reader with the changed and the unchanged fields', async () => {
        mocks.params = { id: '44' };
        mocks.record = { id: '44', firstname: 'Sam', lastname: 'Reader', username: 'sam', email: 'sam@example.test' };
        render(<StatisticsReaderEditOrAdd />);

        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        type('firstname', 'Samuel');
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        await waitFor(() =>
            expect(mocks.mutate).toHaveBeenCalledWith(
                expect.objectContaining({ firstname: 'Samuel', lastname: 'Reader', email: 'sam@example.test' }),
            ),
        );
    });

    it('restores the record and saves nothing when editing is cancelled', () => {
        mocks.params = { id: '44' };
        mocks.record = { id: '44', firstname: 'Sam', lastname: 'Reader', username: 'sam', email: 'sam@example.test' };
        render(<StatisticsReaderEditOrAdd />);

        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        type('firstname', 'Samuel');
        fireEvent.click(screen.getByRole('button', { name: 'btn.cancel' }));

        expect(screen.getByLabelText('firstname')).toHaveValue('Sam');
        expect(screen.getByLabelText('firstname')).toBeDisabled();
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('shows a refreshed record instead of the cached one and waits for it before editing', () => {
        mocks.params = { id: '44' };
        mocks.record = { id: '44', firstname: 'Sam', lastname: 'Reader', username: 'sam', email: 'old@example.test' };
        mocks.isFetching = true;
        const { rerender } = render(<StatisticsReaderEditOrAdd />);

        expect(screen.getByRole('button', { name: 'edit' })).toBeDisabled();

        mocks.record = { ...mocks.record, email: 'new@example.test' };
        mocks.isFetching = false;
        rerender(<StatisticsReaderEditOrAdd />);

        expect(screen.getByLabelText('email')).toHaveValue('new@example.test');
        expect(screen.getByRole('button', { name: 'edit' })).toBeEnabled();
    });

    it('lets a platform admin with read but not update permission only look', () => {
        mocks.params = { id: '44' };
        mocks.record = { id: '44', firstname: 'Sam', lastname: 'Reader', username: 'sam', email: 'sam@example.test' };
        mocks.can.mockImplementation((action: PermissionAction) => action === PermissionAction.Read);
        render(<StatisticsReaderEditOrAdd />);

        expect(screen.getByLabelText('firstname')).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'save' })).not.toBeInTheDocument();
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
