import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi, beforeEach } from 'vitest';
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

/**
 * The branded preview renderer is the ADMIN-ONLY endpoint
 * `POST /service/useradmin/invite-email-templates/preview`. It is mocked here so
 * the tests can assert *whether it is called at all* — on the public onboarding
 * wizard it must never be, because its 401 takes the anonymous visitor through
 * fetchData's logout handler and onto /admin/login (#712).
 */
const mocks = vi.hoisted(() => ({ previewInviteEmailTemplateContent: vi.fn() }));

vi.mock('../../api/accountInvites/accountInvites', () => ({
    previewInviteEmailTemplateContent: mocks.previewInviteEmailTemplateContent,
}));

/** Longer than EmailKitPreview's 300ms debounce, so "not called" means it. */
const PAST_PREVIEW_DEBOUNCE_MS = 400;
const settle = (ms = PAST_PREVIEW_DEBOUNCE_MS) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });

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

/** The explicit "I want the link" act that replaces the old mount-mint. */
const requestLink = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.linkCreate' }));
    return screen.findByLabelText('dpaForward.dialog.linkLabel');
};

beforeEach(() => {
    mocks.previewInviteEmailTemplateContent.mockReset();
    mocks.previewInviteEmailTemplateContent.mockResolvedValue({
        templateId: null,
        templateName: null,
        kind: 'DPA_FORWARD',
        language: 'de',
        subject: 'rendered subject',
        html: '<!doctype html><html><body>rendered mail</body></html>',
        plainText: 'rendered mail',
        sampleAcceptUrl: 'https://example.org/SAMPLE-PREVIEW-TOKEN',
    });
});

