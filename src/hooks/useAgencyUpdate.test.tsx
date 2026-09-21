import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgencyUpdate } from './useAgencyUpdate';

const mocks = vi.hoisted(() => ({
    updateAgencyData: vi.fn(async (_stored, update) => update),
    agency: {
        id: 282,
        name: 'E2E Agency',
        dataProtection: {
            agencyDataProtectionResponsibleContact: null,
            alternativeDataProtectionRepresentativeContact: null,
            dataProtectionOfficerContact: null,
            dataProtectionResponsibleEntity: null,
        },
        content: {},
    },
}));

vi.mock('../api/agency/updateAgencyData', () => ({ updateAgencyData: mocks.updateAgencyData }));
vi.mock('../api/agency/addAgencyData', () => ({ default: vi.fn() }));
vi.mock('./useAgencyData', () => ({ useAgencyData: () => ({ data: mocks.agency }) }));

describe('useAgencyUpdate sequential card saves', () => {
    beforeEach(() => {
        mocks.updateAgencyData.mockClear();
    });

    it('merges a later card patch with the latest optimistic agency state', async () => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        queryClient.setQueryData(['AGENCY', '282'], mocks.agency);
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => useAgencyUpdate('282'), { wrapper });

        await result.current.mutateAsync({
            dataProtection: {
                agencyDataProtectionResponsibleContact: {
                    nameAndLegalForm: 'E2E Responsible Operator gGmbH',
                },
            },
        } as never);
        await result.current.mutateAsync({
            content: { impressum: { en: '<p>E2E imprint</p>' } },
        } as never);

        await waitFor(() => expect(mocks.updateAgencyData).toHaveBeenCalledTimes(2));
        const secondUpdate = mocks.updateAgencyData.mock.calls[1][1];
        expect(secondUpdate.dataProtection.agencyDataProtectionResponsibleContact).toEqual({
            nameAndLegalForm: 'E2E Responsible Operator gGmbH',
        });
        expect(secondUpdate.content.impressum).toEqual({ en: '<p>E2E imprint</p>' });
    });

    it('replaces explicitly supplied legal maps while preserving sibling content and partial updates', async () => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        queryClient.setQueryData(['AGENCY', '282'], {
            ...mocks.agency,
            description: 'Keep this description',
            content: {
                privacy: { de: '<p>Old privacy</p>', en: '<p>Remove privacy</p>' },
                impressum: { de: '<p>Keep imprint</p>' },
                privacyConsent: { de: 'Old consent', en: 'Remove consent' },
                termsAndConditions: { de: '<p>Keep terms</p>' },
                confirmPrivacy: true,
            },
        });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => useAgencyUpdate('282'), { wrapper });

        await result.current.mutateAsync({
            content: {
                privacy: { de: '<p>New privacy</p>' },
                privacyConsent: {},
            },
        } as never);

        await waitFor(() => expect(mocks.updateAgencyData).toHaveBeenCalledTimes(1));
        const update = mocks.updateAgencyData.mock.calls[0][1];
        expect(update.content).toEqual({
            privacy: { de: '<p>New privacy</p>' },
            impressum: { de: '<p>Keep imprint</p>' },
            privacyConsent: {},
            termsAndConditions: { de: '<p>Keep terms</p>' },
            confirmPrivacy: true,
        });
        expect(update.description).toBe('Keep this description');
    });

    it('reloads the agency after a failed update so a partial server write is not undone later', async () => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        queryClient.setQueryData(['AGENCY', '282'], mocks.agency);
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        mocks.updateAgencyData.mockRejectedValueOnce(new Error('postcode range rejected'));
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => useAgencyUpdate('282'), { wrapper });

        await expect(result.current.mutateAsync({ description: 'x' } as never)).rejects.toThrow(
            'postcode range rejected',
        );

        await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['AGENCY', '282'] }));
    });

    it('does not let a failed legal publication leak into a later unrelated card save', async () => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        queryClient.setQueryData(['AGENCY', '282'], {
            ...mocks.agency,
            description: 'Stored description',
            content: { privacy: { de: '<p>Published privacy</p>' } },
        });
        mocks.updateAgencyData
            .mockRejectedValueOnce(new Error('publication rejected'))
            .mockImplementationOnce(async (_stored, update) => update);
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => useAgencyUpdate('282'), { wrapper });

        await expect(
            result.current.mutateAsync({ content: { privacy: { de: '<p>Rejected privacy</p>' } } } as never),
        ).rejects.toThrow('publication rejected');
        await result.current.mutateAsync({ description: 'Updated description' } as never);

        expect(mocks.updateAgencyData).toHaveBeenCalledTimes(2);
        const laterUpdate = mocks.updateAgencyData.mock.calls[1][1];
        expect(laterUpdate.description).toBe('Updated description');
        expect(laterUpdate.content.privacy).toEqual({ de: '<p>Published privacy</p>' });
    });

    it('serializes overlapping successful card saves so the later patch includes the first', async () => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        queryClient.setQueryData(['AGENCY', '282'], mocks.agency);
        let finishFirst: () => void = () => undefined;
        mocks.updateAgencyData
            .mockImplementationOnce(
                (_stored, update) =>
                    new Promise((resolve) => {
                        finishFirst = () => resolve(update);
                    }),
            )
            .mockImplementationOnce(async (_stored, update) => update);
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => useAgencyUpdate('282'), { wrapper });

        const firstSave = result.current.mutateAsync({ description: 'First card' } as never);
        const secondSave = result.current.mutateAsync({
            content: { impressum: { de: '<p>Second card</p>' } },
        } as never);

        await waitFor(() => expect(mocks.updateAgencyData).toHaveBeenCalledTimes(1));
        finishFirst();
        await Promise.all([firstSave, secondSave]);

        const secondUpdate = mocks.updateAgencyData.mock.calls[1][1];
        expect(secondUpdate.description).toBe('First card');
        expect(secondUpdate.content.impressum).toEqual({ de: '<p>Second card</p>' });
    });
});
