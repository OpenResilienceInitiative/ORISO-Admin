import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { useContactRoleSaver } from './useContactRoleSaver';

const mocks = vi.hoisted(() => ({ putAgencyContactPerson: vi.fn() }));

vi.mock('../../../api/contactPerson/contactPersonApi', () => ({
    putAgencyContactPerson: mocks.putAgencyContactPerson,
}));

const admin = (adminId: string) => ({ adminId, firstname: adminId, lastname: '', email: `${adminId}@example.org` });
const pairs = {
    1: { agencyId: 1, contact: admin('other'), deputy: null },
    2: { agencyId: 2, contact: admin('other'), deputy: null },
};
const centres = [
    { agencyId: 1, agencyName: 'Springfield Nord', role: 'NONE' as const, currentContactName: 'other' },
    { agencyId: 2, agencyName: 'Springfield Süd', role: 'NONE' as const, currentContactName: 'other' },
];

const deferred = () => {
    let resolve: () => void = () => undefined;
    const promise = new Promise<void>((done) => {
        resolve = done;
    });
    return { promise, resolve };
};

const setup = () => {
    const queryClient = new QueryClient();
    const refetch = deferred();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockReturnValue(refetch.promise);
    const onSaveFailed = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
        () =>
            useContactRoleSaver({
                enabled: true,
                adminId: 'me',
                pairs: pairs as never,
                centres,
                onPlanErrors: vi.fn(),
                onSaveFailed,
            }),
        { wrapper },
    );
    return { result, refetch, invalidate, onSaveFailed };
};

describe('useContactRoleSaver (ORISO-Admin#1534)', () => {
    beforeEach(() => {
        mocks.putAgencyContactPerson.mockReset();
    });

    it('stays saving and refuses a second save until the refetch after a partial failure is back', async () => {
        mocks.putAgencyContactPerson.mockImplementation((agencyId: number) =>
            agencyId === 2 ? Promise.reject(new Error('400')) : Promise.resolve(undefined),
        );
        const { result, refetch, invalidate, onSaveFailed } = setup();
        const roles = { '1': 'DEPUTY' as const, '2': 'DEPUTY' as const };

        let first: Promise<boolean> = Promise.resolve(true);
        act(() => {
            first = result.current.saveContactRoles(roles);
        });
        await vi.waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['CONTACT_PERSON'] }));
        expect(result.current.saving).toBe(true);

        // A retry while the pairs are still loading would plan against the old ones.
        let second = true;
        await act(async () => {
            second = await result.current.saveContactRoles(roles);
        });
        expect(second).toBe(false);
        expect(mocks.putAgencyContactPerson).toHaveBeenCalledTimes(2);
        expect(onSaveFailed).not.toHaveBeenCalled();

        await act(async () => {
            refetch.resolve();
            await first;
        });
        await expect(first).resolves.toBe(false);
        expect(onSaveFailed).toHaveBeenCalledWith(['Springfield Süd']);
        expect(result.current.saving).toBe(false);
    });

    it('needs no refetch and no saving state when no role changed', async () => {
        const { result, invalidate } = setup();
        let saved = false;
        await act(async () => {
            saved = await result.current.saveContactRoles({ '1': 'NONE' });
        });
        expect(saved).toBe(true);
        expect(mocks.putAgencyContactPerson).not.toHaveBeenCalled();
        expect(invalidate).not.toHaveBeenCalled();
        expect(result.current.saving).toBe(false);
    });
});
