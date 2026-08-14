import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { PHONE_390 } from '../DpaLegalForm/dpaStoryText';
import { DpaForwardDialog, DpaForwardLink } from './DpaForwardDialog';

const LINK: DpaForwardLink = {
    signLink: 'https://app.oriso-dev.site/dpa-sign/3f2c6d1e-8b1a-4b8e-9f47-demoforward',
    expiresAt: '2026-08-28T12:00:00Z',
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
        ensureSignLink: async () => {
            await wait(400);
            return LINK;
        },
        sendEmail: async () => {
            await wait(600);
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
        ensureSignLink: async () => {
            await wait(400);
            throw new Error('DPA_FORWARD_HTTP_500');
        },
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
