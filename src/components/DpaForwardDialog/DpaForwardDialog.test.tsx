import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

/**
 * Layout contract (owner review 2026-08-18). jsdom has no layout engine, so the
 * rules that only a real engine can execute — the viewport bound and the
 * right-aligned action row — are asserted against the shipped stylesheet, and
 * everything a DOM can answer (source order, one shared field grid, the sheet
 * width antd actually applies, the button's emphasis) is asserted on the render.
 * Both halves are proven again in a real browser at 390/820/1440; see the PR.
 */
describe('DpaForwardDialog layout', () => {
    // Vitest serves modules over its own URL scheme, so `import.meta.url` is not a
    // file path here; the stylesheet is read from the project root instead.
    const stylesheet = readFileSync(join(process.cwd(), 'src/components/DpaForwardDialog/styles.module.scss'), 'utf8');

    /** The declarations of exactly one rule, so a match cannot leak in from a neighbour. */
    const ruleFor = (selector: string): string => {
        const start = stylesheet.indexOf(`${selector} {`);
        expect(start, `no \`${selector}\` rule in styles.module.scss`).toBeGreaterThan(-1);
        let depth = 0;
        for (let i = stylesheet.indexOf('{', start); i < stylesheet.length; i += 1) {
            if (stylesheet[i] === '{') depth += 1;
            if (stylesheet[i] === '}') {
                depth -= 1;
                if (depth === 0) return stylesheet.slice(start, i);
            }
        }
        throw new Error(`unbalanced braces after \`${selector}\``);
    };

    it('puts the sign-link block below the mail preview', async () => {
        renderDialog();
        await screen.findByLabelText('dpaForward.dialog.linkLabel');

        const preview = screen.getByRole('region', { name: 'dpaForward.dialog.previewLabel' });
        const linkBlock = screen.getByTestId('dpa-forward-link-section');

        // querySelectorAll answers in document order: the mail is the worked
        // example, the link is the alternative underneath it.
        const inOrder = Array.from(
            document.querySelectorAll(
                '[aria-label="dpaForward.dialog.previewLabel"], [data-testid="dpa-forward-link-section"]',
            ),
        );
        expect(inOrder).toEqual([preview, linkBlock]);
    });

    it('scrolls its content inside the sheet instead of growing past the viewport', async () => {
        renderDialog();
        await screen.findByLabelText('dpaForward.dialog.linkLabel');
        const content = screen.getByTestId('dpa-forward-dialog');

        // Everything tall lives in the scroller; the dialog's own actions never do,
        // so they cannot be pushed off a short screen.
        expect(content).toContainElement(screen.getByRole('region', { name: 'dpaForward.dialog.previewLabel' }));
        expect(content).toContainElement(screen.getByTestId('dpa-forward-link-section'));
        expect(content).not.toContainElement(screen.getByRole('button', { name: 'dpaForward.dialog.confirm' }));

        // The sheet is bounded against the viewport rather than against a guessed
        // chrome height, so the gutter survives a wrapping title on a 390px phone.
        expect(ruleFor('.ant-modal-content')).toMatch(/max-height:\s*calc\(100dvh - 48px\)/);
        const scroller = ruleFor('.ant-modal-body');
        expect(scroller).toMatch(/overflow-y:\s*auto/);
        expect(scroller).toMatch(/overscroll-behavior:\s*contain/);
    });

    it('opens at the wide desktop sheet width', async () => {
        renderDialog();
        await screen.findByLabelText('dpaForward.dialog.linkLabel');

        expect(document.querySelector<HTMLElement>('.ant-modal')?.style.width).toBe('880px');
    });

    it('lays name and e-mail out in one shared two-column field grid', async () => {
        renderDialog();
        const name = await screen.findByLabelText('dpaForward.dialog.recipientName');
        const email = screen.getByLabelText('dpaForward.dialog.recipientEmail');

        // FieldGrid is the house responsive raster: at most two tracks, and it
        // drops to one as soon as a track would fall below its width floor.
        const grid = name.closest<HTMLElement>('[style*="--field-grid-max-columns"]');
        expect(grid, 'recipient fields are not inside a FieldGrid').not.toBeNull();
        expect(grid?.style.getPropertyValue('--field-grid-max-columns')).toBe('2');
        expect(grid).toContainElement(email);
    });

    it('gives the send action filled emphasis on a right-aligned row', async () => {
        renderDialog();
        await screen.findByLabelText('dpaForward.dialog.linkLabel');
        const send = screen.getByRole('button', { name: 'dpaForward.dialog.send' });

        expect(send.className).toContain('filled');
        expect(send.className).not.toContain('outlined');
        expect(send.parentElement?.className).toContain('sendActions');
        expect(ruleFor('.sendActions')).toMatch(/justify-content:\s*flex-end/);
    });
});
