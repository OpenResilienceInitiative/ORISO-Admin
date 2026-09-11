import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { http, HttpResponse } from 'msw';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { PHONE_390 } from '../DpaLegalForm/dpaStoryText';
import {
    INVITE_EMAIL_PREVIEW_ENDPOINT,
    renderBrandedEmailStoryPreview,
} from '../EmailPreview/brandedEmailStoryPreview';
import { DpaForwardDialog } from './DpaForwardDialog';
import { DpaForwardError, DpaForwardLink, DpaForwardOutcome } from '../../api/tenantOnboarding/dpaForward';

const LINK: DpaForwardLink = {
    signUrl: 'https://app.oriso-dev.site/dpa-sign/3f2c6d1e-8b1a-4b8e-9f47-demoforward',
    expiresAt: '2026-08-29T14:31:07',
};

const wait = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });

/**
 * The backend's mail renderer, offline: it echoes the subject and body the dialog
 * composed back inside the checked-in house frame. Without it the preview request
 * falls through MSW's `bypass` to the Storybook origin and every story here shows
 * the preview's error state instead of a mail.
 */
const mailPreview = http.post(INVITE_EMAIL_PREVIEW_ENDPOINT, async ({ request }) => {
    const { body = '', subject = '' } = (await request.json()) as { body?: string; subject?: string };
    return HttpResponse.json(renderBrandedEmailStoryPreview(subject, body));
});

/**
 * Shared forward-to-authorised-signer dialog (#723, epic #722): copyable
 * single-use sign link, optional e-mail send with the actual DPA_FORWARD mail
 * rendered through the e-mail kit preview, and the note that the link stays
 * valid until the contract is signed no matter where it is shared. Used by
 * the onboarding wizard, the Legal Settings card and the pending-signature
 * dialog (#724).
 */
const meta = {
    title: 'Organisms/DpaForwardDialog',
    component: DpaForwardDialog,
    parameters: {
        layout: 'fullscreen',
        msw: { handlers: [mailPreview] },
        // axe stops at the frame: it holds the backend's mail document (table
        // layout, inline styles), not app UI. Same rule and reason as
        // `Organisms/EmailPreview/BrandedEmailPreview`; the dialog's own
        // chrome around it is still audited.
        a11y: { options: { iframes: false } },
    },
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <Story />
            </ThemeProvider>
        ),
    ],
    args: {
        // The return type is annotated so `satisfies Meta<…>` infers
        // `mailFailed: boolean` instead of the literal `false` of this one
        // implementation — otherwise a story overriding it with a computed
        // flag (MailFailedLinkReady) is not assignable to the meta args.
        forward: async (request): Promise<DpaForwardOutcome> => {
            await wait(request.recipientEmail ? 600 : 400);
            return { link: LINK, mailFailed: false };
        },
        onClose: () => {},
        onForwarded: () => {},
    },
} satisfies Meta<typeof DpaForwardDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The explicit act that mints the link — nothing is minted by opening (#712). */
const createLink = async (body: ReturnType<typeof within>) =>
    userEvent.click(await body.findByRole('button', { name: /Signaturlink erzeugen|Create signing link/ }));

/**
 * The public onboarding surface as it opens: no link minted yet, the mail
 * previewed as text. With the name field empty the preview greets neutrally —
 * a raw `{{recipientName}}` is never shown to a person.
 */
export const Default: Story = {};

/**
 * **The forwarded mail as it is framed and sent** (JOB11, owner note 2026-08-19:
 * „Add Footer to the forwarded email as well").
 *
 * The variant this modal is linked to: the same dialog, with the mail preview
 * showing the finished document rather than the two paragraphs the dialog
 * composes. The frame around them — brand header, call-to-action, and the
 * FOOTER with the brand name, `Impressum · Datenschutz` and the automated-send
 * note — is the house layout every transactional mail carries
 * (ORISO-UserService `email/layout/branded-email.html`), applied by the backend
 * renderer that the send path itself runs. The forward mail was not opting out
 * of it; it simply never told the renderer which mail it was, so the sample
 * call-to-action pointed at the admin console instead of the app host.
 *
 * The document here is a checked-in verbatim backend response with this mail's
 * subject and body substituted into it, so the footer on screen is the real one
 * and not a drawing of it.
 */
export const ForwardedMailWithFooter: Story = {
    // The branded render comes from the ADMIN-ONLY backend endpoint; on the
    // public surface it is never requested (#712/#836), so the framed mail is
    // an admin-surface sight by definition.
    args: { surface: 'admin' },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.type(await body.findByLabelText(/Name der Person|Name of the person/), 'Dr. Ruth Recht');

        const frame = (await body.findByTitle(/Vorschau der E-Mail|Preview of the e-mail/)) as HTMLIFrameElement;
        await waitFor(() => {
            const mail = frame.contentDocument?.body?.innerText ?? '';
            // The composed content …
            expect(mail).toContain('Dr. Ruth Recht');
            // … inside the house frame, footer and all.
            expect(mail).toContain('Impressum');
            expect(mail).toContain('Datenschutz');
            expect(mail).toContain('Diese E-Mail wurde automatisch versendet');
        });
    },
};

