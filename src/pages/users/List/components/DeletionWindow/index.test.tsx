import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeletionWindowModal } from './index';

const mutations = vi.hoisted(() => ({
    cancel: vi.fn(),
    pause: vi.fn(),
    toast: vi.fn(),
    pending: false,
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('antd', async (original) => ({
    ...(await original<typeof import('antd')>()),
    message: { success: mutations.toast, error: mutations.toast },
}));

type Callbacks = { onSuccess: () => void; onError: (e: unknown) => void };
vi.mock('../../../../../hooks/useConsultantDeletionWindow', () => ({
    useCancelConsultantDeletion: () => ({
        mutate: (id: string, callbacks: Callbacks) => mutations.cancel(id, callbacks),
        isPending: mutations.pending,
    }),
    usePauseConsultantDeletion: () => ({
        mutate: (variables: unknown, callbacks: Callbacks) => mutations.pause(variables, callbacks),
        isPending: mutations.pending,
    }),
}));

vi.mock('../../../../../components/Modal', () => ({
    Modal: ({
        children,
        okLabelKey,
        confirmDisabled,
        confirmLoading,
        onConfirm,
        titleKey,
    }: {
        children: ReactNode;
        okLabelKey?: string;
        confirmDisabled?: boolean;
        confirmLoading?: boolean;
        onConfirm: () => void;
        titleKey?: string;
    }) => (
        <section aria-label={titleKey}>
            {children}
            <button type="button" disabled={confirmDisabled || confirmLoading} onClick={onConfirm}>
                {okLabelKey}
            </button>
        </section>
    ),
}));

describe('DeletionWindowModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mutations.pending = false;
    });

    describe('cancel', () => {
        it('cancels the deletion of the chosen consultant and closes on success', async () => {
            const onClose = vi.fn();
            mutations.cancel.mockImplementation((_id, callbacks) => callbacks.onSuccess());
            render(<DeletionWindowModal mode="cancel" consultantId="c-1" onClose={onClose} />);

            await userEvent.click(screen.getByRole('button', { name: 'deletionWindow.cancel.confirm' }));

            expect(mutations.cancel).toHaveBeenCalledWith('c-1', expect.anything());
            expect(onClose).toHaveBeenCalled();
            expect(mutations.toast).toHaveBeenCalledWith(
                expect.objectContaining({ content: 'deletionWindow.cancel.success' }),
            );
        });

        it('sends exactly one request for a double click, even before the pending state renders', () => {
            mutations.cancel.mockImplementation(() => undefined); // request stays in flight
            render(<DeletionWindowModal mode="cancel" consultantId="c-1" onClose={vi.fn()} />);
            const confirm = screen.getByRole('button', { name: 'deletionWindow.cancel.confirm' });

            fireEvent.click(confirm);
            fireEvent.click(confirm);

            expect(mutations.cancel).toHaveBeenCalledTimes(1);
        });

        it('allows a retry after a failed request', () => {
            mutations.cancel.mockImplementation((_id, callbacks) => callbacks.onError(new Error('x')));
            render(<DeletionWindowModal mode="cancel" consultantId="c-1" onClose={vi.fn()} />);
            const confirm = screen.getByRole('button', { name: 'deletionWindow.cancel.confirm' });

            fireEvent.click(confirm);
            fireEvent.click(confirm);

            expect(mutations.cancel).toHaveBeenCalledTimes(2);
        });

        it('disables the confirm button while the request is pending', () => {
            mutations.pending = true;
            render(<DeletionWindowModal mode="cancel" consultantId="c-1" onClose={vi.fn()} />);

            expect(screen.getByRole('button', { name: 'deletionWindow.cancel.confirm' })).toBeDisabled();
        });

        it('tells the admin what a cancel does not bring back', () => {
            render(<DeletionWindowModal mode="cancel" consultantId="c-1" onClose={vi.fn()} />);

            expect(screen.getByText('deletionWindow.cancel.notRestored')).toBeVisible();
        });

        it.each([
            [409, 'deletionWindow.error.tooLate'],
            [400, 'deletionWindow.error.invalid'],
        ])('shows a translated message for HTTP %s and never the raw server text', async (status, key) => {
            mutations.cancel.mockImplementation((_id, callbacks) =>
                callbacks.onError(new Response(JSON.stringify({ message: 'RAW SERVER TEXT' }), { status })),
            );
            const onClose = vi.fn();
            render(<DeletionWindowModal mode="cancel" consultantId="c-1" onClose={onClose} />);

            await userEvent.click(screen.getByRole('button', { name: 'deletionWindow.cancel.confirm' }));

            await vi.waitFor(() =>
                expect(mutations.toast).toHaveBeenCalledWith(expect.objectContaining({ content: key })),
            );
            expect(JSON.stringify(mutations.toast.mock.calls)).not.toContain('RAW SERVER TEXT');
            expect(onClose).not.toHaveBeenCalled();
        });

        it('says "no access" for a refused request, not a generic failure', async () => {
            mutations.cancel.mockImplementation((_id, callbacks) => callbacks.onError(new Error('FORBIDDEN')));
            render(<DeletionWindowModal mode="cancel" consultantId="c-1" onClose={vi.fn()} />);

            await userEvent.click(screen.getByRole('button', { name: 'deletionWindow.cancel.confirm' }));

            await vi.waitFor(() =>
                expect(mutations.toast).toHaveBeenCalledWith(
                    expect.objectContaining({ content: 'deletionWindow.error.forbidden' }),
                ),
            );
        });
    });

    describe('pause', () => {
        it('cannot be confirmed without a reason', async () => {
            render(<DeletionWindowModal mode="pause" consultantId="c-1" onClose={vi.fn()} />);

            expect(screen.getByRole('button', { name: 'deletionWindow.pause.confirm' })).toBeDisabled();

            await userEvent.type(screen.getByRole('textbox'), '   ');
            expect(screen.getByRole('button', { name: 'deletionWindow.pause.confirm' })).toBeDisabled();
        });

        it('sends the reason and the chosen number of months (default 3)', async () => {
            mutations.pause.mockImplementation((_variables, callbacks) => callbacks.onSuccess());
            const onClose = vi.fn();
            render(<DeletionWindowModal mode="pause" consultantId="c-1" onClose={onClose} />);

            await userEvent.type(screen.getByRole('textbox'), 'Legal hold');
            await userEvent.click(screen.getByRole('button', { name: 'deletionWindow.pause.confirm' }));

            expect(mutations.pause).toHaveBeenCalledWith(
                { id: 'c-1', reason: 'Legal hold', months: 3 },
                expect.anything(),
            );
            expect(onClose).toHaveBeenCalled();
        });

        it('sends exactly one pause request for a double click', async () => {
            mutations.pause.mockImplementation(() => undefined);
            render(<DeletionWindowModal mode="pause" consultantId="c-1" onClose={vi.fn()} />);
            await userEvent.type(screen.getByRole('textbox'), 'Legal hold');
            const confirm = screen.getByRole('button', { name: 'deletionWindow.pause.confirm' });

            fireEvent.click(confirm);
            fireEvent.click(confirm);

            expect(mutations.pause).toHaveBeenCalledTimes(1);
        });

        it('offers 1 to 12 months, the range the service accepts', () => {
            render(<DeletionWindowModal mode="pause" consultantId="c-1" onClose={vi.fn()} />);

            const options = screen.getAllByRole('option');
            expect(options).toHaveLength(12);
            expect(options[0]).toHaveValue('1');
            expect(options[11]).toHaveValue('12');
        });
    });
});
