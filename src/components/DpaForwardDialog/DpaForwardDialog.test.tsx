import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DpaForwardDialog } from './DpaForwardDialog';
import { DpaForwardError, DpaForwardLink, DpaForwardOutcome } from '../../api/tenantOnboarding/dpaForward';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'de' },
    }),
}));

const LINK: DpaForwardLink = {
    signUrl: 'https://app.example.org/dpa-sign/token-1',
    expiresAt: '2026-08-29T14:31:07',
};

const ok = (link: DpaForwardLink = LINK, mailFailed = false): DpaForwardOutcome => ({ link, mailFailed });

const renderDialog = (overrides: Partial<Parameters<typeof DpaForwardDialog>[0]> = {}) => {
    const props = {
        forward: vi.fn().mockResolvedValue(ok()),
        onClose: vi.fn(),
        onForwarded: vi.fn(),
        ...overrides,
    };
    render(<DpaForwardDialog {...props} />);
    return props;
};

describe('DpaForwardDialog', () => {
    it('mints a link-only forward on open and shows it copyable with the validity note', async () => {
        const { forward } = renderDialog();

        // No recipient on open — opening the dialog must not send a mail.
        expect(forward).toHaveBeenCalledWith({});
        await waitFor(() => expect(screen.getByLabelText('dpaForward.dialog.linkLabel')).toHaveValue(LINK.signUrl));
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
        await expect(navigator.clipboard.readText()).resolves.toBe(LINK.signUrl);
    });

    it('keeps confirm disabled until the link exists and reports it with onForwarded', async () => {
        const user = userEvent.setup();
        let resolveLink: (outcome: DpaForwardOutcome) => void = () => {};
        const { onForwarded } = renderDialog({
            forward: vi.fn().mockReturnValue(
                new Promise<DpaForwardOutcome>((resolve) => {
                    resolveLink = resolve;
                }),
            ),
        });

        const confirm = screen.getByRole('button', { name: 'dpaForward.dialog.confirm' });
        expect(confirm).toBeDisabled();

        resolveLink(ok());
        await waitFor(() => expect(confirm).toBeEnabled());
        await user.click(confirm);

        expect(onForwarded).toHaveBeenCalledWith({ link: LINK, recipientEmail: null, mailFailed: false });
    });

    it('renders a retryable error when the link cannot be created', async () => {
        const forward = vi.fn().mockRejectedValueOnce(new DpaForwardError('TECHNICAL')).mockResolvedValueOnce(ok());
        const user = userEvent.setup();
        renderDialog({ forward });

        await screen.findByTestId('dpa-forward-link-error');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.linkRetry' }));

        await waitFor(() => expect(screen.getByLabelText('dpaForward.dialog.linkLabel')).toHaveValue(LINK.signUrl));
        expect(forward).toHaveBeenCalledTimes(2);
    });

    it('names the 409 case: the operator has published no agreement to forward', async () => {
        renderDialog({ forward: vi.fn().mockRejectedValue(new DpaForwardError('NO_DPA_PUBLISHED')) });

        const alert = await screen.findByTestId('dpa-forward-link-error');
        expect(alert).toHaveTextContent('dpaForward.dialog.errorNoDpaPublished');
    });

    it('refuses to send without a valid recipient address', async () => {
        const user = userEvent.setup();
        const { forward } = renderDialog();
        await screen.findByLabelText('dpaForward.dialog.linkLabel');
        forward.mockClear();

        await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'not-an-address');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));

        await screen.findByText('tenantOnboarding.validation.email');
        expect(forward).not.toHaveBeenCalled();
    });

    it('sends the mail with the recipient, shows the fresh link, then confirms with it', async () => {
        const user = userEvent.setup();
        const freshLink: DpaForwardLink = { signUrl: 'https://app.example.org/dpa-sign/token-2', expiresAt: null };
        const forward = vi.fn().mockResolvedValueOnce(ok()).mockResolvedValueOnce(ok(freshLink));
        const { onForwarded } = renderDialog({ forward });
        await screen.findByLabelText('dpaForward.dialog.linkLabel');

        await user.type(screen.getByLabelText('dpaForward.dialog.recipientName'), 'Dr. Ruth Recht');
        await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));

        await screen.findByTestId('dpa-forward-sent');
        expect(forward).toHaveBeenLastCalledWith({ recipientEmail: 'legal@example.org' });
        // The newest issued link is the one on offer to copy.
        await waitFor(() =>
            expect(screen.getByLabelText('dpaForward.dialog.linkLabel')).toHaveValue(freshLink.signUrl),
        );

        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.confirm' }));
        expect(onForwarded).toHaveBeenCalledWith({
            link: freshLink,
            recipientEmail: 'legal@example.org',
            mailFailed: false,
        });
    });

    it('502: shows the link with a mail-not-sent notice, never as a total failure', async () => {
        const user = userEvent.setup();
        const forward = vi.fn().mockResolvedValueOnce(ok()).mockResolvedValueOnce(ok(LINK, true));
        const { onForwarded } = renderDialog({ forward });
        await screen.findByLabelText('dpaForward.dialog.linkLabel');

        await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));

        await screen.findByTestId('dpa-forward-mail-failed');
        expect(screen.queryByTestId('dpa-forward-send-failed')).not.toBeInTheDocument();
        // The link stays copyable — that IS the fallback.
        expect(screen.getByLabelText('dpaForward.dialog.linkLabel')).toHaveValue(LINK.signUrl);

        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.confirm' }));
        expect(onForwarded).toHaveBeenCalledWith({ link: LINK, recipientEmail: null, mailFailed: true });
    });

    it('surfaces a send failure inline and stays open', async () => {
        const user = userEvent.setup();
        const forward = vi.fn().mockResolvedValueOnce(ok()).mockRejectedValueOnce(new DpaForwardError('TECHNICAL'));
        const { onClose } = renderDialog({ forward });
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
