import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vite-plus/test';
import { deleteTenant, getTenantDeletionPreview } from '../../../../api/tenant/tenantDeletion';
import { TenantDeletionModal } from '.';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) =>
            options && 'count' in options ? `${key}:${options.count}` : key,
    }),
}));
vi.mock('../../../../api/tenant/tenantDeletion', () => ({
    getTenantDeletionPreview: vi.fn(),
    deleteTenant: vi.fn(),
}));

const tenant = { id: 21, name: 'Caritas Nord' };
const preview = {
    agencies: 3,
    consultants: 7,
    adviceSeekers: 40,
    agencyAdmins: 0,
    tenantAdmins: 1,
    openInvites: 0,
};

const renderModal = (onClose = vi.fn()) => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    render(
        <QueryClientProvider client={client}>
            <TenantDeletionModal tenant={tenant} onClose={onClose} />
        </QueryClientProvider>,
    );
    return { invalidate, onClose };
};

const confirmButton = () => screen.getByRole('button', { name: 'tenants.list.deleteModal.confirm' });

describe('TenantDeletionModal', () => {
    beforeEach(() => {
        (getTenantDeletionPreview as Mock).mockResolvedValue(preview);
    });
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('lists what goes with the Träger before anything is deleted', async () => {
        renderModal();

        const list = await screen.findByTestId('tenant-delete-preview');
        expect(list.textContent).toContain('tenants.delete.preview.agencies:3');
        expect(list.textContent).toContain('tenants.delete.preview.consultants:7');
        expect(list.textContent).toContain('tenants.delete.preview.adviceSeekers:40');
        expect(list.textContent).toContain('tenants.delete.preview.tenantAdmins:1');
        expect(list.textContent).toContain('tenants.delete.preview.everything');
        expect(list.textContent).not.toContain('agencyAdmins');
        expect(list.textContent).not.toContain('openInvites');
        expect(getTenantDeletionPreview).toHaveBeenCalledWith(21);
        expect(deleteTenant).not.toHaveBeenCalled();
    });

    it('offers no deletion while the preview is missing', async () => {
        (getTenantDeletionPreview as Mock).mockRejectedValue(new Error('CATCH_ALL_SILENT'));

        renderModal();

        expect(await screen.findByRole('alert')).toHaveTextContent('tenants.delete.previewFailed');
        expect(confirmButton()).toBeDisabled();
    });

    it('shows what could not be handled and refreshes the list on closing', async () => {
        (deleteTenant as Mock).mockResolvedValue({
            result: 'deleted',
            details: {
                complete: false,
                invites: 2,
                consultants: 6,
                adviceSeekers: 40,
                agencyAdmins: 0,
                tenantAdmins: 1,
                agencies: 3,
                failures: [{ kind: 'CONSULTANT', id: 'c-9', reason: 'IllegalStateException' }],
            },
        });
        const { invalidate, onClose } = renderModal();
        await screen.findByTestId('tenant-delete-preview');

        fireEvent.click(confirmButton());

        const failures = await screen.findByTestId('tenant-delete-failures');
        expect(failures.textContent).toContain('tenants.delete.failureKind.CONSULTANT');
        expect(failures.textContent).toContain('c-9');
        expect(screen.getByRole('status')).toHaveTextContent('tenants.delete.outcome.incomplete');
        fireEvent.click(screen.getByRole('button', { name: 'tenants.delete.close' }));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(invalidate).toHaveBeenCalled();
        expect(deleteTenant).toHaveBeenCalledWith(21);
    });

    it('explains that the main Träger cannot be deleted', async () => {
        (deleteTenant as Mock).mockResolvedValue({ result: 'mainTenant' });
        renderModal();
        await screen.findByTestId('tenant-delete-preview');

        fireEvent.click(confirmButton());

        expect(await screen.findByRole('alert')).toHaveTextContent('tenants.delete.outcome.mainTenant');
    });
});
