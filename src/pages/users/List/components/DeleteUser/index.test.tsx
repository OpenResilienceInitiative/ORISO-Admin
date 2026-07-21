import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { X_REASON } from '../../../../../api/fetchData';
import { DeleteUserModal } from './index';

const deleteMutation = vi.fn();

vi.mock('../../../../../hooks/useDeleteConsultantOrAdmin', () => ({
    useDeleteConsultantOrAgencyAdmin: (options: { onError: (error: Error | Response) => void }) => ({
        mutate: (variables: unknown) => deleteMutation(variables, options),
    }),
}));

vi.mock('../../../../../components/Modal', () => ({
    Modal: ({
        children,
        okLabelKey,
        confirmDisabled,
        onConfirm,
    }: {
        children: ReactNode;
        okLabelKey?: string;
        confirmDisabled?: boolean;
        onConfirm: () => void;
    }) => (
        <section>
            {children}
            {okLabelKey && (
                <button type="button" disabled={confirmDisabled} onClick={onConfirm}>
                    {okLabelKey}
                </button>
            )}
        </section>
    ),
}));

vi.mock('../../../../../components/text/Text', () => ({
    Text: ({ text }: { text: string }) => <span>{text}</span>,
}));

describe('DeleteUserModal', () => {
    beforeEach(() => {
        deleteMutation.mockReset();
        deleteMutation.mockImplementation((_variables, options) => {
            options.onError(
                new Response(JSON.stringify({ reason: X_REASON.CONSULTANT_HAS_ACTIVE_OR_ARCHIVE_SESSIONS }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }),
            );
        });
    });

    it('offers an explicit force delete when CORS hides X-Reason but the JSON body reports active sessions', async () => {
        const user = userEvent.setup();

        render(<DeleteUserModal typeOfUser="consultants" deleteUserId="consultant-1" onClose={vi.fn()} />);

        await user.click(screen.getByRole('button', { name: 'delete' }));

        expect(screen.getByText('counselor.modal.text.delete.error.hasSessions')).toBeVisible();
        const forceDelete = screen.getByRole('button', { name: 'forceDelete' });
        expect(forceDelete).toBeDisabled();

        await user.click(screen.getByRole('checkbox'));
        expect(forceDelete).toBeEnabled();
    });
});
