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
});
