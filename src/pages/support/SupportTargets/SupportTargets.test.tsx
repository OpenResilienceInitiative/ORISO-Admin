import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../hooks/useUserRoles.hook', () => ({ useUserRoles: vi.fn() }));
vi.mock('../../../hooks/useSupportAccess', async () => {
    const actual = await vi.importActual<typeof import('../../../hooks/useSupportAccess')>(
        '../../../hooks/useSupportAccess',
    );
    return {
        ...actual,
        useSupportTargets: vi.fn(),
        useRequestSupportAccess: vi.fn(),
    };
});
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../components/Page', () => ({
    Page: Object.assign(({ children }: { children: React.ReactNode }) => <div>{children}</div>, { Title: () => null }),
}));

import { useRequestSupportAccess, useSupportTargets } from '../../../hooks/useSupportAccess';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { SupportTargets } from './index';

const renderPage = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <SupportTargets />
        </QueryClientProvider>,
    );
};

const givenTargets = () =>
    vi.mocked(useSupportTargets).mockReturnValue({
        data: {
            data: [
                { consultantId: 'c-1', firstName: 'Mara', lastName: 'Muster', email: 'm@x.org', agencyId: 7 },
                { consultantId: 'c-1', firstName: 'Mara', lastName: 'Muster', email: 'm@x.org', agencyId: 9 },
            ],
            total: 2,
        },
        isLoading: false,
    } as unknown as ReturnType<typeof useSupportTargets>);

describe('SupportTargets', () => {
    beforeEach(() => {
        vi.mocked(useRequestSupportAccess).mockReturnValue({
            mutate: vi.fn(),
            isPending: false,
        } as unknown as ReturnType<typeof useRequestSupportAccess>);
    });

    it('lists one row per consultant-agency pair for a support admin', () => {
        vi.mocked(useUserRoles).mockReturnValue({ isGlobalSupportAdmin: true } as ReturnType<typeof useUserRoles>);
        givenTargets();

        renderPage();

        // Support is requested for a consultant at one concrete agency, so the same person appears
        // once per assignment rather than once in total.
        expect(screen.getAllByText('supportAccess.targets.request')).toHaveLength(2);
    });

    it('never puts the support column in the DOM for a non-support account', () => {
        vi.mocked(useUserRoles).mockReturnValue({ isGlobalSupportAdmin: false } as ReturnType<typeof useUserRoles>);
        givenTargets();

        const { container } = renderPage();

        // ADR-018 requires hidden, not disabled: a disabled button is still discoverable markup.
        expect(screen.queryByText('supportAccess.targets.request')).toBeNull();
        expect(container.querySelector('[data-cy="support-request-button"]')).toBeNull();
        expect(screen.getByText('supportAccess.targets.forbidden')).toBeTruthy();
    });

    it('names a duplicate request as such instead of blaming the credentials', async () => {
        vi.mocked(useUserRoles).mockReturnValue({ isGlobalSupportAdmin: true } as ReturnType<typeof useUserRoles>);
        givenTargets();
        let onError: ((error: Error) => void) | undefined;
        vi.mocked(useRequestSupportAccess).mockImplementation((options: any) => {
            onError = options?.onError;
            return { mutate: vi.fn(), isPending: false } as never;
        });

        renderPage();
        fireEvent.click(screen.getAllByText('supportAccess.targets.request')[0]);
        // A 409 means a request for this consultant is already open — sending the admin off to
        // re-check password and OTP is a wrong lead, and it cost real debugging time.
        act(() => onError?.({ status: 409 } as never));

        expect(await screen.findByText('supportAccess.request.duplicate')).toBeTruthy();
    });
});
