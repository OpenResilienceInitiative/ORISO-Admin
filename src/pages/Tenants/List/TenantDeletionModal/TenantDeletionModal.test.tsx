import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vite-plus/test';
import { getTenantDeletionPreview } from '../../../../api/tenant/tenantDeletionBlockers';
import { TenantDeletionModal } from '.';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) =>
            options && 'count' in options ? `${key}:${options.count}` : key,
    }),
}));
vi.mock('../../../../api/tenant/tenantDeletionBlockers', () => ({
    getTenantDeletionPreview: vi.fn(),
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

const renderModal = (onConfirm = vi.fn(), onClose = vi.fn()) => {
    render(<TenantDeletionModal tenant={tenant} onConfirm={onConfirm} onClose={onClose} />);
    return { onConfirm, onClose };
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
    });

    it('offers no deletion while the preview is missing', async () => {
        (getTenantDeletionPreview as Mock).mockRejectedValue(new Error('CATCH_ALL_SILENT'));

        const { onConfirm } = renderModal();

        expect(await screen.findByRole('alert')).toHaveTextContent('tenants.delete.previewFailed');
        expect(confirmButton()).toBeDisabled();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('runs the deletion of the chosen Träger once the preview is shown', async () => {
        const { onConfirm } = renderModal();
        await screen.findByTestId('tenant-delete-preview');

        fireEvent.click(confirmButton());

        expect(onConfirm).toHaveBeenCalledWith(21);
    });
});