describe('DpaForwardDialog link minting', () => {
    /**
     * #712: only five links may be outstanding per onboarding (14-day TTL), so a
     * link minted by the mere act of opening the dialog burns the owner's quota
     * without a single mail being sent. Opening is not a forward.
     */
    it('mints nothing merely by opening the dialog', async () => {
        const { forward } = renderDialog();

        await screen.findByTestId('dpa-forward-link-section');
        await settle(50);
        expect(forward).not.toHaveBeenCalled();
        expect(screen.queryByLabelText('dpaForward.dialog.linkLabel')).not.toBeInTheDocument();
    });

    it('mints the link only once the admin asks for one', async () => {
        const user = userEvent.setup();
        const { forward } = renderDialog();

        await requestLink(user);

        // Link-only: asking for a shareable link must not send a mail.
        expect(forward).toHaveBeenCalledTimes(1);
        expect(forward).toHaveBeenCalledWith({});
        expect(screen.getByLabelText('dpaForward.dialog.linkLabel')).toHaveValue(LINK.signUrl);
        expect(screen.getByLabelText('dpaForward.dialog.linkLabel')).toHaveAttribute('readonly');
        expect(screen.getByTestId('dpa-forward-validity-note')).toBeInTheDocument();
    });

    it('sends the mail without first minting a separate link', async () => {
        const user = userEvent.setup();
        const { forward, onForwarded } = renderDialog();

        await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));

        await screen.findByTestId('dpa-forward-sent');
        // Exactly ONE link for one forward — the send is the minting act.
        expect(forward).toHaveBeenCalledTimes(1);
        expect(forward).toHaveBeenCalledWith({ recipientEmail: 'legal@example.org' });
        expect(screen.getByLabelText('dpaForward.dialog.linkLabel')).toHaveValue(LINK.signUrl);

        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.confirm' }));
        expect(onForwarded).toHaveBeenCalledWith({
            link: LINK,
            recipientEmail: 'legal@example.org',
            mailFailed: false,
        });
    });

    /**
     * #842: the name drives the previewed salutation, so it must reach the
     * backend with the send — a preview greeting "Dr. Ruth Recht" while the
     * mail greets neutrally would be a false promise.
     */
    it('sends the collected recipient name with the mail (#842)', async () => {
        const user = userEvent.setup();
        const { forward } = renderDialog();

        await user.type(screen.getByLabelText('dpaForward.dialog.recipientName'), '  Dr. Ruth Recht  ');
        await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));

        await screen.findByTestId('dpa-forward-sent');
        expect(forward).toHaveBeenCalledTimes(1);
        // Trimmed, because the salutation is typographic output.
        expect(forward).toHaveBeenCalledWith({ recipientEmail: 'legal@example.org', recipientName: 'Dr. Ruth Recht' });
    });

    it('sends no name field when none was typed, so the backend greets neutrally (#842)', async () => {
        const user = userEvent.setup();
        const { forward } = renderDialog();

        await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));

        await screen.findByTestId('dpa-forward-sent');
        // Absent, not empty-string: '' would ask the backend to greet nobody.
        expect(forward).toHaveBeenCalledWith({ recipientEmail: 'legal@example.org' });
    });

    it('copies the requested link to the clipboard with success feedback', async () => {
        // userEvent installs a working clipboard stub in jsdom.
        const user = userEvent.setup();
        renderDialog();
        await requestLink(user);

        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.copy' }));

        await screen.findByRole('button', { name: 'dpaForward.dialog.copied' });
        await expect(navigator.clipboard.readText()).resolves.toBe(LINK.signUrl);
    });

    it('keeps confirm disabled until a forward has actually happened', async () => {
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

        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.linkCreate' }));
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

        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.linkCreate' }));
        await screen.findByTestId('dpa-forward-link-error');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.linkRetry' }));

        await waitFor(() => expect(screen.getByLabelText('dpaForward.dialog.linkLabel')).toHaveValue(LINK.signUrl));
        expect(forward).toHaveBeenCalledTimes(2);
    });

    it('names the 409 case: the operator has published no agreement to forward', async () => {
        const user = userEvent.setup();
        renderDialog({ forward: vi.fn().mockRejectedValue(new DpaForwardError('NO_DPA_PUBLISHED')) });

        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.linkCreate' }));

        const alert = await screen.findByTestId('dpa-forward-link-error');
        expect(alert).toHaveTextContent('dpaForward.dialog.errorNoDpaPublished');
    });

    it('refuses to send without a valid recipient address', async () => {
        const user = userEvent.setup();
        const { forward } = renderDialog();

        await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'not-an-address');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));

        await screen.findByText('tenantOnboarding.validation.email');
        // A refused send mints nothing either.
        expect(forward).not.toHaveBeenCalled();
    });

    it('shows the fresh link the send issued, not the one that was copied before', async () => {
        const user = userEvent.setup();
        const freshLink: DpaForwardLink = { signUrl: 'https://app.example.org/dpa-sign/token-2', expiresAt: null };
        const forward = vi.fn().mockResolvedValueOnce(ok()).mockResolvedValueOnce(ok(freshLink));
        const { onForwarded } = renderDialog({ forward });
        await requestLink(user);

        await user.type(screen.getByLabelText('dpaForward.dialog.recipientName'), 'Dr. Ruth Recht');
        await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));

        await screen.findByTestId('dpa-forward-sent');
        // The typed name travels with the send (#842).
        expect(forward).toHaveBeenLastCalledWith({
            recipientEmail: 'legal@example.org',
            recipientName: 'Dr. Ruth Recht',
        });
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
        const forward = vi.fn().mockResolvedValueOnce(ok(LINK, true));
        const { onForwarded } = renderDialog({ forward });

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
        const forward = vi.fn().mockRejectedValueOnce(new DpaForwardError('TECHNICAL'));
        const { onClose } = renderDialog({ forward });

        await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));

        await screen.findByTestId('dpa-forward-send-failed');
        expect(onClose).not.toHaveBeenCalled();
    });

    /**
     * The owner's triple-send (2026-08-31): mail sent, "Weiterleitung
     * abschließen" overlooked, dialog closed — and the flow forgot the forward
     * ever happened, inviting a re-send. Three of those spent the whole
     * per-invite forward budget on one recipient. Once anything was minted,
     * every close gesture must pass the guard.
     */
    it('guards the close once a link was minted, and completing from the guard forwards', async () => {
        const user = userEvent.setup();
        const { onClose, onForwarded } = renderDialog();
        await requestLink(user);

        await user.click(screen.getByRole('button', { name: 'cancel' }));

        // Not closed — the guard asks first.
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByText('dpaForward.closeGuard.title')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'dpaForward.closeGuard.complete' }));
        expect(onForwarded).toHaveBeenCalledWith({ link: LINK, recipientEmail: null, mailFailed: false });
    });

    it('lets the guard close anyway — deliberately, as the second choice', async () => {
        const user = userEvent.setup();
        const { onClose, onForwarded } = renderDialog();
        await requestLink(user);

        await user.click(screen.getByRole('button', { name: 'cancel' }));
        await user.click(screen.getByRole('button', { name: 'dpaForward.closeGuard.closeAnyway' }));

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onForwarded).not.toHaveBeenCalled();
    });

    it('guards the close after a send, naming the mail that is pending completion', async () => {
        const user = userEvent.setup();
        const { onClose } = renderDialog();

        await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));
        await screen.findByTestId('dpa-forward-sent');

        await user.click(screen.getByRole('button', { name: 'cancel' }));

        expect(onClose).not.toHaveBeenCalled();
        // The sent variant of the guard: it reminds WHOM the mail went to.
        expect(screen.getByText('dpaForward.closeGuard.descriptionSent')).toBeInTheDocument();
    });

    it('relabels the send action once a mail went out, so a second send reads as the repeat it is', async () => {
        const user = userEvent.setup();
        renderDialog();

        expect(screen.getByRole('button', { name: 'dpaForward.dialog.send' })).toBeInTheDocument();

        await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));
        await screen.findByTestId('dpa-forward-sent');

        // The success notice names the recipient, and the action now says "again".
        expect(screen.getByTestId('dpa-forward-sent')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'dpaForward.dialog.send' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'dpaForward.dialog.resend' })).toBeInTheDocument();
    });

    /**
     * #1065: the per-invite forward budget is spent. Unlike the retryable
     * failures this one has no second chance on this invitation, so the
     * message must say that instead of "please try again".
     */
    it('phrases the exhausted forward budget specifically', async () => {
        const user = userEvent.setup();
        renderDialog({ forward: vi.fn().mockRejectedValue(new DpaForwardError('FORWARD_BUDGET_EXHAUSTED')) });

        await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));

        const alert = await screen.findByTestId('dpa-forward-send-failed');
        expect(alert).toHaveTextContent('dpaForward.dialog.errorBudgetExhausted');
    });

    it('closes without forwarding via cancel', async () => {
        const user = userEvent.setup();
        const { onClose, onForwarded, forward } = renderDialog();

        await user.click(screen.getByRole('button', { name: 'cancel' }));

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onForwarded).not.toHaveBeenCalled();
        expect(forward).not.toHaveBeenCalled();
    });
});

