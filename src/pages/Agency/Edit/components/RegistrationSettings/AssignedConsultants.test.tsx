import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notification } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    consultants: vi.fn(),
    unassign: vi.fn(),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) => (options?.name ? `${key}:${options.name}` : key),
    }),
}));
vi.mock('../../../../../hooks/useAgencyConsultants', () => ({
    AGENCY_CONSULTANTS_KEY: 'AGENCY_CONSULTANTS',
    useAgencyConsultants: () => h.consultants(),
}));
vi.mock('../../../../../api/agency/unassignAgencyFromConsultant', () => ({
    unassignAgencyFromConsultant: h.unassign,
}));

// eslint-disable-next-line import/first
import { AssignedConsultants } from './AssignedConsultants';

const ERIKA = { id: 'c-1', firstname: 'Erika', lastname: 'Muster', email: 'erika@example.org' };
const MAX = { id: 'c-2', firstname: 'Max', lastname: 'Admin', email: 'max@example.org' };

const renderCard = (editing = true) =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <AssignedConsultants agencyId="55" editing={editing} />
        </QueryClientProvider>,
    );

describe('AssignedConsultants (#1069)', () => {
    beforeEach(() => {
        h.consultants.mockReturnValue({ data: [ERIKA, MAX], isLoading: false, isError: false });
        h.unassign.mockReset();
        h.unassign.mockResolvedValue(undefined);
        vi.restoreAllMocks();
    });

    it('lists the counsellors already assigned, including admins who also counsel', () => {
        renderCard();

        const list = screen.getByRole('list', { name: 'agency.form.registrationSettings.assigned.title' });
        expect(within(list).getByText('Erika Muster')).toBeInTheDocument();
        expect(within(list).getByText('Max Admin')).toBeInTheDocument();
    });

    it('says so when nobody is assigned yet', () => {
        h.consultants.mockReturnValue({ data: [], isLoading: false, isError: false });
        renderCard();

        expect(screen.getByText('agency.form.registrationSettings.assigned.empty')).toBeInTheDocument();
    });

    it('shows the remove action disabled outside edit mode (disable, not hide)', () => {
        renderCard(false);

        expect(
            screen.getByRole('button', { name: 'agency.form.registrationSettings.assigned.remove:Erika Muster' }),
        ).toBeDisabled();
    });

    it('removes a counsellor from this agency after a confirmation', async () => {
        const success = vi.spyOn(notification, 'success');
        renderCard();

        await userEvent.click(
            screen.getByRole('button', { name: 'agency.form.registrationSettings.assigned.remove:Erika Muster' }),
        );
        expect(h.unassign).not.toHaveBeenCalled();
        await userEvent.click(
            await screen.findByRole('button', {
                name: 'agency.form.registrationSettings.assigned.removeConfirm.confirm',
            }),
        );

        await waitFor(() => expect(h.unassign).toHaveBeenCalledWith('55', 'c-1'));
        await waitFor(() => expect(success).toHaveBeenCalled());
    });

    it('explains why the last counsellor of a visible agency cannot be removed', async () => {
        const error = vi.spyOn(notification, 'error');
        h.unassign.mockRejectedValue(
            new Response(null, {
                status: 409,
                headers: { 'X-Reason': 'CONSULTANT_IS_THE_LAST_OF_AGENCY_AND_AGENCY_IS_STILL_ACTIVE' },
            }),
        );
        renderCard();

        await userEvent.click(
            screen.getByRole('button', { name: 'agency.form.registrationSettings.assigned.remove:Erika Muster' }),
        );
        await userEvent.click(
            await screen.findByRole('button', {
                name: 'agency.form.registrationSettings.assigned.removeConfirm.confirm',
            }),
        );

        await waitFor(() =>
            expect(error).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'agency.form.registrationSettings.assigned.removeLast' }),
            ),
        );
    });
});
