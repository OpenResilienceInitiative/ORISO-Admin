import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vite-plus/test';
import { deleteAgency, getAgencyDeletionPreview } from '../../../../api/agency/agencyDeletion';
import { AgencyData } from '../../../../types/agency';
import { AgencyDeletionModal } from '.';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) =>
            options && 'count' in options ? `${key}:${options.count}` : key,
    }),
}));
vi.mock('../../../../api/agency/agencyDeletion', () => ({
    getAgencyDeletionPreview: vi.fn(),
    deleteAgency: vi.fn(),
}));

const agency = { id: '7', name: 'Beratungsstelle Nord' } as AgencyData;

const preview = {
    adviceSeekers: 2,
    keptAdviceSeekerSessions: 1,
    openEnquiries: 0,
    consultantsDeleted: 1,
    consultantsUnassigned: 3,
    agencyAdmins: 0,
    groupChats: 1,
};

const confirmButton = () => screen.getByRole('button', { name: 'agency.modal.btn.ok.uppercase' });

describe('AgencyDeletionModal', () => {
    beforeEach(() => {
        (getAgencyDeletionPreview as Mock).mockResolvedValue(preview);
    });
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('lists what goes with the counselling centre before anything is deleted', async () => {
        render(<AgencyDeletionModal agencyModel={agency} onClose={vi.fn()} />);

        const list = await screen.findByTestId('agency-delete-preview');
        expect(list.textContent).toContain('agency.delete.preview.consultantsDeleted:1');
        expect(list.textContent).toContain('agency.delete.preview.consultantsUnassigned:3');
        expect(list.textContent).toContain('agency.delete.preview.adviceSeekers:2');
        expect(list.textContent).toContain('agency.delete.preview.groupChats:1');
        expect(list.textContent).toContain('agency.delete.preview.invites');
        // A count of 0 is left out.
        expect(list.textContent).not.toContain('openEnquiries');
        expect(list.textContent).not.toContain('agencyAdmins');
        expect(getAgencyDeletionPreview).toHaveBeenCalledWith('7');
        expect(deleteAgency).not.toHaveBeenCalled();
    });

    it('offers no deletion while the preview is missing', async () => {
        (getAgencyDeletionPreview as Mock).mockRejectedValue(new Error('CATCH_ALL_SILENT'));

        render(<AgencyDeletionModal agencyModel={agency} onClose={vi.fn()} />);

        expect(await screen.findByRole('alert')).toHaveTextContent('agency.delete.previewFailed');
        expect(confirmButton()).toBeDisabled();
    });

    it('shows what could not be handled after deleting', async () => {
        (deleteAgency as Mock).mockResolvedValue({
            result: 'deleted',
            details: {
                ...preview,
                complete: false,
                invites: 2,
                failures: [{ kind: 'CONSULTANT', id: 'c-1', reason: 'IllegalStateException' }],
            },
        });

        render(<AgencyDeletionModal agencyModel={agency} onClose={vi.fn()} />);
        await screen.findByTestId('agency-delete-preview');
        fireEvent.click(confirmButton());

        const failures = await screen.findByTestId('agency-delete-failures');
        expect(failures.textContent).toContain('agency.delete.failureKind.CONSULTANT');
        expect(failures.textContent).toContain('c-1');
        expect(screen.getByRole('status')).toHaveTextContent('agency.delete.outcome.incomplete');
        expect(screen.getByText('agency.delete.retryHint')).toBeInTheDocument();
        expect(deleteAgency).toHaveBeenCalledWith('7');
    });

    it('says the rest is finished by deleting again when UserService was down', async () => {
        (deleteAgency as Mock).mockResolvedValue({ result: 'markedOnly' });
        const onClose = vi.fn();

        render(<AgencyDeletionModal agencyModel={agency} onClose={onClose} />);
        await screen.findByTestId('agency-delete-preview');
        fireEvent.click(confirmButton());

        expect(await screen.findByRole('alert')).toHaveTextContent('agency.delete.outcome.markedOnly');
        fireEvent.click(screen.getByRole('button', { name: 'agency.delete.close' }));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });
});
