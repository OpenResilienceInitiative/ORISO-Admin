import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentMasterDataCardContainer } from './index';

const { getDpiaMasterData, userRoles } = vi.hoisted(() => ({
    getDpiaMasterData: vi.fn(),
    userRoles: { isSuperAdmin: true },
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../api/tenant/getDpiaMasterData', () => ({ getDpiaMasterData }));
vi.mock('../../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => userRoles }));

// Stub the card: this test is about the request guard, not the fields.
vi.mock('../DocumentMasterDataCard', () => ({
    DocumentMasterDataCard: ({ disabled }: { disabled?: boolean }) => (
        <div data-testid="card" data-disabled={String(Boolean(disabled))} />
    ),
}));

const renderContainer = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <DocumentMasterDataCardContainer />
        </QueryClientProvider>,
    );
};

describe('DocumentMasterDataCardContainer', () => {
    beforeEach(() => {
        getDpiaMasterData.mockReset();
        getDpiaMasterData.mockResolvedValue({ operator: { legalName: 'Deutscher Caritasverband e. V.' } });
        userRoles.isSuperAdmin = true;
    });

    it('loads the record for a superadmin', async () => {
        renderContainer();

        await waitFor(() => expect(getDpiaMasterData).toHaveBeenCalledTimes(1));
        expect(screen.getByTestId('card')).toHaveAttribute('data-disabled', 'false');
    });

    /**
     * ORISO rule: the endpoint is superadmin-only, so the card stays visible for everyone else
     * but must not call it — a 403 in the console is not an acceptable way to enforce that.
     */
    it('never calls the superadmin-only endpoint for anyone else', async () => {
        userRoles.isSuperAdmin = false;
        renderContainer();

        expect(await screen.findByTestId('card')).toHaveAttribute('data-disabled', 'true');
        // Give the query a chance to fire before concluding that it did not.
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });
        expect(getDpiaMasterData).not.toHaveBeenCalled();
    });
});
