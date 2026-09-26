import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SendLegalTemplateDialog } from './index';

const mocks = vi.hoisted(() => ({
    distributeAgency: vi.fn(),
    distributeTenant: vi.fn(),
    getAgencyData: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) =>
            options && 'count' in options ? `${key} (${options.count})` : key,
        i18n: { language: 'de' },
    }),
}));

vi.mock('../../../../../api/tenant/legalProposals', async () => {
    const actual = await vi.importActual<typeof import('../../../../../api/tenant/legalProposals')>(
        '../../../../../api/tenant/legalProposals',
    );
    return {
        ...actual,
        distributeAgencyLegalProposal: mocks.distributeAgency,
        distributeTenantLegalProposal: mocks.distributeTenant,
        newDistributionRequestKey: () => 'request-key-1',
    };
});
vi.mock('../../../../../api/agency/getAgencyData', () => ({ default: mocks.getAgencyData }));
vi.mock('../../../../../api/tenant/searchTenantData', () => ({ searchTenantData: vi.fn() }));
vi.mock('antd', async () => {
    const antd = await vi.importActual<typeof import('antd')>('antd');
    return { ...antd, notification: { ...antd.notification, success: mocks.success, error: mocks.error } };
});

const agencies = [
    { id: 101, name: 'Beratungsstelle Nordlicht Mitte' },
    { id: 102, name: 'Beratungsstelle Nordlicht Süd' },
];

const renderDialog = () => {
    const onClose = vi.fn();
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <SendLegalTemplateDialog
                level="agencies"
                kind="PRIVACY"
                draftRevision="12:3"
                draftSavedAt="2026-09-25T12:00:00"
                onClose={onClose}
            />
        </QueryClientProvider>,
    );
    return { onClose };
};

describe('SendLegalTemplateDialog — Träger forwards to its Beratungsstellen (#1070)', () => {
    beforeEach(() => {
        Object.values(mocks).forEach((mock) => mock.mockReset());
        mocks.getAgencyData.mockResolvedValue({ data: agencies, total: agencies.length });
    });

    it('forwards the saved draft to all Beratungsstellen and reports how many received it', async () => {
        mocks.distributeAgency.mockResolvedValue({ requestKey: 'request-key-1', recipientAgencyIds: [101, 102] });
        const { onClose } = renderDialog();
        expect(screen.getByText('legal.template.send.agencies.title.privacy')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'legal.template.send.agencies.confirm' }));
        await waitFor(() =>
            expect(mocks.distributeAgency).toHaveBeenCalledWith({
                requestKey: 'request-key-1',
                kind: 'PRIVACY',
                sourceRevision: '12:3',
                audience: 'ALL',
            }),
        );
        expect(mocks.success).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'legal.template.send.agencies.sent (2)' }),
        );
        expect(onClose).toHaveBeenCalled();
        expect(mocks.distributeTenant).not.toHaveBeenCalled();
    });

    it('forwards to selected Beratungsstellen only', async () => {
        mocks.distributeAgency.mockResolvedValue({ requestKey: 'request-key-1', recipientAgencyIds: [102] });
        renderDialog();
        await userEvent.click(screen.getByLabelText('legal.template.send.agencies.audience.selected'));
        const confirm = screen.getByRole('button', { name: 'legal.template.send.agencies.confirm' });
        expect(confirm).toBeDisabled();
        await userEvent.click(await screen.findByText('Beratungsstelle Nordlicht Süd'));
        await waitFor(() => expect(confirm).toBeEnabled());
        await userEvent.click(confirm);
        await waitFor(() =>
            expect(mocks.distributeAgency).toHaveBeenCalledWith(
                expect.objectContaining({ audience: 'SELECTED', agencyIds: [102] }),
            ),
        );
        expect(mocks.success).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'legal.template.send.agencies.sent (1)' }),
        );
    });

    it('says so when the Träger has no Beratungsstelle yet (400) and keeps the dialog open', async () => {
        mocks.distributeAgency.mockRejectedValue(new Error('BAD_REQUEST'));
        const { onClose } = renderDialog();
        await userEvent.click(screen.getByRole('button', { name: 'legal.template.send.agencies.confirm' }));
        await waitFor(() =>
            expect(mocks.error).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'legal.template.send.agencies.noAgencies' }),
            ),
        );
        expect(onClose).not.toHaveBeenCalled();
    });

    it('a stale draft revision (409) asks for a reload instead of forwarding another text', async () => {
        mocks.distributeAgency.mockRejectedValue(new Error('CONFLICT'));
        renderDialog();
        await userEvent.click(screen.getByRole('button', { name: 'legal.template.send.agencies.confirm' }));
        await waitFor(() =>
            expect(mocks.error).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'legal.template.send.conflict' }),
            ),
        );
    });
});