/** The whole dialog at 390×844 — link, fields and preview stay usable. */
export const Mobile: Story = {
    ...PHONE_390,
};

/** The link after it was explicitly requested: copyable, with the validity note. */
export const LinkRequested: Story = {
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await createLink(body);
        // By role, not by label text: the dialog's own title mentions the
        // Signaturlink too, and the modal carries it via aria-labelledby.
        await waitFor(async () =>
            expect(await body.findByRole('textbox', { name: /Signaturlink|Signing link/ })).toHaveValue(LINK.signUrl),
        );
    },
};

/** Typing a name resolves the salutation in the preview. */
export const NamedRecipient: Story = {
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const name = await body.findByLabelText(/Name der Person|Name of the person/);
        await userEvent.type(name, 'Dr. Ruth Recht');
        // The public preview composes client-side, so this needs no backend.
        await waitFor(async () =>
            expect(await body.findByTestId('dpa-forward-plain-preview')).toHaveTextContent('Dr. Ruth Recht'),
        );
    },
};

/**
 * The admin surface (Legal Settings, pending-signature dialog): the mail is
 * rendered by the backend's own renderer, so the preview cannot drift from the
 * sent mail. That endpoint is admin-only — hence the `surface` prop.
 */
export const AdminSurface: Story = {
    args: { surface: 'admin' },
};

/** Link creation failed: inline retryable error, confirm stays disabled. */
export const LinkError: Story = {
    args: {
        forward: async () => {
            await wait(400);
            throw new DpaForwardError('TECHNICAL');
        },
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await createLink(body);
        await waitFor(async () => expect(await body.findByTestId('dpa-forward-link-error')).toBeVisible());
    },
};

/** 409 — the operator published no agreement, so there is nothing to forward. */
export const NoDpaPublished: Story = {
    args: {
        forward: async () => {
            await wait(300);
            throw new DpaForwardError('NO_DPA_PUBLISHED');
        },
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await createLink(body);
        await waitFor(async () => expect(await body.findByTestId('dpa-forward-link-error')).toBeVisible());
    },
};

/**
 * The 502 case: the backend created the link but could not hand the mail to
 * the SMTP server. Deliberately a warning with the link still on offer — not
 * a total failure.
 */
export const MailFailedLinkReady: Story = {
    args: {
        forward: async (request): Promise<DpaForwardOutcome> => {
            await wait(400);
            return { link: LINK, mailFailed: !!request.recipientEmail };
        },
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const email = await body.findByLabelText(/E-Mail-Adresse|E-mail address/);
        await userEvent.type(email, 'legal@traeger-nord.example');
        await userEvent.click(body.getByRole('button', { name: /E-Mail senden|Send e-mail/ }));
        await waitFor(async () => expect(await body.findByTestId('dpa-forward-mail-failed')).toBeVisible());
    },
};

/** Sending without a valid address is refused with an inline message. */
export const InvalidRecipient: Story = {
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await waitFor(async () => expect(await body.findByTestId('dpa-forward-dialog')).toBeVisible());
        // Language-agnostic: the browser locale decides de/en in Storybook.
        const email = await body.findByLabelText(/E-Mail-Adresse|E-mail address/);
        await userEvent.type(email, 'keine-adresse');
        await userEvent.click(body.getByRole('button', { name: /E-Mail senden|Send e-mail/ }));
        await waitFor(async () => expect(await body.findByText(/gültige E-Mail-Adresse|valid e-mail/i)).toBeVisible());
    },
};