/**
 * #712, the blocker. The branded mail render comes from an admin-only endpoint.
 * On the public onboarding wizard that endpoint answers 401 unconditionally, and
 * fetchData turns a 401 on a non-`skipAuth` call into refresh → logout →
 * /admin/login. The dialog therefore threw the anonymous visitor off the page
 * about half a second after it opened, before a recipient could be typed.
 *
 * The invariant asserted here is stronger than "a 401 must not log anyone out":
 * a public surface must not issue the admin call in the first place.
 */
describe('DpaForwardDialog preview surface', () => {
    it('issues no admin-only preview request on the public surface', async () => {
        renderDialog();

        await screen.findByTestId('dpa-forward-plain-preview');
        await settle();
        expect(mocks.previewInviteEmailTemplateContent).not.toHaveBeenCalled();
    });

    it('defaults to the public surface, so a host that declares nothing cannot log anyone out', async () => {
        renderDialog({ surface: undefined });

        await screen.findByTestId('dpa-forward-plain-preview');
        await settle();
        expect(mocks.previewInviteEmailTemplateContent).not.toHaveBeenCalled();
    });

    /**
     * `t` is mocked to the bare key here, so the *resolved* wording (the sign
     * link in the body, the neutral salutation, the "no raw {{token}}" rule) is
     * asserted against the REAL shipped copy in `forwardMailPreview.test.ts`.
     * What this test owns is that the plain preview renders the composition the
     * dialog produced, and keeps tracking it as the admin types.
     */
    it('shows the composed mail as text on the public surface', async () => {
        const user = userEvent.setup();
        renderDialog();

        const preview = await screen.findByTestId('dpa-forward-plain-preview');
        expect(preview).toHaveTextContent('dpaForward.mail.subject');
        expect(preview).toHaveTextContent('dpaForward.mail.body');
        expect(preview).toHaveTextContent('dpaForward.mail.salutationNeutral');
        expect(preview.textContent).not.toMatch(/\{\{|\}\}/);

        // A typed name re-composes the salutation — the preview is live, not a
        // snapshot taken when the dialog opened.
        await user.type(screen.getByLabelText('dpaForward.dialog.recipientName'), 'Dr. Ruth Recht');
        await waitFor(() =>
            expect(screen.getByTestId('dpa-forward-plain-preview')).toHaveTextContent('dpaForward.mail.salutation'),
        );
        expect(screen.getByTestId('dpa-forward-plain-preview')).not.toHaveTextContent(
            'dpaForward.mail.salutationNeutral',
        );
    });

    it('keeps the backend-rendered branded preview on an authenticated admin surface', async () => {
        renderDialog({ surface: 'admin' });

        await waitFor(() => expect(mocks.previewInviteEmailTemplateContent).toHaveBeenCalled(), { timeout: 3000 });
        expect(screen.queryByTestId('dpa-forward-plain-preview')).not.toBeInTheDocument();
        await waitFor(() =>
            expect(document.querySelector('iframe[title="dpaForward.dialog.previewLabel"]')).toBeInTheDocument(),
        );
    });

    /**
     * JOB11. The mail frame — header, call-to-action and the house FOOTER (brand
     * name, Impressum · Datenschutz, "Diese E-Mail wurde automatisch versendet …")
     * — is applied by the backend renderer, the same one the send path runs; this
     * dialog only composes the salutation and the body that go inside it. What the
     * dialog owes the renderer is the identity of the mail, and it was not sending
     * it: with no `kind`, `InviteEmailPreviewService` falls back to TENANT_INVITE
     * and renders the sample call-to-action against the ADMIN console, while a DPA
     * signer belongs on the app host. Nothing else in the render branches on kind,
     * so this is the whole of the fix — and the reason the preview may not be
     * hand-framed in Admin instead.
     */
    it('tells the backend renderer which mail this is, so the forward mail is framed as itself', async () => {
        // Only the admin surface may talk to the backend renderer at all
        // (#712), so the kind contract is asserted there.
        renderDialog({ surface: 'admin' });

        await waitFor(() => expect(mocks.previewInviteEmailTemplateContent).toHaveBeenCalled(), { timeout: 3000 });
        expect(mocks.previewInviteEmailTemplateContent.mock.calls[0][0]).toMatchObject({ kind: 'DPA_FORWARD' });
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
        await screen.findByTestId('dpa-forward-link-section');

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
        await screen.findByTestId('dpa-forward-link-section');
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
        await screen.findByTestId('dpa-forward-link-section');

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
        await screen.findByTestId('dpa-forward-link-section');
        const send = screen.getByRole('button', { name: 'dpaForward.dialog.send' });

        expect(send.className).toContain('filled');
        expect(send.className).not.toContain('outlined');
        expect(send.parentElement?.className).toContain('sendActions');
        expect(ruleFor('.sendActions')).toMatch(/justify-content:\s*flex-end/);
    });
});
