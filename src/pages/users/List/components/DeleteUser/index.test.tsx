import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { X_REASON } from '../../../../../api/fetchData';
import { DeleteUserModal } from './index';
import { AccountOperationIntent, settleAccountOperation } from '../../../../../utils/accountOperationIntent';
import { recordAccountOperationResponse } from '../../../../../utils/accountOperationState';

const deleteMutation = vi.fn();
const currentUser = { userId: 'signed-in-admin', scopedAccountCommands: false as boolean | null };

vi.mock('../../../../../hooks/useUserData.hook', () => ({
    useUserData: () => ({ data: currentUser }),
}));

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
        currentUser.scopedAccountCommands = false;
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

    it('explains that removing an administrator keeps the consultant account and requires separate deletion', () => {
        render(
            <DeleteUserModal typeOfUser="admins" deleteUserId="combined-admin" hasOtherIdentity onClose={vi.fn()} />,
        );

        expect(screen.getByText('identityRemoval.remaining.consultant')).toBeVisible();
        expect(screen.queryByText('identityRemoval.remaining.administrator')).not.toBeInTheDocument();
    });

    it('explains that removing a consultant keeps their administrator account', () => {
        render(
            <DeleteUserModal
                typeOfUser="consultants"
                deleteUserId="combined-consultant"
                hasOtherIdentity
                onClose={vi.fn()}
            />,
        );

        expect(screen.getByText('identityRemoval.remaining.administrator')).toBeVisible();
        expect(screen.queryByText('identityRemoval.remaining.consultant')).not.toBeInTheDocument();
    });

    it('does not invent a remaining account for a known single identity', () => {
        render(
            <DeleteUserModal
                typeOfUser="consultants"
                deleteUserId="single-consultant"
                hasOtherIdentity={false}
                onClose={vi.fn()}
            />,
        );

        expect(screen.queryByText(/identityRemoval\.(remaining|possibleRemaining)/)).not.toBeInTheDocument();
    });

    it('uses conditional wording when the server did not provide the other-identity flag', () => {
        render(<DeleteUserModal typeOfUser="admins" deleteUserId="unknown-admin" onClose={vi.fn()} />);

        expect(screen.getByText('identityRemoval.possibleRemaining.consultant')).toBeVisible();
        expect(screen.queryByText('identityRemoval.remaining.consultant')).not.toBeInTheDocument();
    });

    it('requires another administrator to remove the signed-in administrator identity', async () => {
        currentUser.scopedAccountCommands = true;
        render(<DeleteUserModal typeOfUser="admins" deleteUserId={currentUser.userId} onClose={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'delete' })).toBeDisabled();
        expect(screen.getByText('identityRemoval.selfAdministrator')).toBeVisible();
        await userEvent.click(screen.getByRole('button', { name: 'delete' }));
        expect(deleteMutation).not.toHaveBeenCalled();
    });

    it('waits for a confirmed server mode before enabling deletion', () => {
        currentUser.scopedAccountCommands = null;
        render(<DeleteUserModal typeOfUser="consultants" deleteUserId="consultant" onClose={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'delete' })).toBeDisabled();
        expect(screen.getByText('identityRemoval.checkingAvailability')).toBeVisible();
    });

    it('does not promise preservation for a combined identity on the legacy server', () => {
        render(<DeleteUserModal typeOfUser="consultants" deleteUserId="combined" hasOtherIdentity onClose={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'delete' })).toBeDisabled();
        expect(screen.getByText('identityRemoval.unavailable')).toBeVisible();
    });

    it('does not offer a different force request after an unproven scoped refusal', async () => {
        currentUser.scopedAccountCommands = true;
        render(<DeleteUserModal typeOfUser="consultants" deleteUserId="consultant" onClose={vi.fn()} />);
        await userEvent.click(screen.getByRole('button', { name: 'delete' }));
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'delete' })).toBeEnabled();
        expect(screen.getByText('accountOperation.outcomeUnknown')).toBeVisible();
    });

    it('explains a blocked retry instead of silently switching command mode', async () => {
        deleteMutation.mockImplementation((_variables, options) =>
            options.onError(new Error('ACCOUNT_COMMANDS_UNAVAILABLE')),
        );
        render(
            <DeleteUserModal
                typeOfUser="consultants"
                deleteUserId="consultant"
                hasOtherIdentity={false}
                onClose={vi.fn()}
            />,
        );
        await userEvent.click(screen.getByRole('button', { name: 'delete' }));
        expect(screen.getByRole('alert')).toHaveTextContent('identityRemoval.retryUnavailable');
    });

    it('keeps a scoped refusal unknown even if current metadata has switched to legacy', async () => {
        const response = new Response(JSON.stringify({ reason: X_REASON.CONSULTANT_HAS_ACTIVE_OR_ARCHIVE_SESSIONS }), {
            status: 400,
        });
        recordAccountOperationResponse(response, response);
        await expect(settleAccountOperation(new AccountOperationIntent(), Promise.reject(response))).rejects.toBe(
            response,
        );
        deleteMutation.mockImplementation((_variables, options) => options.onError(response));
        render(
            <DeleteUserModal
                typeOfUser="consultants"
                deleteUserId="consultant"
                hasOtherIdentity={false}
                onClose={vi.fn()}
            />,
        );
        await userEvent.click(screen.getByRole('button', { name: 'delete' }));
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent('accountOperation.outcomeUnknown');
    });
});
