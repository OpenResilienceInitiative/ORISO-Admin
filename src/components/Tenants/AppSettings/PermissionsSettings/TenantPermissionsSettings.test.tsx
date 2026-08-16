import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TenantPermissionsSettings } from './TenantPermissionsSettings';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import {
    useTenantPermissionPolicies,
    useTenantPermissionPoliciesMutation,
} from '../../../../hooks/useTenantPermissionPolicies';

vi.mock('../../../../hooks/useSingleTenantData');
vi.mock('../../../../hooks/useTenantAdminDataMutation.hook');
vi.mock('../../../../hooks/useTenantPermissionPolicies');
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('./PermissionsSettingsView', () => ({
    PermissionsSettingsView: ({ onPolicyChange }: { onPolicyChange: (field: string, value: unknown) => void }) => (
        <>
            <button type="button" onClick={() => onPolicyChange('first', { value: true, mode: 'SUGGESTED' })}>
                first
            </button>
            <button type="button" onClick={() => onPolicyChange('second', { value: true, mode: 'ENFORCED' })}>
                second
            </button>
        </>
    ),
}));

const basePolicies = {
    tenantId: 7,
    policies: {
        first: { value: false, mode: 'SUGGESTED' as const },
        second: { value: false, mode: 'SUGGESTED' as const },
    },
};

describe('TenantPermissionsSettings policy loading and serialization', () => {
    beforeEach(() => {
        vi.mocked(useSingleTenantData).mockReturnValue({
            data: { settings: {} },
            isLoading: false,
        } as ReturnType<typeof useSingleTenantData>);
        vi.mocked(useTenantAdminDataMutation).mockReturnValue({ mutate: vi.fn() } as ReturnType<
            typeof useTenantAdminDataMutation
        >);
    });

    it('renders an explicit error instead of editable fallback controls when policies fail to load', () => {
        vi.mocked(useTenantPermissionPolicies).mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
        } as ReturnType<typeof useTenantPermissionPolicies>);
        vi.mocked(useTenantPermissionPoliciesMutation).mockReturnValue({ mutateAsync: vi.fn() } as ReturnType<
            typeof useTenantPermissionPoliciesMutation
        >);

        render(<TenantPermissionsSettings tenantId="7" />);

        expect(screen.getByRole('alert')).toHaveTextContent('error.loading');
        expect(screen.queryByRole('button', { name: 'first' })).not.toBeInTheDocument();
    });

    it('queues complete-map writes so a later field preserves the earlier saved value', async () => {
        vi.mocked(useTenantPermissionPolicies).mockReturnValue({
            data: basePolicies,
            isLoading: false,
            isError: false,
        } as ReturnType<typeof useTenantPermissionPolicies>);
        let resolveFirst: (value: typeof basePolicies) => void = () => undefined;
        const firstRequest = new Promise<typeof basePolicies>((resolve) => {
            resolveFirst = resolve;
        });
        const mutateAsync = vi
            .fn()
            .mockReturnValueOnce(firstRequest)
            .mockImplementationOnce(async (value) => value);
        vi.mocked(useTenantPermissionPoliciesMutation).mockReturnValue({ mutateAsync } as ReturnType<
            typeof useTenantPermissionPoliciesMutation
        >);

        render(<TenantPermissionsSettings tenantId="7" />);
        fireEvent.click(screen.getByRole('button', { name: 'first' }));
        fireEvent.click(screen.getByRole('button', { name: 'second' }));

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        expect(mutateAsync.mock.calls[0][0].policies.first.value).toBe(true);
        await act(async () => {
            resolveFirst({
                ...basePolicies,
                policies: { ...basePolicies.policies, first: { value: true, mode: 'SUGGESTED' } },
            });
            await firstRequest;
        });

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
        expect(mutateAsync.mock.calls[1][0].policies).toMatchObject({
            first: { value: true, mode: 'SUGGESTED' },
            second: { value: true, mode: 'ENFORCED' },
        });
    });

    it('keeps pending changes over a stale policy refetch', async () => {
        let queryData = basePolicies;
        vi.mocked(useTenantPermissionPolicies).mockImplementation(
            () =>
                ({
                    data: queryData,
                    isLoading: false,
                    isError: false,
                } as ReturnType<typeof useTenantPermissionPolicies>),
        );
        let resolveFirst: (value: typeof basePolicies) => void = () => undefined;
        const firstRequest = new Promise<typeof basePolicies>((resolve) => {
            resolveFirst = resolve;
        });
        const mutateAsync = vi
            .fn()
            .mockReturnValueOnce(firstRequest)
            .mockImplementationOnce(async (value) => value);
        vi.mocked(useTenantPermissionPoliciesMutation).mockReturnValue({ mutateAsync } as ReturnType<
            typeof useTenantPermissionPoliciesMutation
        >);

        const view = render(<TenantPermissionsSettings tenantId="7" />);
        fireEvent.click(screen.getByRole('button', { name: 'first' }));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

        queryData = { ...basePolicies, policies: { ...basePolicies.policies } };
        view.rerender(<TenantPermissionsSettings tenantId="7" />);
        fireEvent.click(screen.getByRole('button', { name: 'second' }));
        await act(async () => {
            resolveFirst({
                ...basePolicies,
                policies: { ...basePolicies.policies, first: { value: true, mode: 'SUGGESTED' } },
            });
            await firstRequest;
        });

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
        expect(mutateAsync.mock.calls[1][0].policies).toMatchObject({
            first: { value: true, mode: 'SUGGESTED' },
            second: { value: true, mode: 'ENFORCED' },
        });
    });

    it('rebuilds later writes from confirmed data after two updates to the same field fail', async () => {
        vi.mocked(useTenantPermissionPolicies).mockReturnValue({
            data: basePolicies,
            isLoading: false,
            isError: false,
        } as ReturnType<typeof useTenantPermissionPolicies>);
        let rejectFirst: (reason?: unknown) => void = () => undefined;
        let rejectSecond: (reason?: unknown) => void = () => undefined;
        const firstRequest = new Promise<typeof basePolicies>((_resolve, reject) => {
            rejectFirst = reject;
        });
        const secondRequest = new Promise<typeof basePolicies>((_resolve, reject) => {
            rejectSecond = reject;
        });
        const mutateAsync = vi
            .fn()
            .mockReturnValueOnce(firstRequest)
            .mockReturnValueOnce(secondRequest)
            .mockImplementationOnce(async (value) => value);
        vi.mocked(useTenantPermissionPoliciesMutation).mockReturnValue({ mutateAsync } as ReturnType<
            typeof useTenantPermissionPoliciesMutation
        >);

        render(<TenantPermissionsSettings tenantId="7" />);
        fireEvent.click(screen.getByRole('button', { name: 'first' }));
        fireEvent.click(screen.getByRole('button', { name: 'first' }));
        fireEvent.click(screen.getByRole('button', { name: 'second' }));

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        await act(async () => rejectFirst(new Error('first failed')));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
        await act(async () => rejectSecond(new Error('second failed')));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(3));

        expect(mutateAsync.mock.calls[2][0].policies).toEqual({
            first: { value: false, mode: 'SUGGESTED' },
            second: { value: true, mode: 'ENFORCED' },
        });
    });
});
