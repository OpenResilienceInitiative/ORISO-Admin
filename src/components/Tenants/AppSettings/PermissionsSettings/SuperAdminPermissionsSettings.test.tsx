import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SuperAdminPermissionsSettings } from './SuperAdminPermissionsSettings';
import { useTenantAdminControls } from '../../../../hooks/useTenantAdminControls.hook';
import { useTenantAdminControlsMutation } from '../../../../hooks/useTenantAdminControlsMutation.hook';

vi.mock('../../../../hooks/useTenantAdminControls.hook');
vi.mock('../../../../hooks/useTenantAdminControlsMutation.hook');
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('./PermissionsSettingsView', () => ({
    PermissionsSettingsView: ({
        onPolicyChange,
        pendingPolicyFields,
    }: {
        onPolicyChange: (field: string, value: unknown) => void;
        pendingPolicyFields: ReadonlySet<string>;
    }) => (
        <>
            <button type="button" onClick={() => onPolicyChange('first', { value: true, mode: 'SUGGESTED' })}>
                first
            </button>
            <button type="button" onClick={() => onPolicyChange('second', { value: true, mode: 'ENFORCED' })}>
                second
            </button>
            <output data-testid="pending">{Array.from(pendingPolicyFields).sort().join(',')}</output>
        </>
    ),
}));

const baseControls = {
    permissionsPageEnabled: true,
    permissionPolicies: {
        first: { value: false, mode: 'SUGGESTED' as const },
        second: { value: false, mode: 'SUGGESTED' as const },
    },
};

describe('SuperAdminPermissionsSettings policy serialization', () => {
    beforeEach(() => {
        vi.mocked(useTenantAdminControls).mockReturnValue({ data: baseControls, isLoading: false } as ReturnType<
            typeof useTenantAdminControls
        >);
    });

    it('queues complete platform maps and keeps every queued field pending', async () => {
        let resolveFirst: (value: typeof baseControls) => void = () => undefined;
        const firstRequest = new Promise<typeof baseControls>((resolve) => {
            resolveFirst = resolve;
        });
        const mutateAsync = vi
            .fn()
            .mockReturnValueOnce(firstRequest)
            .mockImplementationOnce(async (value) => value);
        vi.mocked(useTenantAdminControlsMutation).mockReturnValue({
            mutate: vi.fn(),
            mutateAsync,
        } as ReturnType<typeof useTenantAdminControlsMutation>);

        render(<SuperAdminPermissionsSettings tenantId="platform" />);
        fireEvent.click(screen.getByRole('button', { name: 'first' }));
        fireEvent.click(screen.getByRole('button', { name: 'second' }));

        expect(screen.getByTestId('pending')).toHaveTextContent('first,second');
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        await act(async () => {
            resolveFirst({
                ...baseControls,
                permissionPolicies: {
                    ...baseControls.permissionPolicies,
                    first: { value: true, mode: 'SUGGESTED' },
                },
            });
            await firstRequest;
        });

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
        expect(mutateAsync.mock.calls[1][0].permissionPolicies).toMatchObject({
            first: { value: true, mode: 'SUGGESTED' },
            second: { value: true, mode: 'ENFORCED' },
        });
    });
});
