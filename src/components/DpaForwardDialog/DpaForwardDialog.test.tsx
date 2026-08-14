import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DpaForwardDialog, DpaForwardLink } from './DpaForwardDialog';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'de' },
    }),
}));

const LINK: DpaForwardLink = {
    signLink: 'https://app.example.org/dpa-sign/token-1',
    expiresAt: '2026-08-28T12:00:00Z',
};


const renderDialog = (overrides: Partial<Parameters<typeof DpaForwardDialog>[0]> = {}) => {
    const props = {
        ensureSignLink: vi.fn().mockResolvedValue(LINK),
        sendEmail: vi.fn().mockResolvedValue(undefined),
        onClose: vi.fn(),
        onForwarded: vi.fn(),
        ...overrides,
    };
    render(<DpaForwardDialog {...props} />);
    return props;
};

describe('DpaForwardDialog', () => {
    it('creates the sign link on open and shows it copyable with the validity note', async () => {
        const { ensureSignLink } = renderDialog();

        expect(ensureSignLink).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(screen.getByLabelText('dpaForward.dialog.linkLabel')).toHaveValue(LINK.signLink));
        expect(screen.getByLabelText('dpaForward.dialog.linkLabel')).toHaveAttribute('readonly');
        expect(screen.getByTestId('dpa-forward-validity-note')).toBeInTheDocument();
    });

    it('copies the link to the clipboard with success feedback', async () => {
        // userEvent installs a working clipboard stub in jsdom.
        const user = userEvent.setup();
        renderDialog();
        await screen.findByLabelText('dpaForward.dialog.linkLabel');

        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.copy' }));

        await screen.findByRole('button', { name: 'dpaForward.dialog.copied' });
        await expect(navigator.clipboard.readText()).resolves.toBe(LINK.signLink);
    });

    it('keeps confirm disabled until the link exists and reports the link with onForwarded', async () => {
        const user = userEvent.setup();
        let resolveLink: (link: DpaForwardLink) => void = () => {};
        const { onForwarded } = renderDialog({
            ensureSignLink: vi.fn().mockReturnValue(
                new Promise<DpaForwardLink>((resolve) => {
                    resolveLink = resolve;
                }),
            ),
        });

        const confirm = screen.getByRole('button', { name: 'dpaForward.dialog.confirm' });
        expect(confirm).toBeDisabled();

        resolveLink(LINK);
        await waitFor(() => expect(confirm).toBeEnabled());
        await user.click(confirm);

        expect(onForwarded).toHaveBeenCalledWith({ link: LINK, recipientEmail: null });
    });

    it('renders a retryable error when the link cannot be created', async () => {
        const ensureSignLink = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(LINK);
        const user = userEvent.setup();
        renderDialog({ ensureSignLink });

        await screen.findByTestId('dpa-forward-link-error');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.linkRetry' }));

        await waitFor(() => expect(screen.getByLabelText('dpaForward.dialog.linkLabel')).toHaveValue(LINK.signLink));
        expect(ensureSignLink).toHaveBeenCalledTimes(2);
    });

    it('refuses to send without a valid recipient address', async () => {
        const user = userEvent.setup();
        const { sendEmail } = renderDialog();
        await screen.findByLabelText('dpaForward.dialog.linkLabel');

        await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'not-an-address');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));

        await screen.findByText('tenantOnboarding.validation.email');
        expect(sendEmail).not.toHaveBeenCalled();
    });

    it('sends the mail with recipient, name and link, then confirms with the recipient', async () => {
        const user = userEvent.setup();
        const { sendEmail, onForwarded } = renderDialog();
        await screen.findByLabelText('dpaForward.dialog.linkLabel');

        await user.type(screen.getByLabelText('dpaForward.dialog.recipientName'), 'Dr. Ruth Recht');
        await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));

        await screen.findByTestId('dpa-forward-sent');
        expect(sendEmail).toHaveBeenCalledWith({
            recipientEmail: 'legal@example.org',
            recipientName: 'Dr. Ruth Recht',
            link: LINK,
        });

        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.confirm' }));
        expect(onForwarded).toHaveBeenCalledWith({ link: LINK, recipientEmail: 'legal@example.org' });
    });

    it('surfaces a send failure inline and stays open', async () => {
        const user = userEvent.setup();
        const { onClose } = renderDialog({ sendEmail: vi.fn().mockRejectedValue(new Error('boom')) });
        await screen.findByLabelText('dpaForward.dialog.linkLabel');

        await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));

        await screen.findByTestId('dpa-forward-send-failed');
        expect(onClose).not.toHaveBeenCalled();
    });

    it('closes without forwarding via cancel', async () => {
        const user = userEvent.setup();
        const { onClose, onForwarded } = renderDialog();
        await screen.findByLabelText('dpaForward.dialog.linkLabel');

        await user.click(screen.getByRole('button', { name: 'cancel' }));

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onForwarded).not.toHaveBeenCalled();
    });
});
