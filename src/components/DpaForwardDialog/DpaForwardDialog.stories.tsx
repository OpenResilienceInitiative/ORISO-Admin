import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { PHONE_390 } from '../DpaLegalForm/dpaStoryText';
import { DpaForwardDialog } from './DpaForwardDialog';
import { DpaForwardError, DpaForwardLink } from '../../api/tenantOnboarding/dpaForward';

const LINK: DpaForwardLink = {
    signUrl: 'https://app.oriso-dev.site/dpa-sign/3f2c6d1e-8b1a-4b8e-9f47-demoforward',
    expiresAt: '2026-08-29T14:31:07',
};

const wait = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
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
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <Story />
            </ThemeProvider>
        ),
    ],
    args: {
        forward: async (request) => {
            await wait(request.recipientEmail ? 600 : 400);
            return { link: LINK, mailFailed: false };
        },
        onClose: () => {},
        onForwarded: () => {},
    },
} satisfies Meta<typeof DpaForwardDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Link ready, mail preview visible, copy + optional e-mail send. */
export const Default: Story = {};

/** The whole dialog at 390×844 — link, fields and preview stay usable. */
export const Mobile: Story = {
    ...PHONE_390,
};

/** Link creation failed: inline retryable error, confirm stays disabled. */
export const LinkError: Story = {
    args: {
        forward: async () => {
            await wait(400);
            throw new DpaForwardError('TECHNICAL');
        },
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
};

/**
 * The 502 case: the backend created the link but could not hand the mail to
 * the SMTP server. Deliberately a warning with the link still on offer — not
 * a total failure.
 */
export const MailFailedLinkReady: Story = {
    args: {
        forward: async (request) => {
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
