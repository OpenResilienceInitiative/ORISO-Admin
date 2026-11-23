import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { PolicyValue } from '../../../../types/permissionPolicy';
import type { CallsPermission } from './derivedLegacySettings';
import type { TraegerOnlySettings } from './traegerFunctions';
import { useAppConfigContext } from '../../../../context/useAppConfig';
import { useUserRoles } from '../../../../hooks/useUserRoles.hook';
import { TenantPermissionsSettings } from './TenantPermissionsSettings';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import {
    useTenantPermissionPolicies,
    useTenantPermissionPoliciesMutation,
    useTenantRecipientScopeMutation,
} from '../../../../hooks/useTenantPermissionPolicies';

vi.mock('../../../../hooks/useSingleTenantData');
vi.mock('../../../../hooks/useTenantAdminDataMutation.hook');
vi.mock('../../../../hooks/useTenantPermissionPolicies');
vi.mock('../../../../context/useAppConfig', () => ({ useAppConfigContext: vi.fn(() => ({ settings: {} })) }));
vi.mock('../../../../hooks/useUserRoles.hook', () => ({ useUserRoles: vi.fn(() => ({ isSuperAdmin: false })) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('./PermissionsSettingsView', () => ({
    PermissionsSettingsView: ({
        onPolicyChange,
        permissionPolicies,
        recipientScope,
        callsPermission,
        traegerSettings,
    }: {
        onPolicyChange: (field: string, value: unknown) => void;
        permissionPolicies?: Record<string, PolicyValue<boolean>>;
        recipientScope?: { onSave: (value: { value: string; mode: string }) => Promise<void> };
        callsPermission?: CallsPermission;
        traegerSettings?: TraegerOnlySettings;
    }) => (
        <>
            <output data-testid="calls-permission">{callsPermission ? 'writable' : 'none'}</output>
            <button type="button" onClick={() => onPolicyChange('third', { value: true, mode: 'SUGGESTED' })}>
                third
            </button>
            <button type="button" onClick={() => callsPermission?.follow(false, 'first')}>
                calls off after first
            </button>
            <button type="button" onClick={() => callsPermission?.follow(true, 'second')}>
                calls on after second
            </button>
            <button type="button" onClick={() => callsPermission?.follow(true, 'third')}>
                calls on after third
            </button>
            <button type="button" onClick={() => callsPermission?.follow(true)}>
                align calls
            </button>
            <button type="button" onClick={() => traegerSettings?.onChange?.('featureTeamDiscussionEnabled', true)}>
                team chat
            </button>
            <button
                type="button"
                onClick={() => {
                    recipientScope?.onSave({ value: 'TENANT', mode: 'SUGGESTED' }).catch(() => undefined);
                }}
            >
                scope
            </button>
            <output data-testid="first-value">{String(permissionPolicies?.first?.value)}</output>
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
        second: { value: false, mode: 'SUGGESTED' as const, inherited: true },
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

    it('queues one-field writes without copying resolved inherited defaults into local settings', async () => {
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
        expect(mutateAsync.mock.calls[0][0].policies).toEqual({ first: { value: true, mode: 'SUGGESTED' } });
        await act(async () => {
            resolveFirst({
                ...basePolicies,
                policies: { ...basePolicies.policies, first: { value: true, mode: 'SUGGESTED' } },
            });
            await firstRequest;
        });

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
        expect(mutateAsync.mock.calls[1][0].policies).toEqual({
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
        expect(mutateAsync.mock.calls[1][0].policies).toEqual({
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
            second: { value: true, mode: 'ENFORCED' },
        });
    });

    it('isolates queued writes when the active tenant changes', async () => {
        const tenantEightPolicies = { ...basePolicies, tenantId: 8 };
        vi.mocked(useTenantPermissionPolicies).mockImplementation(
            (tenantId) =>
                ({
                    data: tenantId === '8' ? tenantEightPolicies : basePolicies,
                    isLoading: false,
                    isError: false,
                } as ReturnType<typeof useTenantPermissionPolicies>),
        );
        let resolveTenantSeven: (value: typeof basePolicies) => void = () => undefined;
        const tenantSevenRequest = new Promise<typeof basePolicies>((resolve) => {
            resolveTenantSeven = resolve;
        });
        const mutateTenantSeven = vi.fn().mockReturnValue(tenantSevenRequest);
        const mutateTenantEight = vi.fn().mockImplementation(async (value) => value);
        vi.mocked(useTenantPermissionPoliciesMutation).mockImplementation(
            (tenantId) =>
                ({
                    mutateAsync: tenantId === '8' ? mutateTenantEight : mutateTenantSeven,
                } as ReturnType<typeof useTenantPermissionPoliciesMutation>),
        );

        const view = render(<TenantPermissionsSettings tenantId="7" />);
        fireEvent.click(screen.getByRole('button', { name: 'first' }));
        await waitFor(() => expect(mutateTenantSeven).toHaveBeenCalledTimes(1));

        view.rerender(<TenantPermissionsSettings tenantId="8" />);
        fireEvent.click(screen.getByRole('button', { name: 'second' }));

        await waitFor(() => expect(mutateTenantEight).toHaveBeenCalledTimes(1));
        expect(mutateTenantEight.mock.calls[0][0]).toEqual({
            tenantId: 8,
            policies: { second: { value: true, mode: 'ENFORCED' } },
        });

        await act(async () => {
            resolveTenantSeven(basePolicies);
            await tenantSevenRequest;
        });
        expect(mutateTenantEight).toHaveBeenCalledTimes(1);
    });

    it('discards old tenant callbacks and queued edits after navigating away and back', async () => {
        const tenantEightPolicies = { ...basePolicies, tenantId: 8 };
        vi.mocked(useTenantPermissionPolicies).mockImplementation(
            (tenantId) =>
                ({
                    data: tenantId === '8' ? tenantEightPolicies : basePolicies,
                    isLoading: false,
                    isError: false,
                } as ReturnType<typeof useTenantPermissionPolicies>),
        );
        let resolveOldSave: (value: typeof basePolicies) => void = () => undefined;
        const oldSave = new Promise<typeof basePolicies>((resolve) => {
            resolveOldSave = resolve;
        });
        const mutateAsync = vi
            .fn()
            .mockReturnValueOnce(oldSave)
            .mockImplementation(async (value) => value);
        vi.mocked(useTenantPermissionPoliciesMutation).mockReturnValue({ mutateAsync } as ReturnType<
            typeof useTenantPermissionPoliciesMutation
        >);
        const view = render(<TenantPermissionsSettings tenantId="7" />);
        fireEvent.click(screen.getByRole('button', { name: 'first' }));
        fireEvent.click(screen.getByRole('button', { name: 'second' }));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        view.rerender(<TenantPermissionsSettings tenantId="8" />);
        view.rerender(<TenantPermissionsSettings tenantId="7" />);
        await act(async () => {
            resolveOldSave({
                ...basePolicies,
                policies: {
                    ...basePolicies.policies,
                    first: { value: true, mode: 'SUGGESTED' },
                },
            });
            await oldSave;
        });
        expect(mutateAsync).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('first-value')).toHaveTextContent('false');
    });

    it('does not send an old queued recipient-scope save after navigating away and back', async () => {
        const tenantEightPolicies = { ...basePolicies, tenantId: 8 };
        vi.mocked(useTenantPermissionPolicies).mockImplementation(
            (tenantId) =>
                ({
                    data: tenantId === '8' ? tenantEightPolicies : basePolicies,
                    isLoading: false,
                    isError: false,
                } as ReturnType<typeof useTenantPermissionPolicies>),
        );
        let resolveOldSave: (value: typeof basePolicies) => void = () => undefined;
        const oldSave = new Promise<typeof basePolicies>((resolve) => {
            resolveOldSave = resolve;
        });
        const mutateAsync = vi.fn().mockReturnValue(oldSave);
        const saveScope = vi.fn();
        vi.mocked(useTenantPermissionPoliciesMutation).mockReturnValue({ mutateAsync } as ReturnType<
            typeof useTenantPermissionPoliciesMutation
        >);
        vi.mocked(useTenantRecipientScopeMutation).mockReturnValue({ mutateAsync: saveScope } as ReturnType<
            typeof useTenantRecipientScopeMutation
        >);
        const view = render(<TenantPermissionsSettings tenantId="7" />);
        fireEvent.click(screen.getByRole('button', { name: 'first' }));
        fireEvent.click(screen.getByRole('button', { name: 'scope' }));
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        view.rerender(<TenantPermissionsSettings tenantId="8" />);
        view.rerender(<TenantPermissionsSettings tenantId="7" />);
        await act(async () => {
            resolveOldSave(basePolicies);
            await oldSave;
        });
        expect(saveScope).not.toHaveBeenCalled();
    });
});

/** ORISO-Admin#1577 / #1578 review: what follows the tiles waits in the policy queue. */
describe('TenantPermissionsSettings writes beside the policies', () => {
    const tenantWrite = vi.fn();
    const deferred = () => {
        let resolve: (value: typeof basePolicies) => void = () => undefined;
        let reject: (reason: unknown) => void = () => undefined;
        const promise = new Promise<typeof basePolicies>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
    const tenantWithCalls = (isVideoCallAllowed: boolean) =>
        vi.mocked(useSingleTenantData).mockReturnValue({
            data: { settings: { extendedSettings: { isVideoCallAllowed } } },
            isLoading: false,
        } as unknown as ReturnType<typeof useSingleTenantData>);
    const savePolicies = (mutateAsync: ReturnType<typeof vi.fn>) =>
        vi
            .mocked(useTenantPermissionPoliciesMutation)
            .mockReturnValue({ mutateAsync } as ReturnType<typeof useTenantPermissionPoliciesMutation>);
    const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

    beforeEach(() => {
        tenantWrite.mockReset().mockResolvedValue({});
        vi.mocked(useTenantAdminDataMutation).mockReturnValue({
            mutate: vi.fn(),
            mutateAsync: tenantWrite,
        } as unknown as ReturnType<typeof useTenantAdminDataMutation>);
        vi.mocked(useTenantPermissionPolicies).mockReturnValue({
            data: basePolicies,
            isLoading: false,
            isError: false,
        } as ReturnType<typeof useTenantPermissionPolicies>);
        vi.mocked(useAppConfigContext).mockReturnValue({ settings: {} } as ReturnType<typeof useAppConfigContext>);
        vi.mocked(useUserRoles).mockReturnValue({ isSuperAdmin: false } as ReturnType<typeof useUserRoles>);
        tenantWithCalls(true);
    });

    it('compares with the call permission stored when the queued write runs, not when it was queued', async () => {
        savePolicies(
            vi.fn(async (value) => ({ ...basePolicies, policies: { ...basePolicies.policies, ...value.policies } })),
        );
        render(<TenantPermissionsSettings tenantId="7" />);

        click('first');
        click('calls off after first');
        click('second');
        click('calls on after second');

        await waitFor(() => expect(tenantWrite).toHaveBeenCalledTimes(2));
        expect(tenantWrite.mock.calls.map(([body]) => body.settings.extendedSettings.isVideoCallAllowed)).toEqual([
            false,
            true,
        ]);
    });

    it('does not follow a tile whose save failed, even without a confirmed policy for it', async () => {
        const save = deferred();
        savePolicies(vi.fn().mockReturnValueOnce(save.promise));
        tenantWithCalls(false);
        render(<TenantPermissionsSettings tenantId="7" />);

        click('third');
        click('calls on after third');
        await act(async () => {
            save.reject(new Error('500'));
            await save.promise.catch(() => undefined);
        });

        await waitFor(() => expect(screen.getByRole('button', { name: 'third' })).toBeInTheDocument());
        await act(async () => undefined);
        expect(tenantWrite).not.toHaveBeenCalled();
    });

    it('aligns the stored call permission on request, as one write', async () => {
        savePolicies(vi.fn());
        tenantWithCalls(false);
        render(<TenantPermissionsSettings tenantId="7" />);

        click('align calls');

        await waitFor(() => expect(tenantWrite).toHaveBeenCalledTimes(1));
        expect(tenantWrite).toHaveBeenCalledWith({ settings: { extendedSettings: { isVideoCallAllowed: true } } });
    });

    it('saves Team-Chat only after the policy write queued before it', async () => {
        const save = deferred();
        savePolicies(vi.fn().mockReturnValueOnce(save.promise));
        render(<TenantPermissionsSettings tenantId="7" />);

        click('first');
        click('team chat');
        await act(async () => undefined);
        expect(tenantWrite).not.toHaveBeenCalled();

        await act(async () => {
            save.resolve(basePolicies);
            await save.promise;
        });
        await waitFor(() =>
            expect(tenantWrite).toHaveBeenCalledWith({ settings: { featureTeamDiscussionEnabled: true } }),
        );
    });

    it('offers the call permission only where the former "Anrufe" switch was offered', () => {
        savePolicies(vi.fn());
        vi.mocked(useAppConfigContext).mockReturnValue({
            settings: { multitenancyWithSingleDomainEnabled: true },
        } as ReturnType<typeof useAppConfigContext>);
        const { rerender } = render(<TenantPermissionsSettings tenantId="7" />);
        expect(screen.getByTestId('calls-permission')).toHaveTextContent('none');

        vi.mocked(useUserRoles).mockReturnValue({ isSuperAdmin: true } as ReturnType<typeof useUserRoles>);
        rerender(<TenantPermissionsSettings tenantId="7" />);
        expect(screen.getByTestId('calls-permission')).toHaveTextContent('writable');
    });
});
